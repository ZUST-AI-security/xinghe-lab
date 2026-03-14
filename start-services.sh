#!/bin/bash
# 星河智安项目启动脚本

echo "🚀 启动星河智安AI安全攻击可视化平台"
echo "=================================="

# 检查Python环境
echo "📋 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查Node.js环境
echo "📋 检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 启动后端
echo ""
echo "🔧 启动后端API服务..."
cd api

if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
fi

echo "📦 激活虚拟环境..."
source venv/bin/activate

if [ ! -f ".env" ]; then
    echo "📝 复制环境配置文件..."
    cp .env.example .env
fi

echo "📦 安装Python依赖..."
pip install fastapi uvicorn sqlalchemy redis celery torch torchvision --quiet

echo "🚀 启动后端服务 (端口8000)..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 启动前端
echo ""
echo "🎨 启动前端Web应用..."
cd ../web

if [ ! -f ".env" ]; then
    echo "📝 复制环境配置文件..."
    cp .env.example .env
fi

echo "📦 安装前端依赖..."
npm install --silent --legacy-peer-deps

echo "🚀 启动前端开发服务器 (端口3000)..."
npm start &
FRONTEND_PID=$!
echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态检查..."
echo "后端API: http://localhost:8000"
echo "API文档: http://localhost:8000/docs"
echo "前端应用: http://localhost:3000"
echo ""

# 保存进程ID
echo $BACKEND_PID > /tmp/xinghe-backend.pid
echo $FRONTEND_PID > /tmp/xinghe-frontend.pid

echo "✅ 星河智安平台启动完成！"
echo ""
echo "🌐 访问地址："
echo "   前端应用: http://localhost:3000"
echo "   后端API:  http://localhost:8000"
echo "   API文档:  http://localhost:8000/docs"
echo ""
echo "🛑 停止服务："
echo "   停止后端: kill $BACKEND_PID"
echo "   停止前端: kill $FRONTEND_PID"
echo "   或运行: ./stop-services.sh"
echo ""
echo "📖 查看日志："
echo "   后端日志: 查看此终端输出"
echo "   前端日志: 另开终端查看npm start输出"

# 等待用户输入来保持脚本运行
echo "按 Ctrl+C 停止所有服务..."
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 保持脚本运行
while true; do
    sleep 1
done
