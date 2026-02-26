# AnimalDot Smart Bed — Firmware

ESP32 firmware for passive vital-sign monitoring of pets.  
Integrates geophone (HR / RR), DHT22 (temp / humidity), FX29 load cells (weight),
with **BLE**, **WiFi**, and **MQTT** connectivity.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    main.cpp                      │
│  setup() → settings → sensors → BLE → WiFi/MQTT │
│  loop()  → sample → notify → publish → calibrate│
├─────────┬───────────┬──────────┬────────────────┤
│ Sensors │    BLE    │   WiFi   │     MQTT       │
│ Manager │  Manager  │  Manager │    Manager     │
│         │  (NimBLE) │  (STA/AP)│  (PubSubClient)│
├─────────┤           ├──────────┤                │
│ Signal  │           │ Settings │                │
│Processor│           │  (NVS)   │                │
└─────────┴───────────┴──────────┴────────────────┘
```

## Modules

| File | Purpose |
|------|---------|
| `config.h` | Pin defs, timing, vital ranges, UUIDs, MQTT/WiFi defaults, NVS keys |
| `sensor_manager.*` | DHT22 + FX29 load cells + geophone orchestration |
| `signal_processor.*` | DSP pipeline: band-pass → peak-count → smoothing |
| `ble_manager.*` | NimBLE GATT services (custom + standard HR 0x180D) |
| `wifi_manager.*` | STA auto-connect with captive-portal AP fallback |
| `mqtt_manager.*` | BedDot-compatible binary payload publishing |
| `settings_manager.*` | ESP32 NVS persistence for all config & calibration |

## MQTT Protocol (BedDot-compatible)

Topics follow `/<org>/<mac_hex>/<measurement>`.  
Binary payload layout:

| Offset | Field | Size | Encoding |
|--------|-------|------|----------|
| 0 | MAC address | 6 B | binary |
| 6 | Item count | 2 B | uint16 LE |
| 8 | Timestamp | 8 B | uint64 LE (µs) |
| 16 | Interval | 4 B | uint32 LE (µs) |
| 20 | Data items | 4 B × N | int32 LE |

Published measurements:
- `heartrate` — bpm × 10
- `resprate` — breaths/min × 10
- `temperature` — °F × 10
- `humidity` — % × 10
- `weight` — lbs × 10

## Quick Start

```bash
# Install PlatformIO CLI (or use VS Code extension)
pip install platformio

# Build
cd firmware
pio run

# Flash + monitor
pio run -t upload -t monitor
```

## First-Time WiFi Setup

1. Power on the bed. If no WiFi credentials are stored the device
   creates an AP named **AnimalDot-Setup** (password `animaldot123`).
2. Connect to the AP. A captive portal opens automatically.
3. Enter your WiFi SSID, password, MQTT broker, and organization name.
4. Click **Save & Connect**. The device reboots and joins your network.

## Calibration (via BLE)

Send a 5-byte write to the Calibration characteristic:

| Byte 0 | Bytes 1–4 | Action |
|--------|-----------|--------|
| `0x01` | (ignored) | Tare weight |
| `0x02` | float | Set temperature offset (°C) |
| `0x03` | float | Set weight calibration factor |

Calibration values are automatically persisted in NVS.

## Build Targets

| Environment | Board | Notes |
|-------------|-------|-------|
| `esp32dev` | ESP32-DevKitC | Primary target |
| `m5stick` | M5StickC Plus 2 | Optional, adds M5Unified display support |

## Project Structure

```
firmware/
├── include/
│   ├── config.h
│   ├── sensor_manager.h
│   ├── signal_processor.h
│   ├── ble_manager.h
│   ├── wifi_manager.h
│   ├── mqtt_manager.h
│   └── settings_manager.h
├── src/
│   ├── main.cpp
│   ├── sensor_manager.cpp
│   ├── signal_processor.cpp
│   ├── ble_manager.cpp
│   ├── wifi_manager.cpp
│   ├── mqtt_manager.cpp
│   └── settings_manager.cpp
├── sketches/           (standalone test sketches)
├── scripts/            (dev tooling)
├── platformio.ini
└── README.md
```
