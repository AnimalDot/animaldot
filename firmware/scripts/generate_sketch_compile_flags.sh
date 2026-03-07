#!/usr/bin/env bash
# Generate compile_flags.txt for each sketch and for main firmware so clangd finds Arduino.h, WiFiClient, DHT, etc.
# Run from repo root or firmware: ./scripts/generate_sketch_compile_flags.sh
# Requires PlatformIO and at least one `pio run` from firmware.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIRMWARE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ ! -d "$FIRMWARE_DIR/sketches" ]; then
  FIRMWARE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
SKETCHES_DIR="$FIRMWARE_DIR/sketches"
PIO_HOME="${PLATFORMIO_HOME_DIR:-$HOME/.platformio}"
FRAMEWORK="$PIO_HOME/packages/framework-arduinoespressif32"
CORES_ESP32="$FRAMEWORK/cores/esp32"
LIB_BLE="$FRAMEWORK/libraries/BLE"
LIB_WIFI="$FRAMEWORK/libraries/WiFi/src"

if [ ! -d "$CORES_ESP32" ]; then
  echo "Arduino ESP32 core not found at: $CORES_ESP32"
  echo "Install PlatformIO and run 'pio run' from firmware once, then re-run this script."
  exit 1
fi

COMMON_FLAGS=(-xc++ -std=c++17 -DARDUINO=1 -Wno-unknown-pragmas -I "$CORES_ESP32")
[ -d "$LIB_BLE" ] && COMMON_FLAGS+=(-I "$LIB_BLE")
[ -d "$LIB_WIFI" ] && COMMON_FLAGS+=(-I "$LIB_WIFI")

for dir in "$SKETCHES_DIR"/*/; do
  [ -d "$dir" ] || continue
  printf '%s\n' "${COMMON_FLAGS[@]}" > "$dir/compile_flags.txt"
  echo "Wrote $dir/compile_flags.txt"
done

# Main firmware
FIRMWARE_FLAGS=("${COMMON_FLAGS[@]}" -I "$FIRMWARE_DIR/include" -I "$FIRMWARE_DIR/src")
PUBSUB_SRC="$FIRMWARE_DIR/.pio/libdeps/esp32dev/PubSubClient/src"
DHT_LIB="$FIRMWARE_DIR/.pio/libdeps/esp32dev/DHT sensor library"
[ -d "$PUBSUB_SRC" ] && FIRMWARE_FLAGS+=(-I "$PUBSUB_SRC")
[ -d "$DHT_LIB" ] && FIRMWARE_FLAGS+=(-I "$DHT_LIB")
printf '%s\n' "${FIRMWARE_FLAGS[@]}" > "$FIRMWARE_DIR/compile_flags.txt"
echo "Wrote $FIRMWARE_DIR/compile_flags.txt (main firmware)"
echo "Done. Restart clangd or reopen files so Arduino.h/WiFiClient headers resolve."
