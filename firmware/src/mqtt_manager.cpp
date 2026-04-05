/**
 * @file mqtt_manager.cpp
 * @brief AnimalDot Smart Bed — MQTT Manager Implementation
 *
 * Builds BedDot-compatible binary payloads and publishes them to
 * the configured MQTT broker.  The payload format matches the spec
 * in "03_API_D — Interacting with the Backend via MQTT":
 *
 *   [MAC 6B][count 2B LE][timestamp 8B LE][interval 4B LE][data…]
 *
 * Topics follow /<org>/<mac_hex>/<measurement>.
 */

#include "mqtt_manager.h"
#include "config.h"
#include <cstring>

/* ===================================================================== */
/* Constructor                                                           */
/* ===================================================================== */

MqttManager::MqttManager()
    : _mqttClient(_wifiClient),
      _state(MqttState::DISCONNECTED),
      _port(MQTT_BROKER_PORT),
      _lastReconnectAttempt(0) {
    memset(_macBytes, 0, sizeof(_macBytes));
}

/* ===================================================================== */
/* Public API                                                            */
/* ===================================================================== */

bool MqttManager::begin(const String& host, uint16_t port,
                        const String& org, const String& macRaw) {
    _host   = host;
    _port   = port;
    _org    = org;
    _macRaw = macRaw;

    /* Parse MAC string "aabbccddeeff" → 6 raw bytes */
    _parseMac(macRaw);

    _mqttClient.setServer(_host.c_str(), _port);
    _mqttClient.setKeepAlive(MQTT_KEEPALIVE_SEC);

    /* PubSubClient has a 256 B default buffer — raise it for our payloads */
    _mqttClient.setBufferSize(512); /* geophone payload 20 + 400 B */

    Serial.printf("[MQTT] Broker %s:%u  Org: %s  MAC: %s\n",
                  _host.c_str(), _port, _org.c_str(), _macRaw.c_str());

    return _reconnect();
}

void MqttManager::loop() {
    if (!_mqttClient.connected()) {
        unsigned long now = millis();
        if (now - _lastReconnectAttempt > 5000) {
            _lastReconnectAttempt = now;
            _reconnect();
        }
    }
    _mqttClient.loop();
}

MqttState MqttManager::getState() const { return _state; }

bool MqttManager::isConnected() const {
    return _mqttClient.connected();
}

/* ---- Publishing ------------------------------------------------------ */

bool MqttManager::publishVitals(const VitalSigns& vitals) {
    if (!vitals.isValid) return false;

    /* Heart rate: bpm × 10 → integer (e.g. 72.5 bpm → 725) */
    int32_t hrVal = static_cast<int32_t>(vitals.heartRate * 10.0f);
    if (!publishRaw("heartrate", hrVal)) return false;

    /* Respiratory rate: brpm × 10 */
    int32_t rrVal = static_cast<int32_t>(vitals.respiratoryRate * 10.0f);
    return publishRaw("resprate", rrVal);
}

bool MqttManager::publishEnvironment(const EnvironmentData& env) {
    if (!env.isValid) return false;

    int32_t tempVal = static_cast<int32_t>(env.temperatureF * 10.0f);
    if (!publishRaw("temperature", tempVal)) return false;

    int32_t humVal = static_cast<int32_t>(env.humidity * 10.0f);
    return publishRaw("humidity", humVal);
}

bool MqttManager::publishWeight(const WeightData& weight) {
    if (!weight.isValid) return false;

    int32_t wVal = static_cast<int32_t>(weight.totalWeight * 10.0f);
    return publishRaw("weight", wVal);
}

bool MqttManager::publishGeophone100(const int32_t* samples100) {
    if (!_mqttClient.connected() || samples100 == nullptr) return false;

    constexpr uint16_t n = 100;
    uint8_t buf[MQTT_PAYLOAD_HEADER_SIZE + n * 4];

    uint64_t tsUs = static_cast<uint64_t>(micros());
    uint32_t intervalUs = GEOPHONE_SAMPLE_INTERVAL_US; /* 200 Hz */

    _buildHeader(buf, n, tsUs, intervalUs);
    for (uint16_t i = 0; i < n; i++) {
        _appendItem(buf, MQTT_PAYLOAD_HEADER_SIZE + i * 4, samples100[i]);
    }

    return _publish("geophone", buf, sizeof(buf));
}

bool MqttManager::publishRaw(const char* measurement, int32_t value) {
    if (!_mqttClient.connected()) return false;

    /* Build BedDot binary payload: header (20 B) + 1 data item (4 B) */
    uint8_t buf[MQTT_PAYLOAD_HEADER_SIZE + 4];

    uint64_t tsUs = static_cast<uint64_t>(micros());
    /* On ESP32, micros() wraps at ~70 min. For production you would
       use an NTP-synchronised epoch; this is adequate for prototyping. */
    uint32_t intervalUs = 0;            /* single sample, no interval     */

    _buildHeader(buf, 1, tsUs, intervalUs);
    _appendItem(buf, MQTT_PAYLOAD_HEADER_SIZE, value);

    return _publish(measurement, buf, sizeof(buf));
}

/* ===================================================================== */
/* Private helpers                                                       */
/* ===================================================================== */

size_t MqttManager::_buildHeader(uint8_t* buf, uint16_t itemCount,
                                 uint64_t timestampUs, uint32_t intervalUs) {
    /* Bytes 1–6: MAC address (big-endian, same order as on the wire) */
    memcpy(buf, _macBytes, 6);

    /* Bytes 7–8: item count (little-endian) */
    memcpy(buf + 6, &itemCount, 2);

    /* Bytes 9–16: timestamp µs (little-endian) */
    memcpy(buf + 8, &timestampUs, 8);

    /* Bytes 17–20: interval µs (little-endian) */
    memcpy(buf + 16, &intervalUs, 4);

    return MQTT_PAYLOAD_HEADER_SIZE;
}

void MqttManager::_appendItem(uint8_t* buf, size_t offset, int32_t value) {
    memcpy(buf + offset, &value, 4);
}

bool MqttManager::_publish(const char* measurement,
                           const uint8_t* payload, size_t len) {
    /* Topic: /<org>/<macRaw>/<measurement> */
    String topic = "/" + _org + "/" + _macRaw + "/" + String(measurement);

    bool ok = _mqttClient.publish(topic.c_str(), payload, len, false);
    if (!ok) {
        Serial.printf("[MQTT] Publish FAILED on %s (%u B)\n",
                      topic.c_str(), (unsigned)len);
    }
    return ok;
}

bool MqttManager::_reconnect() {
    if (_mqttClient.connected()) {
        _state = MqttState::CONNECTED;
        return true;
    }

    _state = MqttState::CONNECTING;
    String clientId = "AnimalDot_" + _macRaw;

    Serial.printf("[MQTT] Connecting as %s … ", clientId.c_str());
    if (_mqttClient.connect(clientId.c_str())) {
        Serial.println("OK");
        _state = MqttState::CONNECTED;
        return true;
    }

    Serial.printf("FAIL (rc=%d)\n", _mqttClient.state());
    _state = MqttState::ERROR;
    return false;
}

void MqttManager::_parseMac(const String& macHex) {
    /* Accepts "aabbccddeeff" (12 hex chars) */
    if (macHex.length() < 12) {
        memset(_macBytes, 0, 6);
        return;
    }
    for (int i = 0; i < 6; i++) {
        String byteStr = macHex.substring(i * 2, i * 2 + 2);
        _macBytes[i] = static_cast<uint8_t>(strtoul(byteStr.c_str(), nullptr, 16));
    }
}
