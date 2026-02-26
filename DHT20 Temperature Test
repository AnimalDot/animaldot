#include <Wire.h>
#include <Adafruit_AHTX0.h>

#include <WiFi.h>
#include <PubSubClient.h>

// ===================== HOTSPOT WIFI =====================
const char* ssid     = "WiFi Name Here";
const char* password = "WiFi Password Here";

// ===================== MQTT (Mosquitto test broker) =====================
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

const char* MQTT_BROKER = "test.mosquitto.org";
const uint16_t MQTT_PORT = 1883;

const char* TOPIC_TEMP_F = "12340987";
const char* MQTT_CLIENT_ID = "esp32-dht20-12340987";

Adafruit_AHTX0 aht;
#define SDA_PIN 43
#define SCL_PIN 44

// ---- helper: print WiFi status ----
const char* wlStatusToStr(wl_status_t s) {
  switch (s) {
    case WL_NO_SHIELD: return "WL_NO_SHIELD";
    case WL_IDLE_STATUS: return "WL_IDLE_STATUS";
    case WL_NO_SSID_AVAIL: return "WL_NO_SSID_AVAIL (SSID not found)";
    case WL_SCAN_COMPLETED: return "WL_SCAN_COMPLETED";
    case WL_CONNECTED: return "WL_CONNECTED";
    case WL_CONNECT_FAILED: return "WL_CONNECT_FAILED (auth fail?)";
    case WL_CONNECTION_LOST: return "WL_CONNECTION_LOST";
    case WL_DISCONNECTED: return "WL_DISCONNECTED";
    default: return "WL_UNKNOWN";
  }
}

void connectHotspot() {
  WiFi.mode(WIFI_STA);

  // Disable WiFi sleep; helps some hotspots
  WiFi.setSleep(false);

  Serial.println("\n--- WiFi Hotspot Connect ---");
  Serial.print("SSID: "); Serial.println(ssid);

  // Start fresh
  WiFi.disconnect(true, true);
  delay(300);

  // Optional: scan to prove ESP32 can see the hotspot
  Serial.println("Scanning for networks...");
  int n = WiFi.scanNetworks();
  Serial.print("Found "); Serial.print(n); Serial.println(" networks");
  for (int i = 0; i < n; i++) {
    Serial.print("  ");
    Serial.print(WiFi.SSID(i));
    Serial.print("  RSSI=");
    Serial.print(WiFi.RSSI(i));
    Serial.print("  ENC=");
    Serial.println(WiFi.encryptionType(i));
  }
  Serial.println("Scan done.\n");

  Serial.println("Connecting...");
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    Serial.print(" ");
    Serial.println(wlStatusToStr((wl_status_t)WiFi.status()));

    // 20s timeout
    if (millis() - start > 20000) {
      Serial.println("\n❌ WiFi connect timeout.");
      Serial.println("Common causes:");
      Serial.println(" - Hotspot is 5 GHz only (ESP32 needs 2.4 GHz)");
      Serial.println(" - Wrong password / security mismatch");
      Serial.println(" - Hotspot blocks new devices (allow-list / MAC filtering)");
      Serial.println(" - SSID hidden or special characters causing mismatch");
      return;
    }
  }

  Serial.println("\n✅ WiFi connected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
  Serial.print("Gateway: "); Serial.println(WiFi.gatewayIP());
  Serial.print("DNS: "); Serial.println(WiFi.dnsIP());
  Serial.print("RSSI: "); Serial.println(WiFi.RSSI());
}

void mqttEnsureConnected() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqtt.connected()) return;

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);

  Serial.print("MQTT connecting to ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  bool ok = mqtt.connect(MQTT_CLIENT_ID);
  if (ok) {
    Serial.println("✅ MQTT connected!");
  } else {
    Serial.print("❌ MQTT failed, rc=");
    Serial.println(mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  Serial.println("Initializing DHT20 (AHT20 library)...");
  if (!aht.begin()) {
    Serial.println("Could not find DHT20.");
    while (1) delay(10);
  }
  Serial.println("DHT20 Working.");

  connectHotspot();
}

void loop() {
  // If WiFi dropped, try again
  static unsigned long lastWiFiTry = 0;
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiTry > 5000) {
      lastWiFiTry = millis();
      connectHotspot();
    }
    return;
  }

  mqttEnsureConnected();
  mqtt.loop();

  // Publish tempF every 2 seconds if MQTT is connected
  static unsigned long lastPub = 0;
  if (mqtt.connected() && millis() - lastPub > 2000) {
    lastPub = millis();

    sensors_event_t humidity, temp;
    aht.getEvent(&humidity, &temp);

    float tempF = temp.temperature * 9.0f / 5.0f + 32.0f;

    char buf[16];
    dtostrf(tempF, 0, 2, buf);

    Serial.print("Publishing to ");
    Serial.print(TOPIC_TEMP_F);
    Serial.print(": ");
    Serial.print(buf);
    Serial.println(" F");

    mqtt.publish(TOPIC_TEMP_F, buf, true);
  }
}
