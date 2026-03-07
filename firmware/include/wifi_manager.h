/**
 * @file wifi_manager.h
 * @brief AnimalDot Smart Bed — WiFi Manager
 *
 * Provides automatic WiFi station connection with fallback to a
 * captive-portal access point for first-time configuration.
 * Credentials are persisted in NVS so the device reconnects
 * automatically after power cycles.
 *
 * Inspired by the BedDot M5_ADXL_ESP_FRAMEWORK WiFi auto-config.
 *
 * @version 2.0.0
 */

#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <cstdint>

#if defined(ARDUINO) && defined(ARDUINO_ARCH_ESP32)
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#else
/* Forward declarations when Arduino/ESP32 not in include path (e.g. IDE/clangd) */
class String;
class IPAddress;
class WebServer;
class DNSServer;
#endif

/**
 * @brief WiFi operating mode reported by WifiManager.
 */
enum class WifiMode : uint8_t {
    DISCONNECTED = 0,  /**< No connection, no AP running         */
    STATION,           /**< Connected to an external AP          */
    ACCESS_POINT,      /**< Running captive-portal AP            */
    CONNECTING         /**< STA connection attempt in progress   */
};

/**
 * @brief Callback signature for WiFi state transitions.
 */
using WifiEventCallback = void (*)(WifiMode newMode);

/**
 * @brief Manages WiFi STA + soft-AP with captive portal.
 *
 * Typical usage:
 *   1. Call begin() in setup().
 *   2. Call loop() every iteration.
 *   3. If stored credentials exist the manager tries STA first.
 *   4. On failure (or if no creds) it opens an AP with a config page.
 *   5. Once the user submits new creds the device reboots into STA.
 */
class WifiManager {
public:
    WifiManager();
    ~WifiManager();

    /**
     * @brief Initialise WiFi — attempt STA, fall back to AP.
     * @param ssid  Pre-loaded SSID (from NVS). Empty = skip STA.
     * @param pass  Pre-loaded password.
     * @return true if STA connected; false if AP was started.
     */
    bool begin(const String& ssid = "", const String& pass = "");

    /**
     * @brief Service DNS and web server in AP mode; check STA health.
     * Must be called from the main loop.
     */
    void loop();

    /** @brief Current operating mode. */
    WifiMode getMode() const;

    /** @brief true when STA is fully connected. */
    bool isConnected() const;

    /** @brief STA local IP (valid only when isConnected()). */
    IPAddress localIP() const;

    /** @brief Device MAC as colon-separated string "AA:BB:CC:DD:EE:FF". */
    String macAddress() const;

    /** @brief Device MAC as lowercase hex without colons "aabbccddeeff". */
    String macAddressRaw() const;

    /** @brief Register a callback for mode changes. */
    void onModeChange(WifiEventCallback cb);

    /**
     * @brief Force a reconnect attempt with new credentials.
     * On success, stores them in NVS and reboots.
     */
    void connectSTA(const String& ssid, const String& pass);

    /** @brief Disconnect STA and start the captive-portal AP. */
    void startAP();

private:
    WifiMode         _mode;
    WifiEventCallback _callback;
    WebServer*       _webServer;
    DNSServer*       _dnsServer;

    String _ssid;
    String _pass;

    unsigned long _lastReconnectAttempt;
    uint8_t       _retryCount;

    /* Captive-portal handlers */
    void _setupAPServer();
    void _handleRoot();
    void _handleSave();
    void _handleNotFound();
    void _setMode(WifiMode m);

    /* HTML page served by AP */
    static const char* _portalHTML;
};

#endif /* WIFI_MANAGER_H */
