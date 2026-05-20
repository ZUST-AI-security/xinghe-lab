#!/bin/bash
# 星河智安 - SSL 证书初始化脚本
# 用法: ./scripts/init-ssl.sh yourdomain.com

set -euo pipefail

DOMAIN="${1:?用法: $0 <域名>}"
EMAIL="${2:-admin@${DOMAIN}}"

CERT_DIR="./nginx/certbot/conf"
WWW_DIR="./nginx/certbot/www"

echo "=== 星河智安 SSL 证书初始化 ==="
echo "域名: ${DOMAIN}"
echo "邮箱: ${EMAIL}"
echo ""

# 创建目录
mkdir -p "${CERT_DIR}" "${WWW_DIR}"

# 检查是否已有证书
if [ -f "${CERT_DIR}/live/fullchain.pem" ]; then
    echo "证书已存在，跳过申请。如需重新申请，请删除 ${CERT_DIR}/live/ 目录。"
    exit 0
fi

echo "[1/4] 使用临时 Nginx 配置启动（仅 HTTP）..."

# 创建临时 nginx 配置（仅 HTTP，用于 certbot 验证）
cat > ./nginx/nginx-temp.conf << 'NGINX_EOF'
worker_processes auto;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
NGINX_EOF

# 用临时配置启动 nginx
docker compose stop nginx 2>/dev/null || true
docker run -d --name nginx-temp \
    -p 80:80 \
    -v "$(pwd)/nginx/nginx-temp.conf:/etc/nginx/nginx.conf:ro" \
    -v "${WWW_DIR}:/var/www/certbot" \
    nginx:alpine

echo "[2/4] 申请 Let's Encrypt 证书..."

docker run --rm \
    -v "${CERT_DIR}:/etc/letsencrypt" \
    -v "${WWW_DIR}:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}"

# 停止临时 nginx
docker stop nginx-temp && docker rm nginx-temp
rm -f ./nginx/nginx-temp.conf

echo "[3/4] 整理证书文件..."
# Nginx 配置期望 /etc/letsencrypt/live/fullchain.pem
# certbot 实际生成 /etc/letsencrypt/live/${DOMAIN}/fullchain.pem
# 创建符号链接统一路径
mkdir -p "${CERT_DIR}/live"
ln -sf "${DOMAIN}/fullchain.pem" "${CERT_DIR}/live/fullchain.pem"
ln -sf "${DOMAIN}/privkey.pem" "${CERT_DIR}/live/privkey.pem"

echo "[4/4] 切换 Nginx 为 SSL 配置并启动服务..."
# 备份 HTTP 配置，切换为 SSL 配置
cp ./nginx/nginx.conf ./nginx/nginx-http.conf.bak
cp ./nginx/nginx-ssl.conf ./nginx/nginx.conf

docker compose up -d

echo ""
echo "=== SSL 证书初始化完成 ==="
echo "访问 https://${DOMAIN} 验证部署"
echo ""
echo "如需回退到 HTTP 模式:"
echo "  cp ./nginx/nginx-http.conf.bak ./nginx/nginx.conf"
echo "  docker compose restart nginx"
