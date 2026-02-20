/**
 * AnimalDot Smart Bed - BLE Manager
 * 
 * Handles Bluetooth Low Energy communication for streaming
 * vital signs and sensor data to the mobile application.
 */

#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include "config.h"
#include "sensor_manager.h"

// Calibration command structure
struct CalibrationCommand {
    uint8_t commandType;    // 0x01 = tare weight, 0x02 = temp offset, 0x03 = weight factor
    float value;
};

// Connection callback interface
class BLEConnectionCallbacks {
public:
    virtual void onConnect() = 0;
    virtual void onDisconnect() = 0;
};

class BLEManager : public NimBLEServerCallbacks, 
                   public NimBLECharacteristicCallbacks {
public:
    BLEManager();
    
    // Initialize BLE
    bool begin();
    
    // Update and notify connected clients
    void updateVitals(const VitalSigns& vitals);
    void updateEnvironment(const EnvironmentData& env);
    void updateWeight(const WeightData& weight);
    void updateStatus(const SensorStatus& status);
    
    // Stream raw geophone data (for debugging)
    void streamRawGeophone(int16_t sample);
    
    // Connection state
    bool isConnected();
    uint32_t getConnectionCount();
    
    // Set callback for connection events
    void setConnectionCallback(BLEConnectionCallbacks* callback);
    
    // Get received calibration command (if any)
    bool hasCalibrationCommand();
    CalibrationCommand getCalibrationCommand();
    
private:
    // NimBLE objects
    NimBLEServer* pServer;
    NimBLEService* pAnimalDotService;
    NimBLEService* pHeartRateService;
    
    // Characteristics
    NimBLECharacteristic* pHeartRateChar;
    NimBLECharacteristic* pRespRateChar;
    NimBLECharacteristic* pTemperatureChar;
    NimBLECharacteristic* pHumidityChar;
    NimBLECharacteristic* pWeightChar;
    NimBLECharacteristic* pStatusChar;
    NimBLECharacteristic* pCalibrationChar;
    NimBLECharacteristic* pRawGeophoneChar;
    NimBLECharacteristic* pStandardHRChar;
    
    // Connection state
    uint32_t connectedClients;
    BLEConnectionCallbacks* connectionCallback;
    
    // Calibration command buffer
    CalibrationCommand pendingCommand;
    bool hasPendingCommand;
    
    // Callbacks
    void onConnect(NimBLEServer* pServer) override;
    void onDisconnect(NimBLEServer* pServer) override;
    void onWrite(NimBLECharacteristic* pCharacteristic) override;
    
    // Helper functions
    void createServices();
    void startAdvertising();
};

#endif // BLE_MANAGER_H
