# 星河智安 (XingHe ZhiAn) - 前端 Dockerfile
# React + Ant Design + Nginx

# 构建阶段
FROM node:18-alpine AS build

WORKDIR /app

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码并构建
# 生产环境 API 使用相对路径（由 Nginx 代理）
COPY . .
ARG VITE_API_BASE_URL=
RUN VITE_API_BASE_URL="${VITE_API_BASE_URL}" npm run build

# 生产阶段
FROM nginx:alpine

# 复制自定义 nginx 配置（由 docker-compose 挂载覆盖）
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建产物（Vite 输出到 dist 目录）
COPY --from=build /app/dist /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
