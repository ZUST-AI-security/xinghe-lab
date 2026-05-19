# 星河智安 AI 安全攻击可视化平台

> **浙江科技大学 · 大数据与智能安全实验室**
> XingHe ZhiAn — AI Security Attack Visualization Platform

本平台为浙江科技大学大数据与智能安全实验室自主研发的对抗攻击可视化与交互实验系统，支持主流对抗样本攻击算法在深度学习分类模型上的演示与分析。

---

## 功能概览

| 功能模块 | 说明 |
|----------|------|
| **攻击算法** | FGSM、I-FGSM、PGD、C&W、DeepFool，支持同步/异步执行 |
| **模型管理** | ResNet-101/152 (ImageNet)；YOLO 检测模型（预留） |
| **可视化** | 原始图/对抗图对比、扰动热力图、Top-5 概率柱状图 |
| **用户系统** | JWT 认证、角色权限（admin/user）、邮箱验证、图形验证码 |
| **管理后台** | 系统概览、用户管理、攻击历史、系统日志、系统配置 |
| **异步任务** | Celery + Redis 异步攻击队列，前端轮询进度 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Python 3.13 · FastAPI 0.136 · Uvicorn · PyTorch 2.x |
| **数据库** | PostgreSQL 16 · SQLAlchemy 2.0 · Alembic |
| **异步任务** | Celery 5.6 · Redis 7.4 |
| **前端** | React 18 · Vite · Ant Design 5 · Aceternity UI · MagicUI |
| **部署** | Docker Compose · Nginx · Let's Encrypt SSL |

---

## 方式一：Docker 部署（推荐）

### 前置条件

- Ubuntu 24.04 LTS 服务器
- root 或 sudo 权限
- 域名（可选，用于 HTTPS）

### 第一步：安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

### 第二步：克隆项目

```bash
cd /opt
git clone -b yunzen https://github.com/ZUST-AI-security/xinghe-lab.git
cd xinghe-lab
```

### 第三步：配置环境变量

```bash
cp .env.production .env
```

编辑 `.env`，**替换所有 `CHANGE_ME`**：

```bash
nano .env
```

必须替换的变量：

| 变量 | 说明 | 生成命令 |
|------|------|----------|
| `SECRET_KEY` | 应用密钥 | `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | JWT 签名密钥 | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | 数据库密码 | `openssl rand -hex 16` |
| `REDIS_PASSWORD` | Redis 密码 | `openssl rand -hex 16` |
| `CORS_ORIGINS` | 允许的前端域名 | `["https://yourdomain.com"]` 或 `["http://你的IP"]` |
| `ADMIN_SETUP_TOKEN` | 首次注册管理员的令牌（可选） | `openssl rand -hex 16` |

邮件服务（腾讯云 SES）已预配置，如需修改请更新 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`。

### 第四步：构建前端

```bash
# 安装 Node.js（如未安装）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 配置 npm 国内镜像（加速下载）
npm config set registry https://registry.npmmirror.com

# 构建前端
cd web
npm install --legacy-peer-deps
npm run build
cd ..
```

### 第五步：配置 GPU / CPU

PyTorch 镜像分为 **GPU 版**（CUDA）和 **CPU 版**，构建前需根据服务器配置选择：

| 服务器情况 | `.env` 中设置 | 说明 |
|------------|---------------|------|
| 有 NVIDIA GPU | `DEVICE=gpu` | 使用 CUDA 加速，攻击任务更快（默认值） |
| 无 GPU | `DEVICE=cpu` | 仅用 CPU，镜像更小（约 200MB vs 2.5GB） |

编辑 `.env`，确认 `DEVICE` 变量：

```bash
# 有 GPU 的服务器（默认）
DEVICE=gpu

# 没有 GPU 的服务器
DEVICE=cpu
```

> **注意**：GPU 版需要服务器已安装 [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)，否则 Docker 无法使用 GPU。

### 第六步：启动服务

```bash
# 构建镜像并启动所有服务
docker compose up -d --build
```

首次启动会：
1. 拉取 PostgreSQL、Redis、Nginx 镜像
2. 构建后端 Python 镜像（安装 PyTorch 等，约 5-15 分钟）
3. 启动数据库并运行迁移
4. 启动后端 API、Celery Worker、Nginx

### 第七步：验证部署

```bash
# 查看服务状态（应全部为 running）
docker compose ps

# 健康检查
curl http://localhost/health

# 查看日志
docker compose logs -f backend
```

浏览器访问 `http://你的服务器IP`，应看到平台首页。

### 第八步：注册管理员

首次部署后，访问 `http://你的IP/register` 注册第一个账号。

如果设置了 `ADMIN_SETUP_TOKEN`，注册时需要输入该令牌。第一个注册的用户自动成为管理员。

### 第九步：配置 HTTPS（可选）

确保域名已解析到服务器 IP，然后运行一键脚本：

```bash
./scripts/init-ssl.sh yourdomain.com
```

脚本会自动：
1. 申请 Let's Encrypt 免费证书
2. 配置证书路径
3. 切换 Nginx 为 HTTPS 模式
4. 重启服务

证书续期（添加定时任务）：

```bash
sudo crontab -e
# 添加：
0 3 * * 1 certbot renew --quiet && docker compose -f /opt/xinghe-lab/docker-compose.yml restart nginx
```

---

## 常用运维命令

```bash
# 查看所有服务状态
docker compose ps

# 查看实时日志
docker compose logs -f
docker compose logs -f backend    # 仅后端
docker compose logs -f celery-worker  # 仅 Celery

# 重启服务
docker compose restart backend    # 重启后端
docker compose restart nginx      # 重启 Nginx
docker compose down && docker compose up -d  # 全部重启

# 进入后端容器
docker compose exec backend bash

# 查看数据库
docker compose exec postgres psql -U xinghe -d xinghe_zhi_an

# 停止所有服务
docker compose down

# 停止并清除数据（危险！会删除数据库）
docker compose down -v
```

---

## 更新部署

当代码有更新时，在服务器执行：

```bash
cd /opt/xinghe-lab

# 拉取最新代码
git pull origin yunzen

# 重建前端
cd web && npm install --legacy-peer-deps && npm run build && cd ..

# 重建后端并重启
docker compose up -d --build backend celery-worker

# 如有数据库迁移
docker compose exec backend alembic upgrade head
```

只更新前端时：

```bash
cd web && npm run build && cd ..
docker compose restart nginx
```

只更新后端时：

```bash
docker compose up -d --build backend
```

---

## 方式二：直接部署（不用 Docker）

适用于无法使用 Docker 的服务器，或需要更精细控制的场景。

### 前置条件

- Ubuntu 24.04 LTS 服务器
- root 或 sudo 权限

### 1. 安装系统依赖

```bash
sudo apt update
sudo apt install -y python3.13 python3.13-venv python3-pip \
    libgl1 libglib2.0-0 libgomp1 \
    postgresql postgresql-contrib \
    redis-server \
    nginx

# 安装 Node.js（构建前端）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm config set registry https://registry.npmmirror.com
```

### 2. 配置 PostgreSQL

```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER xinghe WITH PASSWORD '你的数据库密码';"
sudo -u postgres psql -c "CREATE DATABASE xinghe_zhi_an OWNER xinghe;"
```

### 3. 配置 Redis

```bash
sudo nano /etc/redis/redis.conf
# 找到 requirepass，取消注释并设置密码：
# requirepass 你的Redis密码
sudo systemctl restart redis
```

### 4. 部署后端

```bash
cd /opt
git clone -b yunzen https://github.com/ZUST-AI-security/xinghe-lab.git
cd xinghe-lab/backend

# 创建虚拟环境
python3.13 -m venv venv
source venv/bin/activate

# 配置国内 pip 镜像
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 安装 PyTorch（根据是否有 GPU 选择）
# 有 GPU：
pip install torch torchvision --index-url https://mirror.sjtu.edu.cn/pytorch-wheels/cu124
# 无 GPU：
pip install torch torchvision --index-url https://mirror.sjtu.edu.cn/pytorch-wheels/cpu

# 安装其他依赖
pip install --no-deps -r requirements.txt

# 创建环境配置（替换密码和 IP）
cat > .env << EOF
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql+psycopg://xinghe:你的数据库密码@localhost:5432/xinghe_zhi_an
REDIS_URL=redis://:你的Redis密码@localhost:6379/0
CELERY_BROKER_URL=redis://:你的Redis密码@localhost:6379/0
CELERY_RESULT_BACKEND=redis://:你的Redis密码@localhost:6379/0
CORS_ORIGINS=["http://你的服务器IP"]
DEVICE=gpu
EOF

# 运行数据库迁移
alembic upgrade head

# 创建必要目录
mkdir -p outputs logs models
```

### 5. 配置 Systemd 服务

```bash
# 后端 API
sudo tee /etc/systemd/system/xinghe-backend.service << 'EOF'
[Unit]
Description=XingHe ZhiAn Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xinghe-lab/backend
EnvironmentFile=/opt/xinghe-lab/backend/.env
ExecStart=/opt/xinghe-lab/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Celery Worker
sudo tee /etc/systemd/system/xinghe-celery.service << 'EOF'
[Unit]
Description=XingHe ZhiAn Celery Worker
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xinghe-lab/backend
EnvironmentFile=/opt/xinghe-lab/backend/.env
ExecStart=/opt/xinghe-lab/backend/venv/bin/celery -A app.core.celery_app worker --loglevel=info --concurrency=2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable xinghe-backend xinghe-celery
sudo systemctl start xinghe-backend xinghe-celery
```

### 6. 构建前端

```bash
cd /opt/xinghe-lab/web
npm install --legacy-peer-deps
npm run build
```

### 7. 配置 Nginx

```bash
sudo tee /etc/nginx/sites-available/xinghe << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    root /opt/xinghe-lab/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /outputs/ {
        proxy_pass http://127.0.0.1:8000/outputs/;
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/xinghe /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### 8. 验证

```bash
# 检查服务状态
sudo systemctl status xinghe-backend xinghe-celery postgresql redis nginx

# 健康检查
curl http://localhost/health
```

浏览器访问 `http://你的服务器IP`。

### 直接部署 - 更新命令

```bash
cd /opt/xinghe-lab
git pull origin yunzen

# 更新后端
cd backend && source venv/bin/activate
pip install --no-deps -r requirements.txt
alembic upgrade head
sudo systemctl restart xinghe-backend xinghe-celery

# 更新前端
cd ../web && npm install --legacy-peer-deps && npm run build
sudo systemctl reload nginx
```

---

## 项目结构

```text
xinghe-lab/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # 应用入口 & 路由挂载
│   │   ├── algorithms/      # 攻击算法（FGSM/I-FGSM/PGD/CW/DeepFool）
│   │   ├── api/v1/          # REST API 路由
│   │   ├── core/            # 配置、数据库、安全
│   │   ├── ml_models/       # ML 模型注册与加载
│   │   ├── models/          # ORM 模型
│   │   ├── schemas/         # Pydantic schema
│   │   ├── utils/           # 工具函数
│   │   └── workers/         # Celery 异步任务
│   ├── alembic/             # 数据库迁移
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── web/                     # React 前端
│   ├── src/
│   │   ├── api/             # API 客户端
│   │   ├── components/      # 通用组件 & 布局
│   │   ├── pages/           # 页面
│   │   └── store/           # Zustand 状态管理
│   └── package.json
├── nginx/                   # Nginx 配置
├── scripts/                 # 部署脚本
├── docker-compose.yml
├── .env.production          # 环境变量模板
└── README.md
```

---

## API 文档

开发环境下可访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- 健康检查: `http://localhost:8000/health`

生产环境下 Swagger/ReDoc 默认关闭。

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 登录 |
| POST | /api/v1/auth/register | 注册 |
| POST | /api/v1/auth/send-register-code | 发送注册邮箱验证码 |
| POST | /api/v1/auth/forgot-password | 发送重置密码验证码 |
| GET | /api/v1/users/me | 当前用户 |
| POST | /api/v1/attacks/fgsm/run | FGSM 同步攻击 |
| POST | /api/v1/attacks/cw/run | C&W 同步攻击 |
| POST | /api/v1/attacks/{algo}/submit | 异步提交 |
| GET | /api/v1/admin/dashboard | 系统概览（管理员） |

---

## 攻击算法

| 算法 | 类型 | 范数 | 特点 |
|------|------|------|------|
| FGSM | 单步 | Linf | 最快速的梯度攻击 |
| I-FGSM | 迭代 | Linf | FGSM 迭代版，攻击更精细 |
| PGD | 迭代 | Linf | 带投影梯度下降，最强 Linf |
| C&W | 优化 | L2 | 基于优化，绕过防御能力强 |
| DeepFool | 几何 | L2 | 最小扰动，寻找最近决策边界 |

---

## 安全特性

- JWT 认证 + Token 轮转（access + refresh）
- 图形验证码 + 邮箱验证码
- 登录频率限制（5 次/15 分钟锁定）
- API 速率限制（Nginx 层 + 应用层）
- 生产环境强制 HTTPS、安全头（HSTS、CSP、X-Frame-Options）
- Docker 非 root 用户运行
- 数据库不对外暴露端口
- CORS 白名单限制
- 文件上传 Magic Bytes 校验

---

## 许可证

本项目为浙江科技大学大数据与智能安全实验室内部项目。

实验室主页: https://lab.rjmart.cn/10366/AISecurityLab
