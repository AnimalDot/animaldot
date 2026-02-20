/**
 * AnimalDot Smart Bed - Sensor Manager Implementation
 * 
 * Handles all sensor interfaces and data collection.
 */

#include "sensor_manager.h"

// FX29 I2C commands
#define FX29_CMD_READ_FORCE 0x00

SensorManager::SensorManager() 
    : dht(DHT_PIN, DHT_TYPE),
      weightCalibrationFactor(WEIGHT_CALIBRATION_FACTOR),
      temperatureOffset(0),
      weightTare(0),
      lastDhtUpdate(0),
      lastWeightUpdate(0),
      lastGeophoneUpdate(0),
      weightHistoryIndex(0) {
    
    memset(&latestEnvironment, 0, sizeof(latestEnvironment));
    memset(&latestWeight, 0, sizeof(latestWeight));
    memset(&sensorStatus, 0, sizeof(sensorStatus));
    memset(weightHistory, 0, sizeof(weightHistory));
}

bool SensorManager::begin() {
    Serial.println("[SensorManager] Initializing sensors...");
    
    sensorStatus.errorCode = ERR_NONE;
    
    // Initialize I2C
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000);  // 400 kHz for faster communication
    
    // Initialize DHT22
    dht.begin();
    delay(2000);  // DHT22 needs time to stabilize
    
    float testTemp = dht.readTemperature();
    if (isnan(testTemp)) {
        Serial.println("[SensorManager] Warning: DHT22 not responding");
        sensorStatus.dhtConnected = false;
        sensorStatus.errorCode |= ERR_DHT_FAIL;
    } else {
        Serial.printf("[SensorManager] DHT22 OK - Temp: %.1f°C\n", testTemp);
        sensorStatus.dhtConnected = true;
    }
    
    // Initialize Load Cells
    int loadCellsFound = 0;
    uint8_t loadCellAddrs[] = {LOADCELL_1_ADDR, LOADCELL_2_ADDR, 
                               LOADCELL_3_ADDR, LOADCELL_4_ADDR, LOADCELL_5_ADDR};
    
    for (int i = 0; i < 5; i++) {
        if (initFX29(loadCellAddrs[i])) {
            loadCellsFound++;
            Serial.printf("[SensorManager] Load cell %d (0x%02X) OK\n", 
                         i + 1, loadCellAddrs[i]);
        }
    }
    
    if (loadCellsFound == 0) {
        Serial.println("[SensorManager] Warning: No load cells found");
        sensorStatus.loadCellsConnected = false;
        sensorStatus.errorCode |= ERR_LOADCELL_FAIL;
    } else {
        Serial.printf("[SensorManager] Found %d load cell(s)\n", loadCellsFound);
        sensorStatus.loadCellsConnected = true;
    }
    
    // Initialize Geophone (ADC)
    pinMode(GEOPHONE_PIN, INPUT);
    analogReadResolution(12);  // 12-bit ADC
    analogSetAttenuation(ADC_11db);  // Full range 0-3.3V
    
    // Test geophone reading
    int testRead = analogRead(GEOPHONE_PIN);
    if (testRead >= 0 && testRead <= 4095) {
        Serial.printf("[SensorManager] Geophone ADC OK - Value: %d\n", testRead);
        sensorStatus.geophoneConnected = true;
    } else {
        Serial.println("[SensorManager] Warning: Geophone ADC issue");
        sensorStatus.geophoneConnected = false;
        sensorStatus.errorCode |= ERR_GEOPHONE_FAIL;
    }
    
    // Initialize LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    sensorStatus.lastUpdate = millis();
    
    bool success = (sensorStatus.errorCode == ERR_NONE);
    Serial.printf("[SensorManager] Initialization %s\n", 
                 success ? "complete" : "completed with warnings");
    
    return success;
}

void SensorManager::updateGeophone() {
    unsigned long currentTime = micros();
    
    if (currentTime - lastGeophoneUpdate >= GEOPHONE_SAMPLE_INTERVAL_US) {
        lastGeophoneUpdate = currentTime;
        
        // Read geophone value
        int16_t sample = analogRead(GEOPHONE_PIN) - 2048;  // Center around 0
        
        // Add to signal processor
        signalProcessor.addSample(sample);
    }
}

void SensorManager::updateEnvironment() {
    unsigned long currentTime = millis();
    
    if (currentTime - lastDhtUpdate >= DHT_UPDATE_INTERVAL_MS) {
        lastDhtUpdate = currentTime;
        
        float temp = dht.readTemperature();
        float hum = dht.readHumidity();
        
        if (!isnan(temp) && !isnan(hum)) {
            latestEnvironment.temperature = temp + temperatureOffset;
            latestEnvironment.temperatureF = (latestEnvironment.temperature * 9.0f / 5.0f) + 32.0f;
            latestEnvironment.humidity = hum;
            latestEnvironment.isValid = true;
            latestEnvironment.timestamp = currentTime;
            sensorStatus.dhtConnected = true;
        } else {
            latestEnvironment.isValid = false;
            sensorStatus.dhtConnected = false;
        }
    }
}

void SensorManager::updateWeight() {
    unsigned long currentTime = millis();
    
    if (currentTime - lastWeightUpdate >= WEIGHT_UPDATE_INTERVAL_MS) {
        lastWeightUpdate = currentTime;
        
        float cell1, cell2, cell3, cell4, cell5;
        bool success = true;
        
        // Read all load cells
        if (!readFX29(LOADCELL_1_ADDR, cell1)) cell1 = 0;
        if (!readFX29(LOADCELL_2_ADDR, cell2)) cell2 = 0;
        if (!readFX29(LOADCELL_3_ADDR, cell3)) cell3 = 0;
        if (!readFX29(LOADCELL_4_ADDR, cell4)) cell4 = 0;
        if (!readFX29(LOADCELL_5_ADDR, cell5)) cell5 = 0;
        
        latestWeight.loadCell1 = cell1;
        latestWeight.loadCell2 = cell2;
        latestWeight.loadCell3 = cell3;
        latestWeight.loadCell4 = cell4;
        latestWeight.loadCell5 = cell5;
        
        // Calculate total weight
        float totalForce = cell1 + cell2 + cell3 + cell4 + cell5;
        latestWeight.totalWeight = (totalForce * weightCalibrationFactor) - weightTare;
        
        // Constrain to valid range
        latestWeight.totalWeight = constrain(latestWeight.totalWeight, 0, WEIGHT_MAX_LBS);
        
        // Update weight history for stability check
        weightHistory[weightHistoryIndex] = latestWeight.totalWeight;
        weightHistoryIndex = (weightHistoryIndex + 1) % 10;
        
        latestWeight.isStable = checkWeightStability();
        latestWeight.isValid = true;
        latestWeight.timestamp = currentTime;
    }
}

bool SensorManager::checkWeightStability() {
    // Calculate variance of last 10 readings
    float sum = 0, sumSq = 0;
    for (int i = 0; i < 10; i++) {
        sum += weightHistory[i];
        sumSq += weightHistory[i] * weightHistory[i];
    }
    float mean = sum / 10.0f;
    float variance = (sumSq / 10.0f) - (mean * mean);
    
    // Stable if variance is less than 0.5 lbs
    return (variance < 0.5f);
}

SensorData SensorManager::getData() {
    SensorData data;
    data.vitals = signalProcessor.processSignals();
    data.environment = latestEnvironment;
    data.weight = latestWeight;
    data.status = sensorStatus;
    return data;
}

VitalSigns SensorManager::getVitalSigns() {
    return signalProcessor.processSignals();
}

EnvironmentData SensorManager::getEnvironment() {
    return latestEnvironment;
}

WeightData SensorManager::getWeight() {
    return latestWeight;
}

SensorStatus SensorManager::getStatus() {
    return sensorStatus;
}

void SensorManager::tareWeight() {
    // Take average of next 10 readings for tare
    float sum = 0;
    for (int i = 0; i < 10; i++) {
        float cell1, cell2, cell3, cell4, cell5;
        readFX29(LOADCELL_1_ADDR, cell1);
        readFX29(LOADCELL_2_ADDR, cell2);
        readFX29(LOADCELL_3_ADDR, cell3);
        readFX29(LOADCELL_4_ADDR, cell4);
        readFX29(LOADCELL_5_ADDR, cell5);
        sum += (cell1 + cell2 + cell3 + cell4 + cell5) * weightCalibrationFactor;
        delay(100);
    }
    weightTare = sum / 10.0f;
    Serial.printf("[SensorManager] Weight tared to %.2f lbs\n", weightTare);
}

void SensorManager::setWeightCalibrationFactor(float factor) {
    weightCalibrationFactor = factor;
    Serial.printf("[SensorManager] Weight calibration factor set to %.2f\n", factor);
}

void SensorManager::setTemperatureOffset(float offset) {
    temperatureOffset = offset;
    Serial.printf("[SensorManager] Temperature offset set to %.2f°C\n", offset);
}

int16_t SensorManager::getRawGeophoneSample() {
    return analogRead(GEOPHONE_PIN) - 2048;
}

bool SensorManager::initFX29(uint8_t address) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();
    return (error == 0);
}

bool SensorManager::readFX29(uint8_t address, float& force) {
    // FX29 returns 14-bit force data
    Wire.beginTransmission(address);
    Wire.write(FX29_CMD_READ_FORCE);
    uint8_t error = Wire.endTransmission(false);
    
    if (error != 0) {
        force = 0;
        return false;
    }
    
    Wire.requestFrom(address, (uint8_t)2);
    if (Wire.available() < 2) {
        force = 0;
        return false;
    }
    
    uint8_t msb = Wire.read();
    uint8_t lsb = Wire.read();
    
    // Combine bytes (14-bit value, left-justified in 16 bits)
    uint16_t rawValue = ((uint16_t)msb << 8) | lsb;
    rawValue >>= 2;  // Right-shift to get 14-bit value
    
    // Convert to force (0-100 lbs for FX29K0-100A)
    // Output: 10% to 90% of 16384 counts = 1638 to 14746 counts
    // Map to 0-100 lbs
    force = ((float)(rawValue - 1638) / (14746 - 1638)) * 100.0f;
    force = constrain(force, 0, 100.0f);
    
    return true;
}
