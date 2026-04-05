/**
 * @file config.h
 * @brief AnimalDot Smart Bed — Central Configuration
 *
 * Pin assignments, sampling parameters, vital-sign ranges, BLE UUIDs,
 * WiFi / MQTT defaults, NVS key names, and error codes.
 *
 * Hardware targets:
 *   - ESP32-DevKitC (primary)
 *   - M5StickC Plus 2 (ESP32-PICO, optional display via M5Unified)
 *
 * University of Georgia — Capstone Design 2025
 * Team: Bryce, Caleb, Colby, Grant, Jalen, Naman
 * Advisors: Dr. Peter Kner, Dr. Jorge Rodriguez
 * Sponsors: Dr. Ben Brainard, Dr. Wenzhan Song
 *
 * @version 2.0.0
 * @date    2025
 */

#ifndef ANIMALDOT_CONFIG_H
#define ANIMALDOT_CONFIG_H

/* ===================================================================
 * VERSION & IDENTITY
 * =================================================================== */
#define FIRMWARE_VERSION        "2.0.0"
#define DEVICE_NAME             "AnimalDot_Bed"
#define ORGANIZATION_NAME       "sensorweb"   /**< MQTT topic prefix (SensorWeb broker) */

/* ===================================================================
 * PIN DEFINITIONS — ESP32-DevKitC
 * =================================================================== */

/** @name DHT22 Temperature / Humidity Sensor */
///@{
#define DHT_PIN                 4
#define DHT_TYPE                DHT22
///@}

/** @name Geophone Analog Input (vibration / seismometer) */
///@{
#define GEOPHONE_PIN            34            /**< ADC1_CH6 — reliable     */
///@}

/** @name FX29 Load Cells — I2C Bus */
///@{
#define I2C_SDA                 21
#define I2C_SCL                 22
#define LOADCELL_1_ADDR         0x28          /**< FX29 default            */
#define LOADCELL_2_ADDR         0x29
#define LOADCELL_3_ADDR         0x2A
#define LOADCELL_4_ADDR         0x2B
#define LOADCELL_5_ADDR         0x2C
///@}

/** @name ADXL355 Accelerometer — SPI Bus (BedDot-compatible) */
///@{
#define ADXL355_CS_PIN          5             /**< Chip select             */
#define ADXL355_SCLK_PIN        18            /**< SPI clock               */
#define ADXL355_MOSI_PIN        23            /**< Master-out slave-in     */
#define ADXL355_MISO_PIN        19            /**< Master-in slave-out     */
#define ADXL355_SPI_SPEED       8000000       /**< 8 MHz                   */
#define ADXL355_ENABLED         false         /**< Set true if wired       */
///@}

/** @name Status LED */
///@{
#define LED_PIN                 2
///@}

/* ===================================================================
 * SAMPLING CONFIGURATION
 * =================================================================== */

/** @name Geophone — Heart Rate / Respiratory Rate */
///@{
#define GEOPHONE_SAMPLE_RATE_HZ      200
#define GEOPHONE_SAMPLE_INTERVAL_US  (1000000UL / GEOPHONE_SAMPLE_RATE_HZ)
#define GEOPHONE_BUFFER_SIZE         (GEOPHONE_SAMPLE_RATE_HZ * 10) /**< 10 s */
///@}

/** @name Peripheral Update Intervals */
///@{
#define DHT_UPDATE_INTERVAL_MS       2000     /**< Every 2 s              */
#define WEIGHT_UPDATE_INTERVAL_MS    500      /**< Every 500 ms           */
#define BLE_NOTIFY_INTERVAL_MS       1000     /**< BLE push every 1 s     */
#define MQTT_PUBLISH_INTERVAL_MS     5000     /**< Cloud push every 5 s   */
#define WIFI_RECONNECT_INTERVAL_MS   30000    /**< Retry WiFi every 30 s  */
#define STATUS_PRINT_INTERVAL_MS     5000     /**< Serial debug every 5 s */
///@}

/* ===================================================================
 * VITAL-SIGN RANGES (canine defaults)
 * =================================================================== */

/** @name Heart Rate — typical dog: 60–120 bpm */
///@{
#define HR_MIN_BPM              40
#define HR_MAX_BPM              180
#define HR_FREQ_MIN_HZ          0.67f         /**< 40 bpm                  */
#define HR_FREQ_MAX_HZ          3.0f          /**< 180 bpm                 */
///@}

/** @name Respiratory Rate — typical dog: 10–40 breaths/min */
///@{
#define RR_MIN_BPM              5
#define RR_MAX_BPM              60
#define RR_FREQ_MIN_HZ          0.083f        /**< 5 breaths/min           */
#define RR_FREQ_MAX_HZ          1.0f          /**< 60 breaths/min          */
///@}

/** @name Weight */
///@{
#define WEIGHT_MAX_LBS          150.0f
#define WEIGHT_CALIBRATION_FACTOR 1.0f        /**< FX29K reports pounds    */
///@}

/** @name Temperature — normal dog body: 100–102.5 °F */
///@{
#define TEMP_MIN_F              95.0f
#define TEMP_MAX_F              110.0f
///@}

/* ===================================================================
 * BLE UUIDs
 * =================================================================== */

/** @name Custom AnimalDot Service */
///@{
#define ANIMALDOT_SERVICE_UUID          "12345678-1234-5678-1234-56789abcdef0"
#define HEART_RATE_CHAR_UUID            "12345678-1234-5678-1234-56789abcdef1"
#define RESP_RATE_CHAR_UUID             "12345678-1234-5678-1234-56789abcdef2"
#define TEMPERATURE_CHAR_UUID           "12345678-1234-5678-1234-56789abcdef3"
#define HUMIDITY_CHAR_UUID              "12345678-1234-5678-1234-56789abcdef4"
#define WEIGHT_CHAR_UUID                "12345678-1234-5678-1234-56789abcdef5"
#define DEVICE_STATUS_CHAR_UUID         "12345678-1234-5678-1234-56789abcdef6"
#define CALIBRATION_CHAR_UUID           "12345678-1234-5678-1234-56789abcdef7"
#define RAW_GEOPHONE_CHAR_UUID          "12345678-1234-5678-1234-56789abcdef8"
///@}

/** @name Standard Heart Rate Service (BLE SIG) */
///@{
#define HEART_RATE_SERVICE_UUID         "180D"
#define HEART_RATE_MEASUREMENT_UUID     "2A37"
///@}

/* ===================================================================
 * WIFI / MQTT DEFAULTS
 *
 * These are compile-time defaults only; runtime values are persisted
 * in NVS and can be changed via the web configuration portal or BLE.
 * =================================================================== */

/** @name WiFi Defaults */
///@{
#define WIFI_AP_SSID            "AnimalDot-Setup"
#define WIFI_AP_PASSWORD        "animaldot123"
#define WIFI_STA_CONNECT_TIMEOUT_MS  15000    /**< Give up after 15 s     */
#define WIFI_MAX_RETRY          5             /**< Then fall back to AP    */
///@}

/** @name MQTT Defaults (BedDot-compatible; UGA SensorWeb) */
///@{
#define MQTT_BROKER_HOST        "sensorweb.us"
#define MQTT_BROKER_PORT        1883
#define MQTT_KEEPALIVE_SEC      60
#define MQTT_QOS                1             /**< At-least-once delivery  */
///@}

/* ===================================================================
 * NVS KEY NAMES — persistent settings
 * =================================================================== */

#define NVS_NAMESPACE           "animaldot"
#define NVS_KEY_WIFI_SSID       "wifi_ssid"
#define NVS_KEY_WIFI_PASS       "wifi_pass"
#define NVS_KEY_MQTT_HOST       "mqtt_host"
#define NVS_KEY_MQTT_PORT       "mqtt_port"
#define NVS_KEY_ORG_NAME        "org_name"
#define NVS_KEY_DEVICE_MAC      "device_mac"
#define NVS_KEY_WEIGHT_CAL      "weight_cal"
#define NVS_KEY_TEMP_OFFSET     "temp_offset"
#define NVS_KEY_WEIGHT_TARE     "weight_tare"
#define NVS_KEY_PET_NAME        "pet_name"

/* ===================================================================
 * SIGNAL PROCESSING
 * =================================================================== */

#define MOVING_AVG_WINDOW            10
#define PEAK_THRESHOLD_FRACTION      0.6f
#define MIN_PEAK_INTERVAL_MS         200       /**< Max ≈ 300 bpm          */
#define SIGNAL_QUALITY_GOOD          0.7f
#define SIGNAL_QUALITY_FAIR          0.4f

/** @name Research-paper DSP constants (amplitude-demodulation pipeline) */
///@{
#define KURTOSIS_MOVEMENT_THRESHOLD  5.0f     /**< Kurtosis > 5 = movement */
#define IBI_TRIM_FRACTION            0.1f     /**< Trim 10th/90th pctile   */
#define ENVELOPE_WINDOW_SAMPLES      40       /**< 200 ms RMS at 200 Hz    */
#define HR_UPDATE_INTERVAL_SEC       3        /**< Compute HR every 3 s    */
#define MAX_BEATS_PER_WINDOW         40       /**< 180 bpm × 10 s / 60 pad */
///@}

/* ===================================================================
 * MQTT BINARY PAYLOAD LAYOUT (BedDot-compatible)
 *
 * Byte 1–6:  MAC address (binary, 6 B)
 * Byte 7–8:  data-item count (uint16, LE)
 * Byte 9–16: timestamp µs (uint64, LE)
 * Byte 17–20: sample interval µs (uint32, LE)
 * Byte 21+:  data items (int32 each, LE)
 * =================================================================== */

#define MQTT_PAYLOAD_HEADER_SIZE     20       /**< Fixed header bytes      */

/* ===================================================================
 * ERROR CODES (bitmask)
 * =================================================================== */

#define ERR_NONE                0x00
#define ERR_DHT_FAIL            0x01
#define ERR_LOADCELL_FAIL       0x02
#define ERR_GEOPHONE_FAIL       0x04
#define ERR_BLE_FAIL            0x08
#define ERR_CALIBRATION_FAIL    0x10
#define ERR_WIFI_FAIL           0x20
#define ERR_MQTT_FAIL           0x40
#define ERR_NVS_FAIL            0x80

#endif /* ANIMALDOT_CONFIG_H */
