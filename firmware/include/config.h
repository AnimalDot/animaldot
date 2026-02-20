/**
 * AnimalDot Smart Bed - Configuration Header
 * 
 * Pin definitions, constants, and configuration for the
 * vital sign monitoring system.
 */

#ifndef ANIMALDOT_CONFIG_H
#define ANIMALDOT_CONFIG_H

// =============================================================================
// VERSION INFO
// =============================================================================
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_NAME "AnimalDot_Bed"

// =============================================================================
// PIN DEFINITIONS
// =============================================================================

// DHT22 Temperature/Humidity Sensor
#define DHT_PIN 4
#define DHT_TYPE DHT22

// Geophone Analog Input
#define GEOPHONE_PIN 34  // ADC1_CH6 - Use ADC1 pins for reliable readings

// Load Cells (I2C) - FX29 Series
#define I2C_SDA 21
#define I2C_SCL 22

// FX29 Load Cell I2C Addresses (0x28 is default, use address pins for others)
#define LOADCELL_1_ADDR 0x28
#define LOADCELL_2_ADDR 0x29
#define LOADCELL_3_ADDR 0x2A
#define LOADCELL_4_ADDR 0x2B
#define LOADCELL_5_ADDR 0x2C

// Status LED (optional)
#define LED_PIN 2

// =============================================================================
// SAMPLING CONFIGURATION
// =============================================================================

// Geophone sampling for HR/RR detection (200 Hz for accurate capture)
#define GEOPHONE_SAMPLE_RATE_HZ 200
#define GEOPHONE_SAMPLE_INTERVAL_US (1000000 / GEOPHONE_SAMPLE_RATE_HZ)

// Buffer size for signal processing (2 seconds of data)
#define GEOPHONE_BUFFER_SIZE (GEOPHONE_SAMPLE_RATE_HZ * 2)

// Temperature/Humidity update interval (every 2 seconds)
#define DHT_UPDATE_INTERVAL_MS 2000

// Weight update interval (every 500ms for responsive readings)
#define WEIGHT_UPDATE_INTERVAL_MS 500

// BLE notification interval (every 1 second)
#define BLE_NOTIFY_INTERVAL_MS 1000

// =============================================================================
// VITAL SIGN RANGES (for dogs)
// =============================================================================

// Heart Rate (typical dog range: 60-120 bpm)
#define HR_MIN_BPM 40
#define HR_MAX_BPM 180
#define HR_FREQ_MIN_HZ 0.67f   // 40 bpm
#define HR_FREQ_MAX_HZ 3.0f    // 180 bpm

// Respiratory Rate (typical dog range: 10-40 breaths/min)
#define RR_MIN_BPM 5
#define RR_MAX_BPM 60
#define RR_FREQ_MIN_HZ 0.083f  // 5 breaths/min
#define RR_FREQ_MAX_HZ 1.0f    // 60 breaths/min

// Weight (designed for dogs up to 120 lbs)
#define WEIGHT_MAX_LBS 150.0f
#define WEIGHT_CALIBRATION_FACTOR 420.0f  // Adjust during calibration

// Temperature (normal dog body temp: 100-102.5°F)
#define TEMP_MIN_F 95.0f
#define TEMP_MAX_F 110.0f

// =============================================================================
// BLE UUIDs
// =============================================================================

// Custom AnimalDot Service UUID
#define ANIMALDOT_SERVICE_UUID        "12345678-1234-5678-1234-56789abcdef0"

// Characteristic UUIDs
#define HEART_RATE_CHAR_UUID          "12345678-1234-5678-1234-56789abcdef1"
#define RESP_RATE_CHAR_UUID           "12345678-1234-5678-1234-56789abcdef2"
#define TEMPERATURE_CHAR_UUID         "12345678-1234-5678-1234-56789abcdef3"
#define HUMIDITY_CHAR_UUID            "12345678-1234-5678-1234-56789abcdef4"
#define WEIGHT_CHAR_UUID              "12345678-1234-5678-1234-56789abcdef5"
#define DEVICE_STATUS_CHAR_UUID       "12345678-1234-5678-1234-56789abcdef6"
#define CALIBRATION_CHAR_UUID         "12345678-1234-5678-1234-56789abcdef7"
#define RAW_GEOPHONE_CHAR_UUID        "12345678-1234-5678-1234-56789abcdef8"

// Standard Heart Rate Service (for compatibility)
#define HEART_RATE_SERVICE_UUID       "180D"
#define HEART_RATE_MEASUREMENT_UUID   "2A37"

// =============================================================================
// SIGNAL PROCESSING
// =============================================================================

// Butterworth filter coefficients for bandpass filtering
// These are pre-calculated for the specific frequency ranges

// Number of samples for moving average
#define MOVING_AVG_WINDOW 10

// Peak detection threshold (as fraction of signal range)
#define PEAK_THRESHOLD_FRACTION 0.6f

// Minimum time between peaks (to avoid false positives)
#define MIN_PEAK_INTERVAL_MS 200  // Max 300 bpm

// Signal quality thresholds
#define SIGNAL_QUALITY_GOOD 0.7f
#define SIGNAL_QUALITY_FAIR 0.4f

// =============================================================================
// ERROR CODES
// =============================================================================

#define ERR_NONE              0x00
#define ERR_DHT_FAIL          0x01
#define ERR_LOADCELL_FAIL     0x02
#define ERR_GEOPHONE_FAIL     0x04
#define ERR_BLE_FAIL          0x08
#define ERR_CALIBRATION_FAIL  0x10

#endif // ANIMALDOT_CONFIG_H
