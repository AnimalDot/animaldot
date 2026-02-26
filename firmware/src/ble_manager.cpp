/**
 * @file ble_manager.cpp
 * @brief AnimalDot Smart Bed — BLE Manager Implementation
 *
 * Creates two GATT services:
 *   1. Custom AnimalDot service — HR, RR, temp, humidity, weight,
 *      device status, calibration write, raw geophone stream.
 *   2. Standard Heart Rate Service 0x180D — for third-party HR apps.
 *
 * Uses NimBLE to support multiple concurrent connections.
 */

#include "ble_manager.h"

/* ===================================================================== */
/* Constructor                                                           */
/* ===================================================================== */

BLEManager::BLEManager()
    : _pServer(nullptr),
      _pAnimalDotSvc(nullptr),
      _pHeartRateSvc(nullptr),
      _connectedClients(0),
      _connectionCb(nullptr),
      _hasPendingCmd(false) {
    memset(&_pendingCmd, 0, sizeof(_pendingCmd));
}

/* ===================================================================== */
/* Initialisation                                                        */
/* ===================================================================== */

bool BLEManager::begin() {
    Serial.println("[BLE] Initialising NimBLE…");

    NimBLEDevice::init(DEVICE_NAME);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);               /* Max range   */
    NimBLEDevice::setSecurityAuth(false, false, false);    /* Open pairing*/

    _pServer = NimBLEDevice::createServer();
    if (!_pServer) {
        Serial.println("[BLE] ERROR — server creation failed");
        return false;
    }
    _pServer->setCallbacks(this);

    _createServices();
    _startAdvertising();

    Serial.println("[BLE] Ready and advertising");
    return true;
}

/* ===================================================================== */
/* Service & Characteristic creation                                     */
/* ===================================================================== */

void BLEManager::_createServices() {
    /* ---- Custom AnimalDot Service ---- */
    _pAnimalDotSvc = _pServer->createService(ANIMALDOT_SERVICE_UUID);

    _pHRChar = _pAnimalDotSvc->createCharacteristic(
        HEART_RATE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pHRChar->setValue(static_cast<uint8_t>(0));

    _pRRChar = _pAnimalDotSvc->createCharacteristic(
        RESP_RATE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pRRChar->setValue(static_cast<uint8_t>(0));

    float zero = 0.0f;
    _pTempChar = _pAnimalDotSvc->createCharacteristic(
        TEMPERATURE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pTempChar->setValue(reinterpret_cast<uint8_t*>(&zero), 4);

    _pHumChar = _pAnimalDotSvc->createCharacteristic(
        HUMIDITY_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pHumChar->setValue(reinterpret_cast<uint8_t*>(&zero), 4);

    _pWeightChar = _pAnimalDotSvc->createCharacteristic(
        WEIGHT_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pWeightChar->setValue(reinterpret_cast<uint8_t*>(&zero), 4);

    uint8_t statusInit[8] = {0};
    _pStatusChar = _pAnimalDotSvc->createCharacteristic(
        DEVICE_STATUS_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pStatusChar->setValue(statusInit, 8);

    _pCalChar = _pAnimalDotSvc->createCharacteristic(
        CALIBRATION_CHAR_UUID, NIMBLE_PROPERTY::WRITE);
    _pCalChar->setCallbacks(this);

    int16_t rawZero = 0;
    _pRawGeoChar = _pAnimalDotSvc->createCharacteristic(
        RAW_GEOPHONE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    _pRawGeoChar->setValue(reinterpret_cast<uint8_t*>(&rawZero), 2);

    _pAnimalDotSvc->start();

    /* ---- Standard Heart Rate Service (BLE SIG 0x180D) ---- */
    _pHeartRateSvc = _pServer->createService(HEART_RATE_SERVICE_UUID);
    _pStdHRChar = _pHeartRateSvc->createCharacteristic(
        HEART_RATE_MEASUREMENT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    uint8_t hrInit[2] = {0x00, 0};
    _pStdHRChar->setValue(hrInit, 2);
    _pHeartRateSvc->start();
}

void BLEManager::_startAdvertising() {
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(ANIMALDOT_SERVICE_UUID);
    adv->addServiceUUID(HEART_RATE_SERVICE_UUID);
    adv->setScanResponse(true);
    adv->setMinPreferred(0x06);   /* 7.5 ms */
    adv->setMaxPreferred(0x12);   /* 22.5 ms */
    NimBLEDevice::startAdvertising();
    Serial.println("[BLE] Advertising started");
}

/* ===================================================================== */
/* Data notification helpers                                             */
/* ===================================================================== */

void BLEManager::updateVitals(const VitalSigns& v) {
    if (_connectedClients == 0) return;

    uint8_t hr = static_cast<uint8_t>(constrain(v.heartRate, 0, 255));
    _pHRChar->setValue(&hr, 1);
    _pHRChar->notify();

    uint8_t hrPayload[2] = {0x00, hr};
    _pStdHRChar->setValue(hrPayload, 2);
    _pStdHRChar->notify();

    uint8_t rr = static_cast<uint8_t>(constrain(v.respiratoryRate, 0, 255));
    _pRRChar->setValue(&rr, 1);
    _pRRChar->notify();
}

void BLEManager::updateEnvironment(const EnvironmentData& env) {
    if (_connectedClients == 0) return;
    _pTempChar->setValue(reinterpret_cast<const uint8_t*>(&env.temperatureF), 4);
    _pTempChar->notify();
    _pHumChar->setValue(reinterpret_cast<const uint8_t*>(&env.humidity), 4);
    _pHumChar->notify();
}

void BLEManager::updateWeight(const WeightData& w) {
    if (_connectedClients == 0) return;
    _pWeightChar->setValue(reinterpret_cast<const uint8_t*>(&w.totalWeight), 4);
    _pWeightChar->notify();
}

void BLEManager::updateStatus(const SensorStatus& s) {
    if (_connectedClients == 0) return;

    uint8_t buf[8];
    buf[0] = s.errorCode;
    buf[1] = (s.dhtConnected       ? 0x01 : 0)
           | (s.loadCellsConnected ? 0x02 : 0)
           | (s.geophoneConnected  ? 0x04 : 0)
           | (s.adxl355Connected   ? 0x08 : 0);
    buf[2] = 0;
    buf[3] = 0;
    uint32_t ts = static_cast<uint32_t>(s.lastUpdate);
    memcpy(buf + 4, &ts, 4);

    _pStatusChar->setValue(buf, 8);
    _pStatusChar->notify();
}

void BLEManager::streamRawGeophone(int16_t sample) {
    if (_connectedClients == 0) return;
    _pRawGeoChar->setValue(reinterpret_cast<uint8_t*>(&sample), 2);
    _pRawGeoChar->notify();
}

/* ===================================================================== */
/* Connection state                                                      */
/* ===================================================================== */

bool     BLEManager::isConnected()      { return _connectedClients > 0; }
uint32_t BLEManager::getConnectionCount() { return _connectedClients; }
void     BLEManager::setConnectionCallback(BLEConnectionCallbacks* cb) { _connectionCb = cb; }

bool BLEManager::hasCalibrationCommand() { return _hasPendingCmd; }

CalibrationCommand BLEManager::getCalibrationCommand() {
    _hasPendingCmd = false;
    return _pendingCmd;
}

/* ===================================================================== */
/* NimBLE Callbacks                                                      */
/* ===================================================================== */

void BLEManager::onConnect(NimBLEServer* /*s*/) {
    _connectedClients++;
    Serial.printf("[BLE] Client connected (total %u)\n", _connectedClients);
    NimBLEDevice::startAdvertising();   /* Allow more connections */
    if (_connectionCb) _connectionCb->onConnect();
}

void BLEManager::onDisconnect(NimBLEServer* /*s*/) {
    if (_connectedClients > 0) _connectedClients--;
    Serial.printf("[BLE] Client disconnected (total %u)\n", _connectedClients);
    if (_connectionCb) _connectionCb->onDisconnect();
}

void BLEManager::onWrite(NimBLECharacteristic* c) {
    if (c != _pCalChar) return;

    std::string val = c->getValue();
    if (val.length() < 5) {
        Serial.println("[BLE] Calibration write too short — ignored");
        return;
    }

    _pendingCmd.commandType = val[0];
    memcpy(&_pendingCmd.value, &val[1], 4);
    _hasPendingCmd = true;

    Serial.printf("[BLE] Cal command type=0x%02X value=%.2f\n",
                  _pendingCmd.commandType, _pendingCmd.value);
}
