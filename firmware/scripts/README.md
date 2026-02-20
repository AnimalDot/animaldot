# Firmware scripts

## generate_sketch_compile_flags.ps1

Generates `compile_flags.txt` in each sketch folder under `firmware/sketches/` so **clangd** can find `Arduino.h` and BLE headers when you open `.ino` files.

**When to run:** After installing PlatformIO and running a build from `firmware` at least once (`pio run`). If your PlatformIO home is not `%USERPROFILE%\.platformio`, set `PLATFORMIO_HOME_DIR` before running.

**How to run (from repo root or from `firmware`):**
```powershell
.\firmware\scripts\generate_sketch_compile_flags.ps1
# or
.\scripts\generate_sketch_compile_flags.ps1
```

If the script fails with "Arduino ESP32 core not found", install PlatformIO (e.g. via VS Code/Cursor extension or `pip install platformio`) and run `pio run` from the `firmware` folder once to pull the framework, then run this script again.
