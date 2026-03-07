/**
 * @file sensor_manager.h
 * @brief AnimalDot Smart Bed — Sensor Manager
 *
 * Coordinates all sensor interfaces:
 *   - DHT22 (ambient temperature / humidity)
 *   - FX29  load cells × 5 (weight via I2C)
 *   - Geophone analog input (cardiac & respiratory vibrations)
 *   - ADXL355 high-precision accelerometer (optional, SPI)
 *
 * Each sensor has an independent update cadence.  The manager
 * exposes a single getData() snapshot consumed by BLE and MQTT.
 *
 * @version 2.0.0
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <cstdint>

#if !defined(ANIMALDOT_CLANGD) && !defined(__clang__)
#  include <Arduino.h>
#  include <Wire.h>
#  include <DHT.h>
#  include "signal_processor.h"
#else
   /* Stub types for clangd (real defs from Arduino/DHT/signal_processor when building). */
   enum SignalQuality : uint8_t { QUALITY_POOR = 0, QUALITY_FAIR = 1, QUALITY_GOOD = 2 };
   struct VitalSigns {
       float heartRate;
       float respiratoryRate;
       float signalQuality;
       SignalQuality qualityLevel;
       bool isValid;
       unsigned long timestamp;
   };
   class DHT {};
   class SignalProcessor {};
#endif

/* ---- Data Structures ------------------------------------------------- */

/**
 * @brief Bitmask flags for each sensor subsystem.
 */
struct SensorStatus {
    bool     dhtConnected;
    bool     loadCellsConnected;
    bool     geophoneConnected;
    bool     adxl355Connected;       /**< Optional ADXL355 present        */
    uint8_t  errorCode;              /**< Bitmask of ERR_* flags          */
    unsigned long lastUpdate;
};

/**
 * @brief Ambient environment readings from DHT22.
 */
struct EnvironmentData {
    float    temperature;            /**< Celsius                         */
    float    temperatureF;           /**< Fahrenheit                      */
    float    humidity;               /**< Relative %                      */
    bool     isValid;
    unsigned long timestamp;
};

/**
 * @brief Aggregated weight from up to five FX29 load cells.
 */
struct WeightData {
    float    totalWeight;            /**< Pounds                          */
    float    loadCell[5];            /**< Individual cell readings        */
    bool     isValid;
    bool     isStable;               /**< Low variance over recent window */
    unsigned long timestamp;
};

/**
 * @brief Convenience bundle of every sensor reading.
 */
struct SensorData {
    VitalSigns      vitals;
    EnvironmentData environment;
    WeightData      weight;
    SensorStatus    status;
};

/* ---- Class ----------------------------------------------------------- */

class SensorManager {
public:
    SensorManager();

    /**
     * @brief Probe and initialise all connected sensors.
     * @return true if every sensor passed; false if any flagged an error.
     */
    bool begin();

    /** @name Per-sensor update calls (different cadences)
     *  Call these from the main loop at their respective intervals.
     */
    ///@{
    void updateGeophone();           /**< Call at ≥ 200 Hz               */
    void updateEnvironment();        /**< Call every ~2 s                 */
    void updateWeight();             /**< Call every ~500 ms              */
    ///@}

    /** @name Data accessors (thread-safe snapshot) */
    ///@{
    SensorData      getData();
    VitalSigns      getVitalSigns();
    EnvironmentData getEnvironment();
    WeightData      getWeight();
    SensorStatus    getStatus();
    ///@}

    /** @name Calibration */
    ///@{
    void  tareWeight();
    void  setWeightCalibrationFactor(float factor);
    void  setTemperatureOffset(float offset);
    float getWeightCalibrationFactor() const { return _weightCalFactor; }
    float getTemperatureOffset()       const { return _tempOffset; }
    float getWeightTare()              const { return _weightTare; }
    ///@}

    /** @brief Raw 12-bit geophone sample centred around 0. */
    int16_t getRawGeophoneSample();

private:
    DHT              _dht;
    SignalProcessor  _signalProcessor;

    /* Calibration */
    float _weightCalFactor;
    float _tempOffset;
    float _weightTare;

    /* Timing guards */
    unsigned long _lastDhtUpdate;
    unsigned long _lastWeightUpdate;
    unsigned long _lastGeophoneUpdate;

    /* Cached readings */
    EnvironmentData _latestEnv;
    WeightData      _latestWeight;
    SensorStatus    _sensorStatus;

    /* Weight stability window */
    static constexpr uint8_t WEIGHT_HISTORY_LEN = 10;
    float   _weightHistory[WEIGHT_HISTORY_LEN];
    uint8_t _weightHistIdx;
    bool    _checkWeightStability();

    /* FX29 I2C helpers */
    bool _initFX29(uint8_t address);
    bool _readFX29(uint8_t address, float& force);
};

#endif /* SENSOR_MANAGER_H */
