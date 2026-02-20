# AnimalDot Arduino sketches

Standalone ESP32 Arduino sketches for testing and calibration. Each sketch lives in a **folder with the same name** as the `.ino` file (required by the Arduino IDE).

- **VitalsAggregator** – HR, temp, weight → single BLE packet
- **AnimalDotVitals** – BLE receiver for vitals
- **CalibrationHelper** – Raw sensor values for calibration
- **ConfigUploader** – BLE config/offsets
- **DiagnosticsLogger** – Sensor diagnostics
- **heart_rate_ble_transmitter** – Heart rate over BLE

**To build:** Open the sketch folder (e.g. `VitalsAggregator`) in Arduino IDE or PlatformIO, not the parent `sketches` folder. The main firmware is in `../src` and built with PlatformIO from the `firmware` root.
