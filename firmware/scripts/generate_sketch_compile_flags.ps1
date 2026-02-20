# Generate compile_flags.txt for each sketch so clangd can find Arduino.h and BLE headers.
# Run from repo root or firmware: .\scripts\generate_sketch_compile_flags.ps1
# Requires PlatformIO to be installed (framework packages under .platformio).

$ErrorActionPreference = "Stop"
$firmwareDir = $PSScriptRoot | Split-Path -Parent
if (-not (Test-Path (Join-Path $firmwareDir "sketches"))) {
    $firmwareDir = Join-Path $PSScriptRoot ".."
}
$sketchesDir = Join-Path $firmwareDir "sketches"
$pioHome = $env:PLATFORMIO_HOME_DIR
if (-not $pioHome) { $pioHome = Join-Path $env:USERPROFILE ".platformio" }
$framework = Join-Path $pioHome "packages\framework-arduinoespressif32"
$coresEsp32 = Join-Path $framework "cores\esp32"
$libBLE = Join-Path $framework "libraries\BLE"

if (-not (Test-Path $coresEsp32)) {
    Write-Warning "Arduino ESP32 core not found at: $coresEsp32"
    Write-Warning "Install PlatformIO and run a build from firmware (e.g. 'pio run') once, then re-run this script."
    exit 1
}

$commonFlags = @("-xc++", "-std=c++17", "-DARDUINO=1", "-Wno-unknown-pragmas", "-I", $coresEsp32)
if (Test-Path $libBLE) { $commonFlags += "-I"; $commonFlags += $libBLE }

$sketchDirs = Get-ChildItem -Path $sketchesDir -Directory -ErrorAction SilentlyContinue
foreach ($dir in $sketchDirs) {
    $outPath = Join-Path $dir.FullName "compile_flags.txt"
    $lines = $commonFlags | ForEach-Object { $_ }
    $lines | Set-Content -Path $outPath -Encoding utf8
    Write-Host "Wrote $outPath"
}
Write-Host "Done. Restart clangd or reopen the sketch so Arduino.h/BLE headers resolve."
