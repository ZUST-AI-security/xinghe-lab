# Celery Worker 启动脚本
# 配置三个优先级队列：high（FGSM）、default（I-FGSM/PGD）、low（C&W/DeepFool）
# 消费比例：high:default:low = 4:2:1（通过 -O fair 和队列顺序实现）
#
# 用法：
#   .\run_worker.ps1
#   .\run_worker.ps1 -Concurrency 4

$ErrorActionPreference = "Stop"

param(
    [int]$Concurrency = 1,
    [string]$LogLevel = "info"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Missing venv at .venv. Please create it first."
    exit 1
}

$env:PYTHONPATH = $root

if (-not $env:TORCH_HOME) {
    $env:TORCH_HOME = (Join-Path $root ".torch")
}

Write-Host "Starting Celery worker with queues: high, default, low"
Write-Host "Concurrency: $Concurrency | Log level: $LogLevel"

& .\.venv\Scripts\python.exe -m celery `
    -A app.core.celery_app `
    worker `
    --queues=high,default,low `
    --concurrency=$Concurrency `
    --loglevel=$LogLevel `
    -O fair
