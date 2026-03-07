/**
 * @file mqtt_manager.h
 * @brief AnimalDot Smart Bed — MQTT Manager
 *
 * Publishes vital-sign and sensor data to an MQTT broker using the
 * BedDot-compatible binary payload format.  The payload layout is:
 *
 *   Bytes  1– 6 : MAC address (binary)
 *   Bytes  7– 8 : item count  (uint16 LE)
 *   Bytes  9–16 : timestamp µs (uint64 LE)
 *   Bytes 17–20 : interval µs  (uint32 LE)
 *   Bytes 21+   : data items   (int32 LE each)
 *
 * Topic pattern:  /<org>/<mac_hex>/<measurement>
 * Example:        /AnimalDot/aabbccddeeff/heartrate
 *
 * @see 03_API_D__Interacting_with_the_Backend_via_MQTT_docx.pdf
 * @version 2.0.0
 */

#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

/* Forward declarations so the header parses when Arduino libs are not in include path (e.g. clangd) */
struct VitalSigns;
struct EnvironmentData;
struct WeightData;

#include <cstdint>

#if !defined(ANIMALDOT_CLANGD) && !defined(__clang__)
#  include <Arduino.h>
#  include <WString.h>
#  include <WiFi.h>
#  include <PubSubClient.h>
#  include "sensor_manager.h"
#else
   /* Stub types for clangd (real defs from Arduino/WiFi/PubSubClient when building). */
   class String {
   public:
       String() = default;
       String(const char*) {}
   };
   class WiFiClient {};
   class PubSubClient {
   public:
       bool connected() const { return false; }
   };
#endif

/**
 * @brief MQTT connection state.
 */
enum class MqttState : uint8_t {
    DISCONNECTED = 0,
    CONNECTING,
    CONNECTED,
    ERROR
};

/**
 * @brief Publishes AnimalDot sensor data over MQTT.
 *
 * Typical usage:
 *   1. Call begin() after WiFi is connected.
 *   2. Call loop() every main-loop iteration to maintain the connection.
 *   3. Call publishVitals() / publishEnvironment() / publishWeight()
 *      at the desired cadence (e.g. every MQTT_PUBLISH_INTERVAL_MS).
 */
class MqttManager {
public:
    MqttManager();

    /**
     * @brief Initialise the MQTT client.
     * @param host     Broker hostname or IP.
     * @param port     Broker port (default 1883).
     * @param org      Organisation name for topic prefix.
     * @param macRaw   Device MAC as lowercase hex without colons.
     * @return true on successful first connect; false otherwise.
     */
    bool begin(const String& host, uint16_t port,
               const String& org, const String& macRaw);

    /**
     * @brief Service the MQTT client (keep-alive, reconnect).
     * Call from main loop.
     */
    void loop();

    /** @brief Current connection state. */
    MqttState getState() const;

    /** @brief true when the broker connection is active. */
    bool isConnected() const;

    /* ---------------------------------------------------------------
     * Publishing helpers — each builds a BedDot-format binary payload.
     * --------------------------------------------------------------- */

    /**
     * @brief Publish heart rate (bpm × 10) and respiratory rate (brpm × 10).
     */
    bool publishVitals(const VitalSigns& vitals);

    /**
     * @brief Publish temperature (°F × 10) and humidity (% × 10).
     */
    bool publishEnvironment(const EnvironmentData& env);

    /**
     * @brief Publish total weight (lbs × 10).
     */
    bool publishWeight(const WeightData& weight);

    /**
     * @brief Publish a single named measurement value.
     * @param measurement  Topic suffix, e.g. "spo2".
     * @param value        Signed 32-bit value.
     */
    bool publishRaw(const char* measurement, int32_t value);

private:
    WiFiClient   _wifiClient;
    mutable PubSubClient _mqttClient;  /* mutable: PubSubClient::connected() is non-const */
    MqttState    _state;

    String _host;
    uint16_t _port;
    String _org;
    String _macRaw;
    uint8_t _macBytes[6];

    unsigned long _lastReconnectAttempt;

    /**
     * @brief Build the fixed 20-byte header for a BedDot payload.
     * @param buf           Output buffer (must be ≥ 20 + 4*itemCount).
     * @param itemCount     Number of int32 data items to follow.
     * @param timestampUs   Epoch timestamp in microseconds.
     * @param intervalUs    Interval between items (µs).
     * @return Number of bytes written (always 20).
     */
    size_t _buildHeader(uint8_t* buf, uint16_t itemCount,
                        uint64_t timestampUs, uint32_t intervalUs);

    /**
     * @brief Append one int32 data item (LE) to the payload.
     */
    void _appendItem(uint8_t* buf, size_t offset, int32_t value);

    /**
     * @brief Publish a complete payload to /<org>/<mac>/<measurement>.
     */
    bool _publish(const char* measurement,
                  const uint8_t* payload, size_t len);

    /** @brief Attempt broker reconnection. */
    bool _reconnect();

    /** @brief Parse a MAC string "aa:bb:cc:dd:ee:ff" into 6 bytes. */
    void _parseMac(const String& mac);
};

#endif /* MQTT_MANAGER_H */
