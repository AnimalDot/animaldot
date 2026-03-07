/**
 * @file settings_manager.cpp
 * @brief AnimalDot Smart Bed — NVS Settings Manager Implementation
 *
 * Wraps ESP32 Preferences (NVS flash) for persistent storage of WiFi,
 * MQTT, calibration, and pet metadata.  All reads/writes are guarded
 * against NVS open/close failures.
 */

#include "settings_manager.h"
#include "config.h"
#include <cstring>

/* ===================================================================== */
/* Constructor                                                           */
/* ===================================================================== */

SettingsManager::SettingsManager() : _initialized(false) {
    _loadDefaults();
}

/* ===================================================================== */
/* Public API                                                            */
/* ===================================================================== */

bool SettingsManager::begin() {
    if (!_prefs.begin(NVS_NAMESPACE, false /* read-write */)) {
        Serial.println("[Settings] NVS open FAILED");
        return false;
    }

    _loadFromNVS();
    _initialized = true;

    Serial.println("[Settings] Loaded from NVS:");
    Serial.printf("  WiFi SSID : %s\n", _settings.wifiSSID);
    Serial.printf("  MQTT Host : %s:%u\n", _settings.mqttHost, _settings.mqttPort);
    Serial.printf("  Org       : %s\n", _settings.orgName);
    Serial.printf("  Pet       : %s\n", _settings.petName);
    Serial.printf("  Weight Cal: %.2f  Tare: %.2f  TempOff: %.2f\n",
                  _settings.weightCalFactor, _settings.weightTare,
                  _settings.tempOffset);

    _prefs.end();
    return true;
}

bool SettingsManager::save() {
    if (!_prefs.begin(NVS_NAMESPACE, false)) {
        Serial.println("[Settings] NVS open for save FAILED");
        return false;
    }

    _prefs.putString(NVS_KEY_WIFI_SSID,  _settings.wifiSSID);
    _prefs.putString(NVS_KEY_WIFI_PASS,  _settings.wifiPass);
    _prefs.putString(NVS_KEY_MQTT_HOST,  _settings.mqttHost);
    _prefs.putUShort(NVS_KEY_MQTT_PORT,  _settings.mqttPort);
    _prefs.putString(NVS_KEY_ORG_NAME,   _settings.orgName);
    _prefs.putFloat(NVS_KEY_WEIGHT_CAL,  _settings.weightCalFactor);
    _prefs.putFloat(NVS_KEY_TEMP_OFFSET, _settings.tempOffset);
    _prefs.putFloat(NVS_KEY_WEIGHT_TARE, _settings.weightTare);
    _prefs.putString(NVS_KEY_PET_NAME,   _settings.petName);

    _prefs.end();
    Serial.println("[Settings] Saved to NVS");
    return true;
}

bool SettingsManager::factoryReset() {
    if (!_prefs.begin(NVS_NAMESPACE, false)) return false;
    _prefs.clear();
    _prefs.end();
    _loadDefaults();
    Serial.println("[Settings] Factory reset — defaults restored");
    return true;
}

/* ---- Mutators -------------------------------------------------------- */

void SettingsManager::setWifiSSID(const String& v) {
    strncpy(_settings.wifiSSID, v.c_str(), sizeof(_settings.wifiSSID) - 1);
    _settings.wifiSSID[sizeof(_settings.wifiSSID) - 1] = '\0';
}
void SettingsManager::setWifiPass(const String& v) {
    strncpy(_settings.wifiPass, v.c_str(), sizeof(_settings.wifiPass) - 1);
    _settings.wifiPass[sizeof(_settings.wifiPass) - 1] = '\0';
}
void SettingsManager::setMqttHost(const String& v) {
    strncpy(_settings.mqttHost, v.c_str(), sizeof(_settings.mqttHost) - 1);
    _settings.mqttHost[sizeof(_settings.mqttHost) - 1] = '\0';
}
void SettingsManager::setMqttPort(uint16_t v) { _settings.mqttPort = v; }
void SettingsManager::setOrgName(const String& v) {
    strncpy(_settings.orgName, v.c_str(), sizeof(_settings.orgName) - 1);
    _settings.orgName[sizeof(_settings.orgName) - 1] = '\0';
}
void SettingsManager::setWeightCal(float v)  { _settings.weightCalFactor = v; }
void SettingsManager::setTempOffset(float v) { _settings.tempOffset = v; }
void SettingsManager::setWeightTare(float v) { _settings.weightTare = v; }
void SettingsManager::setPetName(const String& v) {
    strncpy(_settings.petName, v.c_str(), sizeof(_settings.petName) - 1);
    _settings.petName[sizeof(_settings.petName) - 1] = '\0';
}

/* ===================================================================== */
/* Private helpers                                                       */
/* ===================================================================== */

void SettingsManager::_loadDefaults() {
    memset(&_settings, 0, sizeof(_settings));
    strncpy(_settings.mqttHost, MQTT_BROKER_HOST, sizeof(_settings.mqttHost) - 1);
    _settings.mqttPort        = MQTT_BROKER_PORT;
    strncpy(_settings.orgName, ORGANIZATION_NAME, sizeof(_settings.orgName) - 1);
    _settings.weightCalFactor = WEIGHT_CALIBRATION_FACTOR;
    _settings.tempOffset      = 0.0f;
    _settings.weightTare      = 0.0f;
    strncpy(_settings.petName, "My Pet", sizeof(_settings.petName) - 1);
}

void SettingsManager::_loadFromNVS() {
    /* Read each key; fall back to current (default) value if absent */
    String s;

    s = _prefs.getString(NVS_KEY_WIFI_SSID, "");
    if (s.length() > 0) strncpy(_settings.wifiSSID, s.c_str(), sizeof(_settings.wifiSSID) - 1);

    s = _prefs.getString(NVS_KEY_WIFI_PASS, "");
    if (s.length() > 0) strncpy(_settings.wifiPass, s.c_str(), sizeof(_settings.wifiPass) - 1);

    s = _prefs.getString(NVS_KEY_MQTT_HOST, "");
    if (s.length() > 0) strncpy(_settings.mqttHost, s.c_str(), sizeof(_settings.mqttHost) - 1);

    _settings.mqttPort = _prefs.getUShort(NVS_KEY_MQTT_PORT, _settings.mqttPort);

    s = _prefs.getString(NVS_KEY_ORG_NAME, "");
    if (s.length() > 0) strncpy(_settings.orgName, s.c_str(), sizeof(_settings.orgName) - 1);

    _settings.weightCalFactor = _prefs.getFloat(NVS_KEY_WEIGHT_CAL, _settings.weightCalFactor);
    _settings.tempOffset      = _prefs.getFloat(NVS_KEY_TEMP_OFFSET, _settings.tempOffset);
    _settings.weightTare      = _prefs.getFloat(NVS_KEY_WEIGHT_TARE, _settings.weightTare);

    s = _prefs.getString(NVS_KEY_PET_NAME, "");
    if (s.length() > 0) strncpy(_settings.petName, s.c_str(), sizeof(_settings.petName) - 1);
}
