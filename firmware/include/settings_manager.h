/**
 * @file settings_manager.h
 * @brief AnimalDot Smart Bed — Non-Volatile Settings Manager
 *
 * Wraps the ESP32 Preferences (NVS) library to persist WiFi credentials,
 * MQTT broker info, calibration offsets, and pet metadata across reboots.
 *
 * Inspired by the BedDot M5_ADXL_ESP_FRAMEWORK NVS persistent settings.
 *
 * @version 2.0.0
 */

#ifndef SETTINGS_MANAGER_H
#define SETTINGS_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>
#include "config.h"

/**
 * @brief Complete device settings persisted in NVS.
 */
struct DeviceSettings {
    /* WiFi */
    char wifiSSID[64];
    char wifiPass[64];

    /* MQTT */
    char mqttHost[128];
    uint16_t mqttPort;
    char orgName[64];

    /* Calibration */
    float weightCalFactor;
    float tempOffset;
    float weightTare;

    /* Pet info */
    char petName[64];
};

/**
 * @brief Read / write settings in ESP32 NVS flash.
 *
 * All methods are safe to call even before begin().
 * If a key has never been written, default values from config.h are used.
 */
class SettingsManager {
public:
    SettingsManager();

    /**
     * @brief Open NVS namespace and load all settings into RAM cache.
     * @return true on success.
     */
    bool begin();

    /** @brief Persist all cached settings back to NVS. */
    bool save();

    /** @brief Erase all stored settings and revert to defaults. */
    bool factoryReset();

    /* ---- Accessors (read from RAM cache) ---- */

    const DeviceSettings& get() const { return _settings; }

    String wifiSSID()   const { return String(_settings.wifiSSID); }
    String wifiPass()   const { return String(_settings.wifiPass); }
    String mqttHost()   const { return String(_settings.mqttHost); }
    uint16_t mqttPort() const { return _settings.mqttPort; }
    String orgName()    const { return String(_settings.orgName); }
    float weightCal()   const { return _settings.weightCalFactor; }
    float tempOffset()  const { return _settings.tempOffset; }
    float weightTare()  const { return _settings.weightTare; }
    String petName()    const { return String(_settings.petName); }

    /* ---- Mutators (update RAM cache — call save() to persist) ---- */

    void setWifiSSID(const String& v);
    void setWifiPass(const String& v);
    void setMqttHost(const String& v);
    void setMqttPort(uint16_t v);
    void setOrgName(const String& v);
    void setWeightCal(float v);
    void setTempOffset(float v);
    void setWeightTare(float v);
    void setPetName(const String& v);

private:
    Preferences   _prefs;
    DeviceSettings _settings;
    bool           _initialized;

    /** @brief Populate _settings with compile-time defaults. */
    void _loadDefaults();

    /** @brief Read every key from NVS into _settings. */
    void _loadFromNVS();
};

#endif /* SETTINGS_MANAGER_H */
