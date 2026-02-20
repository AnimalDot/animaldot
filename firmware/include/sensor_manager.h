/**
 * AnimalDot Smart Bed - Sensor Manager
 * 
 * Manages all sensor interfaces including DHT22 (temp/humidity),
 * FX29 load cells (weight), and geophone (vital signs).
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include "config.h"
#include "signal_processor.h"

// Sensor status flags
struct SensorStatus {
    bool dhtConnected;
    bool loadCellsConnected;
    bool geophoneConnected;
    uint8_t errorCode;
    unsigned long lastUpdate;
};

// Environmental data
struct EnvironmentData {
    float temperature;      // Celsius
    float temperatureF;     // Fahrenheit
    float humidity;         // Percentage
    bool isValid;
    unsigned long timestamp;
};

// Weight data
struct WeightData {
    float totalWeight;      // Pounds
    float loadCell1;        // Individual cell readings
    float loadCell2;
    float loadCell3;
    float loadCell4;
    float loadCell5;
    bool isValid;
    bool isStable;
    unsigned long timestamp;
};

// Combined sensor data
struct SensorData {
    VitalSigns vitals;
    EnvironmentData environment;
    WeightData weight;
    SensorStatus status;
};

class SensorManager {
public:
    SensorManager();
    
    // Initialize all sensors
    bool begin();
    
    // Update functions (call in main loop)
    void updateGeophone();      // Call at high frequency (200 Hz)
    void updateEnvironment();   // Call every 2 seconds
    void updateWeight();        // Call every 500ms
    
    // Get latest data
    SensorData getData();
    VitalSigns getVitalSigns();
    EnvironmentData getEnvironment();
    WeightData getWeight();
    SensorStatus getStatus();
    
    // Calibration functions
    void tareWeight();
    void setWeightCalibrationFactor(float factor);
    void setTemperatureOffset(float offset);
    
    // Raw data access (for debugging/streaming)
    int16_t getRawGeophoneSample();
    
private:
    // Sensors
    DHT dht;
    SignalProcessor signalProcessor;
    
    // Calibration values
    float weightCalibrationFactor;
    float temperatureOffset;
    float weightTare;
    
    // Timing
    unsigned long lastDhtUpdate;
    unsigned long lastWeightUpdate;
    unsigned long lastGeophoneUpdate;
    
    // Latest readings
    EnvironmentData latestEnvironment;
    WeightData latestWeight;
    SensorStatus sensorStatus;
    
    // I2C helper functions for FX29 load cells
    bool readFX29(uint8_t address, float& force);
    bool initFX29(uint8_t address);
    
    // Stability detection for weight
    float weightHistory[10];
    uint8_t weightHistoryIndex;
    bool checkWeightStability();
};

#endif // SENSOR_MANAGER_H
