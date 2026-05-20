#!/bin/bash

echo "🚀 启动 XINGHE-LAB 前端..."

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo "🌐 访问地址: http://localhost:5173"
npm run dev
