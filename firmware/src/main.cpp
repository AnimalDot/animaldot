/**
 * @file main.cpp
 * @brief AnimalDot Smart Bed — Main Firmware Entry Point
 *
 * Startup sequence:
 *   1. Load persistent settings from NVS.
 *   2. Initialise sensors (DHT22, FX29 load cells, geophone).
 *   3. Initialise BLE and begin advertising.
 *   4. Connect to WiFi (STA with captive-portal fallback).
 *   5. Connect to MQTT broker and begin publishing.
 *   6. Enter the main super-loop:
 *        a. High-priority geophone sampling (200 Hz).
 *        b. Periodic sensor reads (DHT, weight).
 *        c. BLE notifications  (1 s cadence).
 *        d. MQTT publishing    (5 s cadence).
 *        e. Calibration command handling.
 *        f. WiFi / MQTT health monitoring.
 *        g. Heartbeat LED + serial diagnostics.
 *
 * University of Georgia — Capstone Design 2025
 * Team: Bryce, Caleb, Colby, Grant, Jalen, Naman
 * Advisors: Dr. Peter Kner, Dr. Jorge Rodriguez
 * Sponsors: Dr. Ben Brainard, Dr. Wenzhan Song
 *
 * @version 2.0.0
 */

#include <Arduino.h>
#include "config.h"
#include "settings_manager.h"
#include "sensor_manager.h"
#include "ble_manager.h"
#include "wifi_manager.h"
#include "mqtt_manager.h"

/* ---- Global instances ------------------------------------------------ */

static SettingsManager settings;
static SensorManager   sensors;
static BLEManager      ble;
static WifiManager     wifi;
static MqttManager     mqtt;

/* ---- Timing variables ------------------------------------------------ */

static unsigned long lastBLENotify   = 0;
static unsigned long lastMqttPublish = 0;
static unsigned long lastStatusPrint = 0;
static unsigned long lastLedToggle   = 0;
static bool          ledState        = false;

/* ---- BLE connection callback ----------------------------------------- */

class ConnectionCallbacks : public BLEConnectionCallbacks {
public:
    void onConnect()    override { Serial.println("[Main] BLE client connected");  }
    void onDisconnect() override { Serial.println("[Main] BLE client disconnected"); }
};
static ConnectionCallbacks bleCallbacks;

/* ---- WiFi mode-change callback --------------------------------------- */

static void onWifiModeChange(WifiMode mode) {
    switch (mode) {
        case WifiMode::STATION:
            Serial.printf("[Main] WiFi → STATION (%s)\n",
                          WiFi.localIP().toString().c_str());
            /* Start MQTT now that we have connectivity */
            mqtt.begin(settings.mqttHost(), settings.mqttPort(),
                       settings.orgName(), wifi.macAddressRaw());
            break;
        case WifiMode::ACCESS_POINT:
            Serial.println("[Main] WiFi → AP (captive portal active)");
            break;
        case WifiMode::CONNECTING:
            Serial.println("[Main] WiFi → CONNECTING…");
            break;
        case WifiMode::DISCONNECTED:
            Serial.println("[Main] WiFi → DISCONNECTED");
            break;
    }
}

/* ===================================================================== */
/* setup()                                                               */
/* ===================================================================== */

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("================================================");
    Serial.println("  AnimalDot Smart Bed — Starting Up");
    Serial.printf("  Firmware v%s\n", FIRMWARE_VERSION);
    Serial.println("================================================");
    Serial.println();

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);  /* LED on during init */

    /* ---- 1. Persistent settings ---- */
    Serial.println("[Main] Loading settings…");
    if (!settings.begin()) {
        Serial.println("[Main] WARNING — NVS init failed; using defaults");
    }

    /* ---- 2. Sensors ---- */
    Serial.println("[Main] Initialising sensors…");
    if (!sensors.begin()) {
        Serial.println("[Main] WARNING — some sensors failed");
    }
    /* Apply stored calibration */
    sensors.setWeightCalibrationFactor(settings.weightCal());
    sensors.setTemperatureOffset(settings.tempOffset());

    /* ---- 3. BLE ---- */
    Serial.println("[Main] Initialising BLE…");
    if (!ble.begin()) {
        Serial.println("[Main] ERROR — BLE init failed");
    }
    ble.setConnectionCallback(&bleCallbacks);

    /* ---- 4. WiFi ---- */
    Serial.println("[Main] Initialising WiFi…");
    wifi.onModeChange(onWifiModeChange);
    bool staOk = wifi.begin(settings.wifiSSID(), settings.wifiPass());

    /* ---- 5. MQTT (only if STA connected) ---- */
    if (staOk) {
        Serial.println("[Main] Initialising MQTT…");
        mqtt.begin(settings.mqttHost(), settings.mqttPort(),
                   settings.orgName(), wifi.macAddressRaw());
    }

    /* ---- 6. Initial tare (bed should be empty at power-on) ---- */
    Serial.println("[Main] Taring weight…");
    delay(500);
    sensors.tareWeight();

    digitalWrite(LED_PIN, LOW);  /* LED off — init complete */

    Serial.println();
    Serial.println("[Main] Initialisation complete — entering main loop");
    Serial.println();
}

/* ===================================================================== */
/* loop()                                                                */
/* ===================================================================== */

void loop() {
    const unsigned long now = millis();

    /* =========================================================
     * HIGH PRIORITY — Geophone sampling at ≥ 200 Hz
     * ========================================================= */
    sensors.updateGeophone();

    /* =========================================================
     * MEDIUM PRIORITY — Peripheral sensors
     * ========================================================= */
    sensors.updateEnvironment();
    sensors.updateWeight();

    /* =========================================================
     * WiFi service (captive portal / reconnect)
     * ========================================================= */
    wifi.loop();

    /* =========================================================
     * MQTT keep-alive / reconnect
     * ========================================================= */
    if (wifi.isConnected()) {
        mqtt.loop();
        /* Stream raw geophone to MQTT (~2 blocks/s at 200 Hz) for dashboards */
        int32_t geoBlk[100];
        if (mqtt.isConnected() && sensors.tryConsumeGeophoneMqttBlock(geoBlk)) {
            mqtt.publishGeophone100(geoBlk);
        }
    }

    /* =========================================================
     * BLE notifications (1 s cadence)
     * ========================================================= */
    if (now - lastBLENotify >= BLE_NOTIFY_INTERVAL_MS) {
        lastBLENotify = now;
        SensorData data = sensors.getData();
        ble.updateVitals(data.vitals);
        ble.updateEnvironment(data.environment);
        ble.updateWeight(data.weight);
        ble.updateStatus(data.status);
    }

    /* =========================================================
     * MQTT publishing (5 s cadence)
     * ========================================================= */
    if (wifi.isConnected() && mqtt.isConnected() &&
        (now - lastMqttPublish >= MQTT_PUBLISH_INTERVAL_MS)) {
        lastMqttPublish = now;
        SensorData data = sensors.getData();
        mqtt.publishVitals(data.vitals);
        mqtt.publishEnvironment(data.environment);
        mqtt.publishWeight(data.weight);
    }

    /* =========================================================
     * Calibration command handling (BLE)
     * ========================================================= */
    if (ble.hasCalibrationCommand()) {
        CalibrationCommand cmd = ble.getCalibrationCommand();
        switch (cmd.commandType) {
            case 0x01:
                Serial.println("[Main] CAL: tare weight");
                sensors.tareWeight();
                settings.setWeightTare(sensors.getWeightTare());
                settings.save();
                break;
            case 0x02:
                Serial.printf("[Main] CAL: temp offset → %.2f\n", cmd.value);
                sensors.setTemperatureOffset(cmd.value);
                settings.setTempOffset(cmd.value);
                settings.save();
                break;
            case 0x03:
                Serial.printf("[Main] CAL: weight factor → %.2f\n", cmd.value);
                sensors.setWeightCalibrationFactor(cmd.value);
                settings.setWeightCal(cmd.value);
                settings.save();
                break;
            default:
                Serial.printf("[Main] CAL: unknown 0x%02X\n", cmd.commandType);
        }
    }

    /* =========================================================
     * Status LED heartbeat
     * ========================================================= */
    unsigned long ledInterval = ble.isConnected() ? 500 : 2000;
    if (now - lastLedToggle >= ledInterval) {
        lastLedToggle = now;
        ledState = !ledState;
        digitalWrite(LED_PIN, ledState);
    }

    /* =========================================================
     * Serial diagnostics (5 s cadence)
     * ========================================================= */
    if (now - lastStatusPrint >= STATUS_PRINT_INTERVAL_MS) {
        lastStatusPrint = now;
        SensorData d = sensors.getData();

        Serial.println("──── AnimalDot Status ────");
        Serial.printf("BLE clients : %u\n",  ble.getConnectionCount());
        Serial.printf("WiFi        : %s\n",  wifi.isConnected() ? wifi.localIP().toString().c_str() : "disconnected");
        Serial.printf("MQTT        : %s\n",  mqtt.isConnected() ? "connected" : "disconnected");
        Serial.printf("Heart Rate  : %.0f bpm  (quality %.0f%%)\n",
                      d.vitals.heartRate, d.vitals.signalQuality * 100);
        Serial.printf("Resp Rate   : %.0f brpm\n", d.vitals.respiratoryRate);
        Serial.printf("Temperature : %.1f °F (%.1f °C)\n",
                      d.environment.temperatureF, d.environment.temperature);
        Serial.printf("Humidity    : %.1f%%\n", d.environment.humidity);
        Serial.printf("Weight      : %.1f lbs  (stable: %s)\n",
                      d.weight.totalWeight,
                      d.weight.isStable ? "yes" : "no");
        Serial.printf("Sensors     : DHT=%s  LC=%s  Geo=%s\n",
                      d.status.dhtConnected       ? "OK" : "FAIL",
                      d.status.loadCellsConnected ? "OK" : "FAIL",
                      d.status.geophoneConnected  ? "OK" : "FAIL");
        Serial.println("──────────────────────────");
        Serial.println();
    }

    /* Brief yield to prevent watchdog reset */
    delayMicroseconds(100);
}
