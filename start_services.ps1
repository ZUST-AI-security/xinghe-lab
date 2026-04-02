# 星河智安 AI安全平台 - PowerShell启动脚本
# 解决Celery Redis连接故障与任务状态获取错误

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "星河智安 AI安全平台 - 服务启动脚本" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Cyan

# 设置错误处理
$ErrorActionPreference = "Stop"

try {
    # 第一步：启动Redis服务
    Write-Host "`n[1/3] 启动 Redis Server..." -ForegroundColor Green
    $redisPath = Join-Path $PSScriptRoot "infra\redis"
    Set-Location $redisPath
    
    # 检查Redis是否已运行
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Write-Host "Redis服务已在运行中" -ForegroundColor Yellow
    } else {
        Write-Host "启动Redis服务..." -ForegroundColor Blue
        Start-Process -FilePath "redis-server.exe" -ArgumentList "redis.windows.conf" -WindowStyle Minimized
        Write-Host "Redis服务启动完成" -ForegroundColor Green
    }
    
    # 等待Redis启动
    Write-Host "等待Redis服务就绪..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
    
    # 第二步：启动Celery Worker
    Write-Host "`n[2/3] 启动 Celery Worker..." -ForegroundColor Green
    $backendPath = Join-Path $PSScriptRoot "backend"
    Set-Location $backendPath
    
    # 激活虚拟环境
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & .\venv\Scripts\Activate.ps1
        Write-Host "虚拟环境已激活" -ForegroundColor Blue
    } else {
        Write-Host "警告：未找到虚拟环境，使用系统Python" -ForegroundColor Yellow
    }
    
    # 设置PYTHONPATH确保包导入正确
    $env:PYTHONPATH = $backendPath
    Write-Host "PYTHONPATH已设置为: $env:PYTHONPATH" -ForegroundColor Gray
    
    # 启动Celery Worker（使用-m模式解决导入错误）
    Write-Host "启动Celery Worker（使用-m模块模式）..." -ForegroundColor Blue
    $celeryArgs = @(
        "-m", "celery",
        "-A", "app.workers.celery_app",
        "worker",
        "--loglevel=info",
        "--pool=solo",
        "--concurrency=1"
    )
    
    Start-Process -FilePath "python" -ArgumentList $celeryArgs -WindowStyle Minimized
    Write-Host "Celery Worker启动完成" -ForegroundColor Green
    
    # 等待Celery启动
    Write-Host "等待Celery Worker就绪..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # 第三步：启动FastAPI服务
    Write-Host "`n[3/3] 启动 FastAPI Server..." -ForegroundColor Green
    
    # 启动FastAPI
    Write-Host "启动FastAPI服务..." -ForegroundColor Blue
    $uvicornArgs = @(
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
    )
    
    Start-Process -FilePath "uvicorn" -ArgumentList $uvicornArgs -WindowStyle Normal
    Write-Host "FastAPI服务启动完成" -ForegroundColor Green
    
    # 等待服务启动
    Write-Host "`n等待所有服务就绪..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # 验证服务状态
    Write-Host "`n===================================" -ForegroundColor Cyan
    Write-Host "服务状态验证" -ForegroundColor Yellow
    Write-Host "===================================" -ForegroundColor Cyan
    
    # 检查Redis连接
    try {
        $redisTest = python -c "import redis; r=redis.Redis(host='localhost', port=6379); print('OK' if r.ping() else 'FAIL')" 2>$null
        if ($redisTest -eq "OK") {
            Write-Host "✅ Redis连接: 正常" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis连接: 失败" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Redis连接: 无法测试" -ForegroundColor Red
    }
    
    # 检查API文档
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ FastAPI服务: 正常" -ForegroundColor Green
        } else {
            Write-Host "❌ FastAPI服务: 异常" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ FastAPI服务: 无法访问" -ForegroundColor Red
    }
    
    Write-Host "`n===================================" -ForegroundColor Cyan
    Write-Host "所有服务启动完成！" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "前端访问: http://localhost:3000" -ForegroundColor White
    Write-Host "后端API:  http://localhost:8000" -ForegroundColor White
    Write-Host "API文档:  http://localhost:8000/docs" -ForegroundColor White
    Write-Host "===================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ 启动过程中发生错误:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`n请检查:" -ForegroundColor Yellow
    Write-Host "1. Redis服务是否正确安装" -ForegroundColor White
    Write-Host "2. Python虚拟环境是否配置正确" -ForegroundColor White
    Write-Host "3. 所有依赖包是否已安装" -ForegroundColor White
    Write-Host "4. 端口8000和6379是否被占用" -ForegroundColor White
    Write-Host "`n修复建议:" -ForegroundColor Cyan
    Write-Host "1. 确保在backend根目录运行: cd d:\xinghe-lab\backend" -ForegroundColor White
    Write-Host "2. 使用模块模式启动: python -m celery -A app.workers.celery_app worker" -ForegroundColor White
    Write-Host "3. 检查PYTHONPATH设置: $env:PYTHONPATH='d:\xinghe-lab\backend'" -ForegroundColor White
}

Write-Host "`n按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
