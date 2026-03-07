# AnimalDot Firmware

ESP32 firmware for the AnimalDot Smart Bed (vitals, sensors, BLE, MQTT).

## Build

```bash
pio run
```

## IDE: Fix "Arduino.h file not found"

The editor (clangd/IntelliSense) needs a compilation database to resolve Arduino/ESP32 headers. Generate it once:

```bash
cd firmware
pio run -t compiledb
```

This creates `compile_commands.json` in the firmware directory. Clangd will use it when you open files under `firmware/`, so `Arduino.h` and other framework headers resolve. Add `firmware/compile_commands.json` to `.gitignore` if you don’t want to commit it.
