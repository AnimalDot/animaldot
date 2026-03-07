/**
 * @file ble_manager.h
 * @brief AnimalDot Smart Bed — BLE Manager
 *
 * Handles Bluetooth Low Energy communication for streaming
 * vital signs and sensor data to the mobile application.
 *
 * Services advertised:
 *   - Custom AnimalDot service  (sensor data + calibration)
 *   - Standard Heart Rate 0x180D (compatibility with generic HR apps)
 *
 * Uses NimBLE for reduced flash footprint and improved stability.
 *
 * @version 2.0.0
 */

#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include <cstdint>

/* Forward declarations when Arduino/NimBLE are not in include path (e.g. clangd) */
class NimBLEServer;
class NimBLEService;
class NimBLECharacteristic;
class NimBLEServerCallbacks;
class NimBLECharacteristicCallbacks;
struct VitalSigns;
struct EnvironmentData;
struct WeightData;
struct SensorStatus;

/* Real includes for PlatformIO (GCC); stubs when clangd parses (ANIMALDOT_CLANGD or __clang__). */
#if !defined(ANIMALDOT_CLANGD) && !defined(__clang__)
#  include <Arduino.h>
#  include <NimBLEDevice.h>
#  include "sensor_manager.h"
#  define BLE_MANAGER_OVERRIDE override
#else
#  define BLE_MANAGER_OVERRIDE
   /* Stub base classes for clangd (real defs from NimBLEDevice.h when building). */
   class NimBLEServerCallbacks {
   public:
       virtual ~NimBLEServerCallbacks() = default;
       virtual void onConnect(NimBLEServer* /*pServer*/) {}
       virtual void onDisconnect(NimBLEServer* /*pServer*/) {}
   };
   class NimBLECharacteristicCallbacks {
   public:
       virtual ~NimBLECharacteristicCallbacks() = default;
       virtual void onWrite(NimBLECharacteristic* /*pCharacteristic*/) {}
   };
#endif

/* ---- Calibration Command --------------------------------------------- */

/**
 * @brief Over-the-air calibration command received from the mobile app.
 *
 * commandType:
 *   0x01 — Tare weight (value ignored)
 *   0x02 — Temperature offset (°C)
 *   0x03 — Weight calibration factor
 */
struct CalibrationCommand {
    uint8_t commandType;
    float   value;
};

/* ---- Connection Callback Interface ----------------------------------- */

/**
 * @brief Abstract callback for BLE connection state changes.
 */
class BLEConnectionCallbacks {
public:
    virtual ~BLEConnectionCallbacks() = default;
    virtual void onConnect()    = 0;
    virtual void onDisconnect() = 0;
};

/* ---- Class ----------------------------------------------------------- */

class BLEManager : public NimBLEServerCallbacks,
                   public NimBLECharacteristicCallbacks {
public:
    BLEManager();

    /**
     * @brief Initialise NimBLE, create services, start advertising.
     * @return true on success.
     */
    bool begin();

    /** @name Data notification helpers (no-op when no client connected). */
    ///@{
    void updateVitals(const VitalSigns& vitals);
    void updateEnvironment(const EnvironmentData& env);
    void updateWeight(const WeightData& weight);
    void updateStatus(const SensorStatus& status);
    void streamRawGeophone(int16_t sample);
    ///@}

    /** @name Connection state */
    ///@{
    bool     isConnected();
    uint32_t getConnectionCount();
    ///@}

    /** @brief Register callback for connect / disconnect events. */
    void setConnectionCallback(BLEConnectionCallbacks* cb);

    /** @name Calibration commands from mobile app */
    ///@{
    bool               hasCalibrationCommand();
    CalibrationCommand getCalibrationCommand();
    ///@}

private:
    NimBLEServer*  _pServer;
    NimBLEService* _pAnimalDotSvc;
    NimBLEService* _pHeartRateSvc;

    /* Characteristics */
    NimBLECharacteristic* _pHRChar;
    NimBLECharacteristic* _pRRChar;
    NimBLECharacteristic* _pTempChar;
    NimBLECharacteristic* _pHumChar;
    NimBLECharacteristic* _pWeightChar;
    NimBLECharacteristic* _pStatusChar;
    NimBLECharacteristic* _pCalChar;
    NimBLECharacteristic* _pRawGeoChar;
    NimBLECharacteristic* _pStdHRChar;

    /* State */
    uint32_t              _connectedClients;
    BLEConnectionCallbacks* _connectionCb;
    CalibrationCommand    _pendingCmd;
    bool                  _hasPendingCmd;

    /* NimBLE callback overrides */
    void onConnect(NimBLEServer* s)    BLE_MANAGER_OVERRIDE;
    void onDisconnect(NimBLEServer* s) BLE_MANAGER_OVERRIDE;
    void onWrite(NimBLECharacteristic* c) BLE_MANAGER_OVERRIDE;

    /* Internal */
    void _createServices();
    void _startAdvertising();
};

#endif /* BLE_MANAGER_H */
