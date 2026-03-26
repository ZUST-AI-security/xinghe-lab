$ErrorActionPreference = "Stop"

param(
    [ValidateSet("true", "false")]
    [string]$Debug = "false",
    [int]$Port = 8000
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path ".venv\\Scripts\\python.exe")) {
    Write-Host "Missing venv at .venv. Please create it first."
    exit 1
}

# Ensure settings parsing is stable
$env:DEBUG = $Debug
$env:PYTHONPATH = $root

# Avoid permission issues when downloading model weights
if (-not $env:TORCH_HOME) {
    $env:TORCH_HOME = (Join-Path $root ".torch")
}

& .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port $Port
