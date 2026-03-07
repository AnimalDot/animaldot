"""Ensure compile_commands.json includes toolchain (Arduino) paths for clangd/IDE."""
Import("env")
env.Replace(COMPILATIONDB_INCLUDE_TOOLCHAIN=True)
