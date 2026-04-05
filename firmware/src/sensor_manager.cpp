/**
 * @file sensor_manager.cpp
 * @brief AnimalDot Smart Bed — Sensor Manager Implementation
 *
 * Orchestrates DHT22, FX29 load cells, and geophone.
 * Each sensor is independently timed so that expensive I2C/ADC
 * operations never block the high-priority geophone sampling.
 */

#include "sensor_manager.h"
#include <cstring>

/** FX29 force-data read command byte. */
static constexpr uint8_t FX29_CMD_READ_FORCE = 0x00;

/* ===================================================================== */
/* Constructor                                                           */
/* ===================================================================== */

SensorManager::SensorManager()
    : _dht(DHT_PIN, DHT_TYPE),
      _weightCalFactor(WEIGHT_CALIBRATION_FACTOR),
      _tempOffset(0.0f),
      _weightTare(0.0f),
      _fx29LibReady(false),
      _lastDhtUpdate(0),
      _lastWeightUpdate(0),
      _lastGeophoneUpdate(0),
      _weightHistIdx(0),
      _geoMqttFill(0),
      _geoMqttPending(false) {
    memset(&_latestEnv,    0, sizeof(_latestEnv));
    memset(&_latestWeight, 0, sizeof(_latestWeight));
    memset(&_sensorStatus, 0, sizeof(_sensorStatus));
    memset(_weightHistory,  0, sizeof(_weightHistory));
    memset(_geoMqttBuf,     0, sizeof(_geoMqttBuf));
    memset(_geoMqttPendingBuf, 0, sizeof(_geoMqttPendingBuf));
}

/* ===================================================================== */
/* Initialisation                                                        */
/* ===================================================================== */

bool SensorManager::begin() {
    Serial.println("[Sensors] Initialising…");
    _sensorStatus.errorCode = ERR_NONE;

    /* ---- I2C bus (shared by FX29 load cells) ---- */
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000);  /* Fast-mode 400 kHz */
    if (_initFX29(LOADCELL_1_ADDR)) {
        _fx29Primary.initFX29K(FX29K0, 100, &Wire);
        _fx29Primary.tare(1000);
        _fx29LibReady = true;
        Serial.println("[Sensors] FX29K library initialised on 0x28");
    }

    /* ---- DHT22 ---- */
    _dht.begin();
    delay(2000);  /* DHT22 datasheet: 1–2 s power-on stabilisation */

    float testT = _dht.readTemperature();
    if (isnan(testT)) {
        Serial.println("[Sensors] WARNING — DHT22 not responding");
        _sensorStatus.dhtConnected = false;
        _sensorStatus.errorCode |= ERR_DHT_FAIL;
    } else {
        Serial.printf("[Sensors] DHT22 OK — %.1f °C\n", testT);
        _sensorStatus.dhtConnected = true;
    }

    /* ---- FX29 load cells (scan all five addresses) ---- */
    const uint8_t addrs[] = {
        LOADCELL_1_ADDR, LOADCELL_2_ADDR,
        LOADCELL_3_ADDR, LOADCELL_4_ADDR, LOADCELL_5_ADDR
    };
    int found = 0;
    for (int i = 0; i < 5; i++) {
        if (_initFX29(addrs[i])) {
            found++;
            Serial.printf("[Sensors] FX29 #%d (0x%02X) OK\n", i + 1, addrs[i]);
        }
    }
    if (found == 0) {
        Serial.println("[Sensors] WARNING — no load cells found");
        _sensorStatus.loadCellsConnected = false;
        _sensorStatus.errorCode |= ERR_LOADCELL_FAIL;
    } else {
        Serial.printf("[Sensors] %d load cell(s) detected\n", found);
        _sensorStatus.loadCellsConnected = true;
    }

    /* ---- Geophone ADC ---- */
    pinMode(GEOPHONE_PIN, INPUT);
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);  /* Full 0–3.3 V */

    int testAdc = analogRead(GEOPHONE_PIN);
    if (testAdc >= 0 && testAdc <= 4095) {
        Serial.printf("[Sensors] Geophone ADC OK — raw %d\n", testAdc);
        _sensorStatus.geophoneConnected = true;
    } else {
        Serial.println("[Sensors] WARNING — geophone ADC out of range");
        _sensorStatus.geophoneConnected = false;
        _sensorStatus.errorCode |= ERR_GEOPHONE_FAIL;
    }

    /* ---- Status LED ---- */
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    _sensorStatus.lastUpdate = millis();
    bool ok = (_sensorStatus.errorCode == ERR_NONE);
    Serial.printf("[Sensors] Init %s\n", ok ? "complete" : "complete (with warnings)");
    return ok;
}

/* ===================================================================== */
/* Per-sensor update methods                                             */
/* ===================================================================== */

void SensorManager::updateGeophone() {
    unsigned long now = micros();
    if (now - _lastGeophoneUpdate < GEOPHONE_SAMPLE_INTERVAL_US) return;
    _lastGeophoneUpdate = now;

    /* 12-bit ADC centred: subtract 2048 so quiet = ~0 */
    int16_t sample = static_cast<int16_t>(analogRead(GEOPHONE_PIN) - 2048);
    _signalProcessor.addSample(sample);

    /* Buffer 100 samples for MQTT /geophone (BedDot binary stream) */
    _geoMqttBuf[_geoMqttFill++] = static_cast<int32_t>(sample);
    if (_geoMqttFill >= 100) {
        if (!_geoMqttPending) {
            memcpy(_geoMqttPendingBuf, _geoMqttBuf, sizeof(_geoMqttBuf));
            _geoMqttPending = true;
        }
        _geoMqttFill = 0;
    }
}

void SensorManager::updateEnvironment() {
    unsigned long now = millis();
    if (now - _lastDhtUpdate < DHT_UPDATE_INTERVAL_MS) return;
    _lastDhtUpdate = now;

    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
        _latestEnv.temperature  = t + _tempOffset;
        _latestEnv.temperatureF = (_latestEnv.temperature * 9.0f / 5.0f) + 32.0f;
        _latestEnv.humidity     = h;
        _latestEnv.isValid      = true;
        _latestEnv.timestamp    = now;
        _sensorStatus.dhtConnected = true;
    } else {
        _latestEnv.isValid         = false;
        _sensorStatus.dhtConnected = false;
    }
}

void SensorManager::updateWeight() {
    unsigned long now = millis();
    if (now - _lastWeightUpdate < WEIGHT_UPDATE_INTERVAL_MS) return;
    _lastWeightUpdate = now;

    const uint8_t addrs[] = {
        LOADCELL_1_ADDR, LOADCELL_2_ADDR,
        LOADCELL_3_ADDR, LOADCELL_4_ADDR, LOADCELL_5_ADDR
    };

    float cells[5] = {0};
    for (int i = 0; i < 5; i++) {
        _readFX29(addrs[i], cells[i]);
        _latestWeight.loadCell[i] = cells[i];
    }

    float total = 0.0f;
    for (int i = 0; i < 5; i++) total += cells[i];

    _latestWeight.totalWeight =
        constrain((total * _weightCalFactor) - _weightTare, 0.0f, WEIGHT_MAX_LBS);

    _weightHistory[_weightHistIdx] = _latestWeight.totalWeight;
    _weightHistIdx = (_weightHistIdx + 1) % WEIGHT_HISTORY_LEN;

    _latestWeight.isStable  = _checkWeightStability();
    _latestWeight.isValid   = true;
    _latestWeight.timestamp = now;
}

/* ===================================================================== */
/* Data accessors                                                        */
/* ===================================================================== */

SensorData SensorManager::getData() {
    SensorData d;
    d.vitals      = _signalProcessor.processSignals();
    d.environment = _latestEnv;
    d.weight      = _latestWeight;
    d.status      = _sensorStatus;
    return d;
}

VitalSigns      SensorManager::getVitalSigns()  { return _signalProcessor.processSignals(); }
EnvironmentData SensorManager::getEnvironment()  { return _latestEnv; }
WeightData      SensorManager::getWeight()       { return _latestWeight; }
SensorStatus    SensorManager::getStatus()       { return _sensorStatus; }

/* ===================================================================== */
/* Calibration                                                           */
/* ===================================================================== */

void SensorManager::tareWeight() {
    if (_fx29LibReady) {
        _fx29Primary.tare(1000);
    }

    const uint8_t addrs[] = {
        LOADCELL_1_ADDR, LOADCELL_2_ADDR,
        LOADCELL_3_ADDR, LOADCELL_4_ADDR, LOADCELL_5_ADDR
    };

    float sum = 0.0f;
    const int samples = 10;
    for (int s = 0; s < samples; s++) {
        float cells[5] = {0};
        for (int i = 0; i < 5; i++) _readFX29(addrs[i], cells[i]);
        float total = 0.0f;
        for (int i = 0; i < 5; i++) total += cells[i];
        sum += total * _weightCalFactor;
        delay(100);
    }
    _weightTare = sum / samples;
    Serial.printf("[Sensors] Tared to %.2f lbs\n", _weightTare);
}

void SensorManager::setWeightCalibrationFactor(float f) {
    _weightCalFactor = f;
    Serial.printf("[Sensors] Weight cal factor → %.2f\n", f);
}

void SensorManager::setTemperatureOffset(float o) {
    _tempOffset = o;
    Serial.printf("[Sensors] Temp offset → %.2f °C\n", o);
}

int16_t SensorManager::getRawGeophoneSample() {
    return static_cast<int16_t>(analogRead(GEOPHONE_PIN) - 2048);
}

bool SensorManager::tryConsumeGeophoneMqttBlock(int32_t out100[100]) {
    if (!_geoMqttPending) return false;
    memcpy(out100, _geoMqttPendingBuf, 100 * sizeof(int32_t));
    _geoMqttPending = false;
    return true;
}

/* ===================================================================== */
/* Weight stability                                                      */
/* ===================================================================== */

bool SensorManager::_checkWeightStability() {
    float sum = 0.0f, sumSq = 0.0f;
    for (uint8_t i = 0; i < WEIGHT_HISTORY_LEN; i++) {
        sum   += _weightHistory[i];
        sumSq += _weightHistory[i] * _weightHistory[i];
    }
    float mean = sum / WEIGHT_HISTORY_LEN;
    float var  = (sumSq / WEIGHT_HISTORY_LEN) - (mean * mean);
    return (var < 0.5f);    /* ≤ 0.5 lb² variance → stable */
}

/* ===================================================================== */
/* FX29 I2C helpers                                                      */
/* ===================================================================== */

bool SensorManager::_initFX29(uint8_t addr) {
    Wire.beginTransmission(addr);
    return (Wire.endTransmission() == 0);
}

bool SensorManager::_readFX29(uint8_t addr, float& force) {
    if (addr == LOADCELL_1_ADDR && _fx29LibReady) {
        force = _fx29Primary.getPounds();
        if (!isfinite(force)) {
            force = 0.0f;
            return false;
        }
        force = constrain(force, 0.0f, 100.0f);
        return true;
    }

    Wire.beginTransmission(addr);
    Wire.write(FX29_CMD_READ_FORCE);
    if (Wire.endTransmission(false) != 0) { force = 0.0f; return false; }

    Wire.requestFrom(addr, static_cast<uint8_t>(2));
    if (Wire.available() < 2) { force = 0.0f; return false; }

    uint8_t msb = Wire.read();
    uint8_t lsb = Wire.read();

    /* 14-bit value, left-justified in 16 bits */
    uint16_t raw = (static_cast<uint16_t>(msb) << 8) | lsb;
    raw >>= 2;

    /* FX29K0-100A: 10–90 % of 16384 counts maps to 0–100 lbs */
    force = (static_cast<float>(raw - 1638) / (14746.0f - 1638.0f)) * 100.0f;
    force = constrain(force, 0.0f, 100.0f);
    return true;
}
