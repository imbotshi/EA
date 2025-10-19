# Run both backend (Express) and frontend (Vite) in development
# Usage: ./run-dev.ps1

$ErrorActionPreference = 'Stop'

function Install-Dependencies($dir) {
  Write-Host "📦 Installing dependencies in $dir" -ForegroundColor Cyan
  Push-Location $dir
  try {
    npm install
  } finally {
    Pop-Location
  }
}

# Install deps if node_modules missing
if (-not (Test-Path -Path (Join-Path $PSScriptRoot 'backend/node_modules'))) {
  Install-Dependencies (Join-Path $PSScriptRoot 'backend')
}
if (-not (Test-Path -Path (Join-Path $PSScriptRoot 'frontend/node_modules'))) {
  Install-Dependencies (Join-Path $PSScriptRoot 'frontend')
}

# Start backend and frontend in separate PowerShell windows
Write-Host "🚀 Starting backend on http://localhost:3001" -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit","-Command","Set-Location -Path (Join-Path $PSScriptRoot 'backend'); npm run dev"

Start-Sleep -Seconds 1

Write-Host "🎨 Starting frontend on http://localhost:3000" -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit","-Command","Set-Location -Path (Join-Path $PSScriptRoot 'frontend'); npm run dev"

Write-Host "✅ Both processes launched. Use Ctrl+C in each window to stop." -ForegroundColor Yellow
