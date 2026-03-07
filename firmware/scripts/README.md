# Firmware scripts

## fix_compiledb_for_clangd.py

Makes `compile_commands.json` clang-friendly so **clangd** does not report "Unknown argument '-mlongcalls'" etc. Replaces GCC-only flags with clang equivalents (or removes them).

**When to run:** After `pio run -t compiledb` (from the `firmware` folder).

```bash
cd firmware
pio run -t compiledb
python scripts/fix_compiledb_for_clangd.py
```

Then restart the clangd language server (Ctrl+Shift+P → "clangd: Restart language server") so it picks up the updated file.

## generate_sketch_compile_flags.ps1

Generates `compile_flags.txt` in each sketch folder under `firmware/sketches/` so **clangd** can find `Arduino.h` and BLE headers when you open `.ino` files.

**When to run:** After installing PlatformIO and running a build from `firmware` at least once (`pio run`). If your PlatformIO home is not `%USERPROFILE%\.platformio`, set `PLATFORMIO_HOME_DIR` before running.

**How to run:**

- **Windows (PowerShell):** from repo root or `firmware`:
  ```powershell
  .\firmware\scripts\generate_sketch_compile_flags.ps1
  ```
- **WSL / Linux / macOS (bash):** from repo root or `firmware`:
  ```bash
  chmod +x scripts/generate_sketch_compile_flags.sh   # once
  ./scripts/generate_sketch_compile_flags.sh
  ```

The script writes `compile_flags.txt` into each sketch folder and into **`firmware/`** so that clangd can resolve `Arduino.h`, `WiFiClient`, `PubSubClient`, `DHT` (DHT sensor library), and local headers (`config.h`, `sensor_manager.h`) when you open files under `include/` or `src/`.

If the script fails with "Arduino ESP32 core not found", install PlatformIO (e.g. via VS Code/Cursor extension or `pip install platformio`) and run `pio run` from the `firmware` folder once to pull the framework, then run this script again.
