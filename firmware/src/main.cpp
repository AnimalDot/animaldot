/**
 * AnimalDot Smart Bed - Main Firmware
 * 
 * ESP32 firmware for passive vital sign monitoring of pets.
 * Integrates geophone (HR/RR), DHT22 (temp/humidity), and 
 * FX29 load cells (weight) with BLE data streaming.
 * 
 * University of Georgia - Capstone Design Project
 * Team: Bryce, Caleb, Colby, Grant, Jalen, Naman
 * Advisors: Dr. Peter Kner, Dr. Jorge Rodriguez
 * Sponsors: Dr. Ben Brainard, Dr. Wenzhan Song
 */

#include <Arduino.h>
#include "config.h"
#include "sensor_manager.h"
#include "ble_manager.h"

// Global objects
SensorManager sensorManager;
BLEManager bleManager;

// Timing variables
unsigned long lastBLENotify = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastLedToggle = 0;
bool ledState = false;

// Connection callback class
class MyConnectionCallbacks : public BLEConnectionCallbacks {
public:
    void onConnect() override {
        Serial.println("[Main] BLE client connected!");
        // Fast LED blink when connected
    }
    
    void onDisconnect() override {
        Serial.println("[Main] BLE client disconnected");
    }
};

MyConnectionCallbacks connectionCallbacks;

void setup() {
    // Initialize serial for debugging
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    Serial.println("========================================");
    Serial.println("  AnimalDot Smart Bed - Starting Up");
    Serial.printf("  Firmware Version: %s\n", FIRMWARE_VERSION);
    Serial.println("========================================");
    Serial.println();
    
    // Initialize status LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);  // LED on during init
    
    // Initialize sensor manager
    Serial.println("[Main] Initializing sensors...");
    if (!sensorManager.begin()) {
        Serial.println("[Main] Warning: Some sensors failed to initialize");
    }
    
    // Initialize BLE manager
    Serial.println("[Main] Initializing BLE...");
    if (!bleManager.begin()) {
        Serial.println("[Main] Error: BLE initialization failed!");
        // Continue anyway - sensors still work
    }
    
    // Set BLE connection callback
    bleManager.setConnectionCallback(&connectionCallbacks);
    
    // Initial weight tare (bed should be empty at startup)
    Serial.println("[Main] Performing initial weight tare...");
    delay(1000);
    sensorManager.tareWeight();
    
    digitalWrite(LED_PIN, LOW);  // LED off, init complete
    
    Serial.println();
    Serial.println("[Main] Initialization complete!");
    Serial.println("[Main] Waiting for connections...");
    Serial.println();
}

void loop() {
    unsigned long currentTime = millis();
    
    // =========================================
    // HIGH PRIORITY: Geophone sampling (200 Hz)
    // =========================================
    sensorManager.updateGeophone();
    
    // =========================================
    // MEDIUM PRIORITY: Environmental sensors
    // =========================================
    sensorManager.updateEnvironment();
    
    // =========================================
    // MEDIUM PRIORITY: Weight sensors
    // =========================================
    sensorManager.updateWeight();
    
    // =========================================
    // BLE NOTIFICATIONS (every 1 second)
    // =========================================
    if (currentTime - lastBLENotify >= BLE_NOTIFY_INTERVAL_MS) {
        lastBLENotify = currentTime;
        
        // Get all sensor data
        SensorData data = sensorManager.getData();
        
        // Send to connected BLE clients
        bleManager.updateVitals(data.vitals);
        bleManager.updateEnvironment(data.environment);
        bleManager.updateWeight(data.weight);
        bleManager.updateStatus(data.status);
    }
    
    // =========================================
    // CALIBRATION COMMAND HANDLING
    // =========================================
    if (bleManager.hasCalibrationCommand()) {
        CalibrationCommand cmd = bleManager.getCalibrationCommand();
        
        switch (cmd.commandType) {
            case 0x01:  // Tare weight
                Serial.println("[Main] Executing tare command");
                sensorManager.tareWeight();
                break;
                
            case 0x02:  // Temperature offset
                Serial.printf("[Main] Setting temperature offset to %.2f\n", cmd.value);
                sensorManager.setTemperatureOffset(cmd.value);
                break;
                
            case 0x03:  // Weight calibration factor
                Serial.printf("[Main] Setting weight calibration factor to %.2f\n", cmd.value);
                sensorManager.setWeightCalibrationFactor(cmd.value);
                break;
                
            default:
                Serial.printf("[Main] Unknown calibration command: %d\n", cmd.commandType);
        }
    }
    
    // =========================================
    // STATUS LED (heartbeat)
    // =========================================
    unsigned long ledInterval = bleManager.isConnected() ? 500 : 2000;
    if (currentTime - lastLedToggle >= ledInterval) {
        lastLedToggle = currentTime;
        ledState = !ledState;
        digitalWrite(LED_PIN, ledState);
    }
    
    // =========================================
    // DEBUG OUTPUT (every 5 seconds)
    // =========================================
    if (currentTime - lastStatusPrint >= 5000) {
        lastStatusPrint = currentTime;
        
        SensorData data = sensorManager.getData();
        
        Serial.println("--- AnimalDot Status ---");
        Serial.printf("BLE Clients: %d\n", bleManager.getConnectionCount());
        Serial.printf("Heart Rate: %.0f bpm (quality: %.0f%%)\n", 
                     data.vitals.heartRate, data.vitals.signalQuality * 100);
        Serial.printf("Resp Rate: %.0f breaths/min\n", data.vitals.respiratoryRate);
        Serial.printf("Temperature: %.1f°F (%.1f°C)\n", 
                     data.environment.temperatureF, data.environment.temperature);
        Serial.printf("Humidity: %.1f%%\n", data.environment.humidity);
        Serial.printf("Weight: %.1f lbs (stable: %s)\n", 
                     data.weight.totalWeight, 
                     data.weight.isStable ? "yes" : "no");
        Serial.printf("Sensors: DHT=%s, LoadCell=%s, Geo=%s\n",
                     data.status.dhtConnected ? "OK" : "FAIL",
                     data.status.loadCellsConnected ? "OK" : "FAIL",
                     data.status.geophoneConnected ? "OK" : "FAIL");
        Serial.println("------------------------");
        Serial.println();
    }
    
    // Small delay to prevent watchdog issues
    // The ESP32 needs some idle time
    delayMicroseconds(100);
}
