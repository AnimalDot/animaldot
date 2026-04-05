# AnimalDot iOS

Native SwiftUI app for passive pet vital-sign monitoring using the BedDot ESP32 geophone sensor.

## Requirements

- Xcode 15 or later
- iOS 16.0+ deployment target
- Swift 5.9+

## Setup

### 1. Open the project

```
open mobile-ios/AnimalDot.xcodeproj
```

### 2. Resolve Swift Package Manager dependencies

Xcode will automatically fetch the CocoaMQTT package on first open. If not:

1. File > Packages > Resolve Package Versions
2. Wait for CocoaMQTT to download and build

Dependencies:
- **CocoaMQTT** (2.1.6+) — MQTT 3.1.1 client ([github.com/emqx/CocoaMQTT](https://github.com/emqx/CocoaMQTT))
- **Accelerate** — built-in Apple framework for DSP
- **Swift Charts** — built-in (iOS 16+)
- **CoreBluetooth** — built-in
- **UserNotifications** — built-in

### 3. Signing for a physical device

1. Select the **AnimalDot** target in Xcode
2. Go to **Signing & Capabilities**
3. Select your **Team** from the dropdown (requires an Apple Developer account, free tier works)
4. Set a unique **Bundle Identifier** if `com.animaldot.app` conflicts (e.g., `com.yourname.animaldot`)
5. Connect your iPhone and select it as the run destination
6. Build and run (Cmd+R)

> Note: Bluetooth features (BLE scanning/connecting) only work on a physical device, not the iOS Simulator.

## Architecture

```
AnimalDot/
  AnimalDotApp.swift        — App entry point, ViewModel lifecycle
  ContentView.swift         — Tab bar (Live, Device, History, Settings)
  Models/
    VitalsData.swift        — SessionRecord, TransportType
  Processing/
    PacketParser.swift      — BedDot 420-byte geophone packet decoder
    SignalProcessor.swift   — DSP pipeline (port of visual_vitals.py)
  Services/
    VitalsTransport.swift   — Protocol for MQTT/BLE transports
    MQTTService.swift       — CocoaMQTT client with auto-reconnect
    BLEService.swift        — CoreBluetooth scan/connect/stream
  ViewModels/
    VitalsViewModel.swift   — @MainActor ObservableObject, central state
  Views/
    LiveMonitorView.swift   — Real-time waveform charts + vital signs
    DeviceSetupView.swift   — MQTT/BLE configuration and connection
    HistoryView.swift       — Past monitoring sessions
    SettingsView.swift      — Alert thresholds, notifications, device info
```

## MQTT Configuration

Default broker: `sensorweb.us:1883`

Topic format: `/sensorweb/{mac}/geophone`

To change the MQTT topic:
1. Open the **Device** tab
2. Select **MQTT** transport
3. Edit the **Host**, **Port**, and **MAC** fields
4. The topic updates automatically: `/sensorweb/{mac}/geophone`
5. Tap **Connect**

The MAC address is the ESP32's WiFi MAC in lowercase hex without separators (e.g., `3030f9723ae8`).

## BLE Configuration

### Finding the BLE characteristic UUID

The BedDot's BLE characteristic UUID for raw geophone data is device-specific. To discover it:

1. Open the **Device** tab
2. Select **BLE** transport
3. Tap **Scan for Devices**
4. Tap your BedDot peripheral to save it
5. Leave the **Char UUID** field empty for initial connection — the app will subscribe to all notify characteristics
6. Use a BLE inspector app (e.g., LightBlue, nRF Connect) to identify the correct characteristic
7. Enter the UUID in the **Char UUID** field for targeted subscriptions

The app auto-reconnects to the last saved peripheral on launch.

## Signal Processing

The DSP pipeline is a direct port of `test/visual_vitals.py`:

- **Sample rate**: 100 Hz
- **Buffer**: 3000 samples (30 seconds)
- **Filters**: 2nd-order Butterworth bandpass (filtfilt, zero-phase)
  - Respiration: 0.1 – 0.5 Hz
  - Heart rate: 0.8 – 2.0 Hz
- **Heart rate**: Autocorrelation with harmonic correction (38–110 BPM), peak-counting fallback
- **Respiration**: Peak detection on filtered signal
- **Smoothing**: 10-sample BPM history, 5-sample RPM history
- **Bed empty**: Detected when signal range < 100

DSP runs every 10 packets (1 second at 100 Hz / 100 samples per packet).

## Packet Format

BedDot geophone packets are 420 bytes (some firmware sends 424):

| Offset | Size | Type | Field |
|--------|------|------|-------|
| 0 | 6 | bytes | MAC address |
| 6 | 2 | uint16 LE | Sample count |
| 8 | 8 | uint64 LE | Timestamp |
| 16 | 4 | uint32 LE | Interval |
| 20 | 400 | 100 x int32 LE | Geophone samples |

## Build

```bash
# Simulator build
xcodebuild -scheme AnimalDot \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

# Device build (requires signing)
xcodebuild -scheme AnimalDot \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  build
```
