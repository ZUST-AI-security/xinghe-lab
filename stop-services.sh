#!/bin/bash
# 星河智安项目停止脚本

echo "🛑 停止星河智安AI安全攻击可视化平台"
echo "=================================="

# 停止后端服务
echo "🔧 停止后端服务..."
if [ -f "/tmp/xinghe-backend.pid" ]; then
    BACKEND_PID=$(cat /tmp/xinghe-backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务进程不存在"
    fi
    rm -f /tmp/xinghe-backend.pid
else
    echo "⚠️  未找到后端服务PID文件"
fi

# 停止前端服务
echo "🎨 停止前端服务..."
if [ -f "/tmp/xinghe-frontend.pid" ]; then
    FRONTEND_PID=$(cat /tmp/xinghe-frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务进程不存在"
    fi
    rm -f /tmp/xinghe-frontend.pid
else
    echo "⚠️  未找到前端服务PID文件"
fi

# 额外清理：杀死可能残留的进程
echo "🧹 清理残留进程..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

echo ""
echo "✅ 星河智安平台已完全停止"
echo ""
echo "🚀 重新启动："
echo "   运行: ./start-services.sh"
