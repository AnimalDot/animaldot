/**
 * AnimalDot Smart Bed - BLE Manager Implementation
 * 
 * Implements Bluetooth Low Energy communication using NimBLE.
 */

#include "ble_manager.h"

BLEManager::BLEManager() 
    : pServer(nullptr),
      pAnimalDotService(nullptr),
      pHeartRateService(nullptr),
      connectedClients(0),
      connectionCallback(nullptr),
      hasPendingCommand(false) {
    memset(&pendingCommand, 0, sizeof(pendingCommand));
}

bool BLEManager::begin() {
    Serial.println("[BLEManager] Initializing BLE...");
    
    // Initialize NimBLE
    NimBLEDevice::init(DEVICE_NAME);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);  // Max power for range
    NimBLEDevice::setSecurityAuth(false, false, false);  // No security for simplicity
    
    // Create server
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(this);
    
    // Create services and characteristics
    createServices();
    
    // Start advertising
    startAdvertising();
    
    Serial.println("[BLEManager] BLE initialized and advertising");
    return true;
}

void BLEManager::createServices() {
    // Create AnimalDot custom service
    pAnimalDotService = pServer->createService(ANIMALDOT_SERVICE_UUID);
    
    // Heart Rate characteristic
    pHeartRateChar = pAnimalDotService->createCharacteristic(
        HEART_RATE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pHeartRateChar->setValue((uint8_t)0);
    
    // Respiratory Rate characteristic
    pRespRateChar = pAnimalDotService->createCharacteristic(
        RESP_RATE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pRespRateChar->setValue((uint8_t)0);
    
    // Temperature characteristic (as float, 4 bytes)
    pTemperatureChar = pAnimalDotService->createCharacteristic(
        TEMPERATURE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    float initTemp = 0.0f;
    pTemperatureChar->setValue((uint8_t*)&initTemp, 4);
    
    // Humidity characteristic (as float, 4 bytes)
    pHumidityChar = pAnimalDotService->createCharacteristic(
        HUMIDITY_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    float initHum = 0.0f;
    pHumidityChar->setValue((uint8_t*)&initHum, 4);
    
    // Weight characteristic (as float, 4 bytes)
    pWeightChar = pAnimalDotService->createCharacteristic(
        WEIGHT_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    float initWeight = 0.0f;
    pWeightChar->setValue((uint8_t*)&initWeight, 4);
    
    // Device Status characteristic (8 bytes)
    // Byte 0: errorCode
    // Byte 1: bit flags (dht, loadcell, geophone connected)
    // Byte 2-3: reserved
    // Byte 4-7: timestamp (uint32_t)
    pStatusChar = pAnimalDotService->createCharacteristic(
        DEVICE_STATUS_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    uint8_t initStatus[8] = {0};
    pStatusChar->setValue(initStatus, 8);
    
    // Calibration characteristic (writable)
    pCalibrationChar = pAnimalDotService->createCharacteristic(
        CALIBRATION_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE
    );
    pCalibrationChar->setCallbacks(this);
    
    // Raw geophone characteristic (for debugging/streaming)
    pRawGeophoneChar = pAnimalDotService->createCharacteristic(
        RAW_GEOPHONE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    int16_t initRaw = 0;
    pRawGeophoneChar->setValue((uint8_t*)&initRaw, 2);
    
    // Start AnimalDot service
    pAnimalDotService->start();
    
    // Create standard Heart Rate Service for compatibility
    pHeartRateService = pServer->createService(HEART_RATE_SERVICE_UUID);
    
    pStandardHRChar = pHeartRateService->createCharacteristic(
        HEART_RATE_MEASUREMENT_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    uint8_t initHR[2] = {0x00, 0};  // Flags + HR value
    pStandardHRChar->setValue(initHR, 2);
    
    pHeartRateService->start();
}

void BLEManager::startAdvertising() {
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    
    // Add service UUIDs to advertising
    pAdvertising->addServiceUUID(ANIMALDOT_SERVICE_UUID);
    pAdvertising->addServiceUUID(HEART_RATE_SERVICE_UUID);
    
    // Set advertising parameters
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // 7.5ms connection interval
    pAdvertising->setMaxPreferred(0x12);  // 22.5ms connection interval
    
    // Start advertising
    NimBLEDevice::startAdvertising();
    
    Serial.println("[BLEManager] Advertising started");
}

void BLEManager::updateVitals(const VitalSigns& vitals) {
    if (connectedClients == 0) return;
    
    // Update heart rate
    uint8_t hr = (uint8_t)constrain(vitals.heartRate, 0, 255);
    pHeartRateChar->setValue(&hr, 1);
    pHeartRateChar->notify();
    
    // Update standard HR service
    uint8_t hrPayload[2] = {0x00, hr};  // Flags: 8-bit HR, no other fields
    pStandardHRChar->setValue(hrPayload, 2);
    pStandardHRChar->notify();
    
    // Update respiratory rate
    uint8_t rr = (uint8_t)constrain(vitals.respiratoryRate, 0, 255);
    pRespRateChar->setValue(&rr, 1);
    pRespRateChar->notify();
}

void BLEManager::updateEnvironment(const EnvironmentData& env) {
    if (connectedClients == 0) return;
    
    // Update temperature (Fahrenheit)
    pTemperatureChar->setValue((uint8_t*)&env.temperatureF, 4);
    pTemperatureChar->notify();
    
    // Update humidity
    pHumidityChar->setValue((uint8_t*)&env.humidity, 4);
    pHumidityChar->notify();
}

void BLEManager::updateWeight(const WeightData& weight) {
    if (connectedClients == 0) return;
    
    // Send weight in pounds
    pWeightChar->setValue((uint8_t*)&weight.totalWeight, 4);
    pWeightChar->notify();
}

void BLEManager::updateStatus(const SensorStatus& status) {
    if (connectedClients == 0) return;
    
    uint8_t statusData[8];
    statusData[0] = status.errorCode;
    statusData[1] = (status.dhtConnected ? 0x01 : 0) |
                    (status.loadCellsConnected ? 0x02 : 0) |
                    (status.geophoneConnected ? 0x04 : 0);
    statusData[2] = 0;  // Reserved
    statusData[3] = 0;  // Reserved
    
    // Timestamp as uint32_t
    uint32_t ts = status.lastUpdate;
    memcpy(&statusData[4], &ts, 4);
    
    pStatusChar->setValue(statusData, 8);
    pStatusChar->notify();
}

void BLEManager::streamRawGeophone(int16_t sample) {
    if (connectedClients == 0) return;
    
    pRawGeophoneChar->setValue((uint8_t*)&sample, 2);
    pRawGeophoneChar->notify();
}

bool BLEManager::isConnected() {
    return connectedClients > 0;
}

uint32_t BLEManager::getConnectionCount() {
    return connectedClients;
}

void BLEManager::setConnectionCallback(BLEConnectionCallbacks* callback) {
    connectionCallback = callback;
}

bool BLEManager::hasCalibrationCommand() {
    return hasPendingCommand;
}

CalibrationCommand BLEManager::getCalibrationCommand() {
    hasPendingCommand = false;
    return pendingCommand;
}

// NimBLE Server Callbacks
void BLEManager::onConnect(NimBLEServer* pServer) {
    connectedClients++;
    Serial.printf("[BLEManager] Client connected. Total: %d\n", connectedClients);
    
    // Continue advertising to allow multiple connections
    NimBLEDevice::startAdvertising();
    
    if (connectionCallback) {
        connectionCallback->onConnect();
    }
}

void BLEManager::onDisconnect(NimBLEServer* pServer) {
    if (connectedClients > 0) connectedClients--;
    Serial.printf("[BLEManager] Client disconnected. Total: %d\n", connectedClients);
    
    if (connectionCallback) {
        connectionCallback->onDisconnect();
    }
}

// Characteristic write callback (for calibration commands)
void BLEManager::onWrite(NimBLECharacteristic* pCharacteristic) {
    if (pCharacteristic == pCalibrationChar) {
        std::string value = pCharacteristic->getValue();
        
        if (value.length() >= 5) {  // 1 byte command + 4 bytes float
            pendingCommand.commandType = value[0];
            memcpy(&pendingCommand.value, &value[1], 4);
            hasPendingCommand = true;
            
            Serial.printf("[BLEManager] Calibration command received: type=%d, value=%.2f\n",
                         pendingCommand.commandType, pendingCommand.value);
        }
    }
}
