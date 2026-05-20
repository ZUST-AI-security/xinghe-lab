#!/bin/bash
# 星河智安 - 一键部署脚本
# 用法: ./scripts/deploy.sh [域名]

set -euo pipefail

echo "=== 星河智安 部署脚本 ==="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装 Docker"
    echo "安装命令: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "错误: 未安装 Docker Compose V2"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "[1/5] 生成环境配置..."
    if [ -f .env.production ]; then
        cp .env.production .env
        echo "已复制 .env.production -> .env"
        echo ""
        echo "请编辑 .env 文件，替换所有 CHANGE_ME 为真实值："
        echo "  - SECRET_KEY"
        echo "  - JWT_SECRET_KEY"
        echo "  - POSTGRES_PASSWORD"
        echo "  - REDIS_PASSWORD"
        echo "  - CORS_ORIGINS"
        echo "  - ADMIN_SETUP_TOKEN（可选）"
        echo ""
        echo "生成密钥命令: openssl rand -hex 32"
        echo ""
        read -p "编辑完成后按 Enter 继续..."
    else
        echo "错误: 未找到 .env.production 模板"
        exit 1
    fi
fi

# 验证 .env 中没有 CHANGE_ME
if grep -q "CHANGE_ME" .env; then
    echo "错误: .env 文件中仍包含 CHANGE_ME 占位符，请先替换为真实值"
    exit 1
fi

# 检查前端构建产物
if [ ! -d "web/dist" ] || [ ! -f "web/dist/index.html" ]; then
    echo "[1.5/5] 构建前端..."
    cd web && npm install && npm run build && cd ..
fi

echo "[2/5] 构建 Docker 镜像..."
docker compose build --no-cache

echo "[3/5] 启动数据库和缓存..."
docker compose up -d postgres redis
echo "等待数据库就绪..."
sleep 5

echo "[4/5] 启动所有服务..."
docker compose up -d

echo "[5/5] 等待服务就绪..."
sleep 10

# 检查服务状态
echo ""
echo "=== 服务状态 ==="
docker compose ps

echo ""
echo "=== 健康检查 ==="
if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "后端: 正常"
else
    echo "后端: 启动中...（首次启动 ML 模型加载需要较长时间）"
    echo "查看后端日志: docker compose logs -f backend"
fi

echo ""
echo "=== 部署完成 ==="
echo "请在 .env 中确认 CORS_ORIGINS 已设置为实际域名或 IP"
echo ""
echo "浏览器访问: http://你的服务器IP"
echo "API 地址:   http://你的服务器IP/api/v1/"
echo ""
echo "查看日志: docker compose logs -f"
echo "停止服务: docker compose down"
