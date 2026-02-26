/**
 * @file wifi_manager.cpp
 * @brief AnimalDot Smart Bed — WiFi Manager Implementation
 *
 * STA connection with timeout → captive-portal AP fallback.
 * After the user submits credentials via the web form the device
 * stores them in NVS (handled by the caller) and reboots.
 */

#include "wifi_manager.h"

/* ---- Captive-portal HTML (minified) ---------------------------------- */

const char* WifiManager::_portalHTML = R"rawhtml(
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnimalDot WiFi Setup</title>
<style>
  body{font-family:sans-serif;background:#1a1a2e;color:#eee;display:flex;
       justify-content:center;align-items:center;height:100vh;margin:0}
  .card{background:#16213e;padding:2rem;border-radius:12px;width:320px;
        box-shadow:0 4px 20px rgba(0,0,0,.4)}
  h2{text-align:center;color:#00d4ff;margin-bottom:1.5rem}
  input{width:100%;padding:.7rem;margin:.4rem 0 1rem;border:1px solid #333;
        border-radius:6px;background:#0f3460;color:#eee;box-sizing:border-box}
  button{width:100%;padding:.8rem;background:#00d4ff;color:#000;border:none;
         border-radius:6px;font-weight:bold;cursor:pointer;font-size:1rem}
  button:hover{background:#00b4d8}
  .footer{text-align:center;margin-top:1rem;font-size:.75rem;color:#555}
</style></head><body>
<div class="card">
  <h2>&#128062; AnimalDot Setup</h2>
  <form action="/save" method="POST">
    <label>WiFi Network</label>
    <input name="ssid" placeholder="SSID" required>
    <label>WiFi Password</label>
    <input name="pass" type="password" placeholder="Password">
    <label>MQTT Broker</label>
    <input name="mqtt" placeholder="sensorweb.us" value="sensorweb.us">
    <label>Organization Name</label>
    <input name="org" placeholder="AnimalDot" value="AnimalDot">
    <button type="submit">Save &amp; Connect</button>
  </form>
  <p class="footer">AnimalDot Smart Bed v2.0</p>
</div></body></html>
)rawhtml";

/* ---- Constructor ----------------------------------------------------- */

WifiManager::WifiManager()
    : _mode(WifiMode::DISCONNECTED),
      _callback(nullptr),
      _webServer(nullptr),
      _dnsServer(nullptr),
      _lastReconnectAttempt(0),
      _retryCount(0) {}

WifiManager::~WifiManager() {
    delete _webServer;
    delete _dnsServer;
}

/* ---- Public API ------------------------------------------------------ */

bool WifiManager::begin(const String& ssid, const String& pass) {
    _ssid = ssid;
    _pass = pass;

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);

    if (_ssid.length() == 0) {
        Serial.println("[WiFi] No stored SSID — starting AP");
        startAP();
        return false;
    }

    /* Attempt STA connection with timeout */
    Serial.printf("[WiFi] Connecting to \"%s\"...\n", _ssid.c_str());
    _setMode(WifiMode::CONNECTING);
    WiFi.begin(_ssid.c_str(), _pass.c_str());

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > WIFI_STA_CONNECT_TIMEOUT_MS) {
            Serial.println("[WiFi] STA timeout — starting AP");
            WiFi.disconnect(true);
            startAP();
            return false;
        }
        delay(250);
        Serial.print(".");
    }

    Serial.printf("\n[WiFi] Connected — IP %s\n",
                  WiFi.localIP().toString().c_str());
    _setMode(WifiMode::STATION);
    _retryCount = 0;
    return true;
}

void WifiManager::loop() {
    /* AP mode: service DNS + web server */
    if (_mode == WifiMode::ACCESS_POINT) {
        if (_dnsServer)  _dnsServer->processNextRequest();
        if (_webServer)  _webServer->handleClient();
        return;
    }

    /* STA mode: monitor connection health */
    if (_mode == WifiMode::STATION || _mode == WifiMode::CONNECTING) {
        if (WiFi.status() == WL_CONNECTED) {
            if (_mode != WifiMode::STATION) _setMode(WifiMode::STATION);
            _retryCount = 0;
            return;
        }

        /* Lost connection — attempt periodic reconnect */
        if (millis() - _lastReconnectAttempt > WIFI_RECONNECT_INTERVAL_MS) {
            _lastReconnectAttempt = millis();
            _retryCount++;
            Serial.printf("[WiFi] Reconnect attempt %d/%d\n",
                          _retryCount, WIFI_MAX_RETRY);
            WiFi.disconnect();
            WiFi.begin(_ssid.c_str(), _pass.c_str());
            _setMode(WifiMode::CONNECTING);

            if (_retryCount >= WIFI_MAX_RETRY) {
                Serial.println("[WiFi] Max retries — falling back to AP");
                startAP();
            }
        }
    }
}

WifiMode WifiManager::getMode() const { return _mode; }

bool WifiManager::isConnected() const {
    return _mode == WifiMode::STATION && WiFi.status() == WL_CONNECTED;
}

IPAddress WifiManager::localIP() const { return WiFi.localIP(); }

String WifiManager::macAddress() const { return WiFi.macAddress(); }

String WifiManager::macAddressRaw() const {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    mac.toLowerCase();
    return mac;
}

void WifiManager::onModeChange(WifiEventCallback cb) { _callback = cb; }

void WifiManager::connectSTA(const String& ssid, const String& pass) {
    _ssid = ssid;
    _pass = pass;
    _retryCount = 0;
    WiFi.disconnect(true);
    delay(200);
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid.c_str(), _pass.c_str());
    _setMode(WifiMode::CONNECTING);
}

void WifiManager::startAP() {
    WiFi.disconnect(true);
    delay(200);
    WiFi.mode(WIFI_AP);
    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);

    Serial.printf("[WiFi] AP started — SSID: %s  IP: %s\n",
                  WIFI_AP_SSID,
                  WiFi.softAPIP().toString().c_str());

    _setupAPServer();
    _setMode(WifiMode::ACCESS_POINT);
}

/* ---- Private --------------------------------------------------------- */

void WifiManager::_setMode(WifiMode m) {
    if (m == _mode) return;
    _mode = m;
    if (_callback) _callback(m);
}

void WifiManager::_setupAPServer() {
    delete _dnsServer;
    delete _webServer;
    _dnsServer = new DNSServer();
    _webServer = new WebServer(80);

    /* Redirect every DNS query to our AP IP (captive portal) */
    _dnsServer->start(53, "*", WiFi.softAPIP());

    _webServer->on("/",     HTTP_GET,  [this]() { _handleRoot(); });
    _webServer->on("/save", HTTP_POST, [this]() { _handleSave(); });
    _webServer->onNotFound(            [this]() { _handleNotFound(); });
    _webServer->begin();
    Serial.println("[WiFi] Web server started on port 80");
}

void WifiManager::_handleRoot() {
    _webServer->send(200, "text/html", _portalHTML);
}

void WifiManager::_handleSave() {
    String ssid = _webServer->arg("ssid");
    String pass = _webServer->arg("pass");
    /* mqtt and org are also submitted — the caller reads them via
       _webServer->arg() before the reboot, or we can stash them. */

    if (ssid.length() == 0) {
        _webServer->send(400, "text/plain", "SSID is required.");
        return;
    }

    String html = "<html><body style='background:#1a1a2e;color:#eee;"
                  "text-align:center;padding:3rem;font-family:sans-serif'>"
                  "<h2>Saved! Rebooting...</h2>"
                  "<p>Connect to your WiFi network to reach the device.</p>"
                  "</body></html>";
    _webServer->send(200, "text/html", html);

    /* Give the browser a moment to receive the response */
    delay(1500);

    /* Store credentials (NVS persistence is the caller's responsibility;
       here we simply attempt STA and reboot on success). */
    _ssid = ssid;
    _pass = pass;

    Serial.printf("[WiFi] New creds received — SSID: %s\n", ssid.c_str());
    ESP.restart();
}

void WifiManager::_handleNotFound() {
    /* Captive-portal redirect */
    _webServer->sendHeader("Location", "http://192.168.4.1/", true);
    _webServer->send(302, "text/plain", "");
}
