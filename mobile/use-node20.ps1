# Add nvm and Node to PATH for this session (run in PowerShell when node/nvm not found)
$env:Path = "C:\Users\jedus\AppData\Local\nvm;C:\nvm4w\nodejs;" + $env:Path
# Use Node 20 if you have it
& "C:\Users\jedus\AppData\Local\nvm\nvm.exe" use 20 2>$null
Write-Host "Node: $(node -v)" -ForegroundColor Green
Write-Host "Run: npx expo start" -ForegroundColor Cyan
