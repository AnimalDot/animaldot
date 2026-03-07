"""
Patch compile_commands.json so clangd (clang) does not see GCC/ESP32-only flags.

Clangd runs clang for the host (e.g. x86_64), not for ESP32, so we remove
-mlongcalls/-mlong-calls and other target-specific flags. Run after: pio run -t compiledb

Usage (from firmware dir): python scripts/fix_compiledb_for_clangd.py
"""
import json
import os
import sys

FILENAME = "compile_commands.json"
REPLACEMENTS = [
    ("-mlongcalls", ""),
    ("-mlong-calls", ""),
    ("-fstrict-volatile-bitfields", ""),
    ("-fno-tree-switch-conversion", ""),
]

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, FILENAME)
    if not os.path.isfile(path):
        print(f"{FILENAME} not found; run 'pio run -t compiledb' first.", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for entry in data:
        cmd = entry.get("command")
        if isinstance(cmd, str):
            for old, new in REPLACEMENTS:
                cmd = cmd.replace(old, new)
            while "  " in cmd:
                cmd = cmd.replace("  ", " ")
            entry["command"] = cmd.strip()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print(f"Patched {path} for clangd.")

if __name__ == "__main__":
    main()
