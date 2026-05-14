# 星河智安 AI 安全攻击可视化平台

> **浙江科技大学 · 大数据与智能安全实验室**  
> XingHe ZhiAn — AI Security Attack Visualization Platform

本平台为浙江科技大学大数据与智能安全实验室（星河智安实验室）自主研发的对抗攻击可视化与交互实验系统，支持主流对抗样本攻击算法在深度学习分类模型上的演示与分析。

实验室主页：<https://lab.rjmart.cn/10366/AISecurityLab>

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [Docker 部署（推荐）](#docker-部署推荐)
  - [本地打包并推送镜像](#1-本地打包并推送镜像)
  - [服务器拉取并启动](#2-服务器拉取并启动)
  - [环境变量说明](#3-环境变量说明)
  - [常用运维命令](#4-常用运维命令)
  - [升级版本](#5-升级版本)
- [本地开发启动](#本地开发启动)
- [API 文档](#api-文档)
- [攻击算法](#攻击算法)
- [默认账号](#默认账号)

---

## 功能概览

| 功能模块 | 说明 |
|----------|------|
| **攻击算法** | FGSM、I-FGSM、PGD、C&W、DeepFool，异步 Celery 队列执行 |
| **多算法对比** | 2–4 个算法同屏对比，并发提交，独立轮询 |
| **扰动可视化** | 热力图、差值放大图、频域分析图三视图 |
| **鲁棒性评估** | 高斯模糊 / JPEG 压缩 / 位深度压缩防御矩阵 |
| **敏感性分析** | 参数扫描折线图，自动批量提交 |
| **排行榜** | 基于历史数据的模型鲁棒性排名 |
| **文件管理** | SHA-256 去重上传、图片库复用 |
| **用户系统** | JWT 认证、角色权限（admin/user）、注册/登录 |
| **管理后台** | 系统概览、用户管理、攻击历史、系统日志、文件管理 |
| **任务调度** | 三优先级 Celery 队列（high/default/low），并发限制 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18、Vite 5、Ant Design 5、Zustand、react-router-dom v6、Axios |
| 后端 | Python 3.11、FastAPI、Uvicorn、SQLAlchemy 2.0、Alembic、Pydantic v2 |
| ML | PyTorch 2.6（CPU）、torchvision、opencv-python-headless |
| 任务队列 | Celery 5、Redis 7 |
| 数据库 | PostgreSQL 16 |
| 容器 | Docker、Docker Compose、Nginx |

---

## 项目结构

```text
xinghe-lab/
├── backend/
│   ├── app/
│   │   ├── main.py              # 应用入口 & 路由挂载
│   │   ├── algorithms/          # 攻击算法实现
│   │   ├── api/v1/              # REST API 路由
│   │   ├── core/                # 配置、数据库、安全、任务调度
│   │   ├── ml_models/           # ML 模型注册与加载
│   │   ├── models/              # ORM 模型
│   │   ├── services/            # 鲁棒性/敏感性分析服务
│   │   └── workers/             # Celery 异步任务
│   ├── alembic/                 # 数据库迁移脚本
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── requirements.txt
├── web/
│   ├── src/
│   │   ├── api/                 # API 客户端
│   │   ├── components/          # 通用组件 & 布局
│   │   ├── pages/               # 页面
│   │   └── store/               # Zustand 状态管理
│   ├── Dockerfile
│   └── nginx.conf               # Nginx 反向代理配置
├── docker-compose.yml           # 开发/本地 compose（含 build）
├── docker-compose.prod.yml      # 生产 compose（只拉镜像，不 build）
├── .env.docker.example          # 本地 Docker 环境变量模板
└── .env.prod.example            # 服务器生产环境变量模板
```

---

## Docker 部署（推荐）

整体流程分两步：**本地打包推送** → **服务器拉取启动**。

```
本地机器                          Docker Hub / 镜像仓库          服务器
─────────────────────────────    ──────────────────────────    ──────────────────────────
docker compose build             →  push 镜像                  docker compose pull
docker compose push              →                             docker compose up -d
```

镜像名称（已在 compose 文件中配置）：
- `alphaply712/xinghe-lab-backend:latest`
- `alphaply712/xinghe-lab-web:latest`

---

### 1. 本地打包并推送镜像

> **前提**：本地已安装 Docker Desktop，并已登录 Docker Hub。

#### 1.1 登录 Docker Hub

```bash
docker login
# 输入 Docker Hub 用户名和密码
```

#### 1.2 复制并编辑本地环境变量

```bash
# 在项目根目录执行
cp .env.docker.example .env
```

打开 `.env`，按需修改（本地打包时最关键的是 `IMAGE_TAG`）：

```dotenv
IMAGE_TAG=latest          # 或指定版本号，如 v1.2.0
VITE_API_BASE_URL=        # 留空：前端通过 Nginx 代理 /api，无需跨域
```

> `VITE_API_BASE_URL` 在构建时被烧入前端 JS。留空表示前端请求走同源 `/api/`，由 Nginx 代理到后端，**这是生产环境的正确做法**。只有在前后端不同域时才需要填写完整 URL（如 `https://api.example.com`）。

#### 1.3 构建镜像

```bash
# 在项目根目录执行
docker compose build
```

这会同时构建 `backend` 和 `web` 两个镜像。构建时间较长（首次约 10–20 分钟，主要是 PyTorch 下载）。

如果只想重新构建某一个：

```bash
docker compose build backend
docker compose build web
```

#### 1.4 推送镜像到 Docker Hub

```bash
docker compose push
```

或分别推送：

```bash
docker compose push backend
docker compose push web
```

推送完成后，可在 Docker Hub 上确认：
- `https://hub.docker.com/r/alphaply712/xinghe-lab-backend`
- `https://hub.docker.com/r/alphaply712/xinghe-lab-web`

#### 1.5 推送指定版本标签（可选）

```bash
# 打版本标签
IMAGE_TAG=v1.2.0 docker compose build
IMAGE_TAG=v1.2.0 docker compose push
```

---

### 2. 服务器拉取并启动

> **前提**：服务器已安装 Docker 和 Docker Compose（v2，即 `docker compose` 命令）。

#### 2.1 在服务器上创建部署目录

```bash
mkdir -p /opt/xinghe-lab
cd /opt/xinghe-lab
```

#### 2.2 上传 compose 文件和环境变量

将以下文件上传到服务器的 `/opt/xinghe-lab/` 目录（scp / sftp / git clone 均可）：

```
docker-compose.prod.yml
.env.prod.example
```

#### 2.3 创建并编辑生产环境变量文件

```bash
cp .env.prod.example .env
nano .env   # 或 vim .env
```

**必须修改的字段**（见下方[环境变量说明](#3-环境变量说明)）：

```dotenv
# ── 数据库 ──────────────────────────────────────────────
POSTGRES_PASSWORD=your-strong-db-password-here

# ── 安全密钥（必须修改，否则生产环境启动会报错）──────────
SECRET_KEY=your-64-char-random-string-here
JWT_SECRET_KEY=another-64-char-random-string-here

# ── 镜像版本 ─────────────────────────────────────────────
IMAGE_TAG=latest

# ── 端口（按服务器实际情况调整）──────────────────────────
WEB_PORT=8080
BACKEND_PORT=8000

# ── CORS（填写实际访问域名或 IP）─────────────────────────
CORS_ORIGINS=["http://your-server-ip:8080","https://your-domain.com"]
```

生成随机密钥的方法：

```bash
# Linux/macOS
openssl rand -hex 32

# 或 Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### 2.4 拉取镜像

```bash
docker compose -f docker-compose.prod.yml pull
```

#### 2.5 启动所有服务

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

首次启动时，`backend` 容器会自动执行 `alembic upgrade head` 完成数据库初始化。

#### 2.6 验证服务状态

```bash
# 查看所有容器状态
docker compose -f docker-compose.prod.yml ps

# 查看后端健康状态
curl http://localhost:8000/health

# 查看前端是否可访问
curl -I http://localhost:8080
```

正常输出示例：

```
NAME                STATUS          PORTS
xinghe-postgres     Up (healthy)    5432/tcp
xinghe-redis        Up (healthy)    6379/tcp
xinghe-backend      Up (healthy)    0.0.0.0:8000->8000/tcp
xinghe-celery       Up              
xinghe-celery-beat  Up              
xinghe-web          Up              0.0.0.0:8080->80/tcp
```

访问地址：
- **前端**：`http://your-server-ip:8080`
- **后端 API**：`http://your-server-ip:8000`
- **API 文档**（仅 DEBUG=true 时可用）：`http://your-server-ip:8000/docs`

---

### 3. 环境变量说明

完整变量参考（`.env.prod.example`）：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `POSTGRES_DB` | 否 | `xinghe_lab` | 数据库名 |
| `POSTGRES_USER` | 否 | `xinghe` | 数据库用户名 |
| `POSTGRES_PASSWORD` | **是** | — | 数据库密码，生产环境必须设置 |
| `SECRET_KEY` | **是** | — | 应用密钥，生产环境必须设置（≥32位随机字符串） |
| `JWT_SECRET_KEY` | **是** | — | JWT 签名密钥，生产环境必须设置（≥32位随机字符串） |
| `DEBUG` | 否 | `false` | 是否开启调试模式（生产环境保持 false） |
| `IMAGE_TAG` | 否 | `latest` | Docker 镜像标签，用于版本控制 |
| `WEB_PORT` | 否 | `8080` | 前端对外暴露端口 |
| `BACKEND_PORT` | 否 | `8000` | 后端对外暴露端口 |
| `CORS_ORIGINS` | 否 | `["http://localhost:8080"]` | 允许跨域的前端地址，JSON 数组格式 |
| `ALLOWED_IMAGE_TYPES` | 否 | `["jpg","jpeg","png","bmp","tiff"]` | 允许上传的图片格式 |
| `CELERY_CONCURRENCY` | 否 | `1` | Celery worker 并发数（低配服务器保持 1） |
| `CELERY_LOG_LEVEL` | 否 | `info` | Celery 日志级别 |
| `VITE_API_BASE_URL` | 否 | 空 | 前端 API 基础 URL（留空走 Nginx 代理） |

> **注意**：`docker-compose.prod.yml` 中 `SECRET_KEY`、`JWT_SECRET_KEY`、`POSTGRES_PASSWORD` 使用了 `${VAR:?error}` 语法，若未设置则启动时直接报错，防止使用弱密钥上线。

---

### 4. 常用运维命令

```bash
# 进入部署目录
cd /opt/xinghe-lab

# 查看所有容器日志（实时）
docker compose -f docker-compose.prod.yml logs -f

# 只看后端日志
docker compose -f docker-compose.prod.yml logs -f backend

# 只看 Celery worker 日志
docker compose -f docker-compose.prod.yml logs -f celery

# 重启某个服务
docker compose -f docker-compose.prod.yml restart backend

# 停止所有服务（保留数据卷）
docker compose -f docker-compose.prod.yml down

# 停止并删除数据卷（⚠️ 会清空数据库和模型缓存）
docker compose -f docker-compose.prod.yml down -v

# 进入后端容器执行命令
docker compose -f docker-compose.prod.yml exec backend bash

# 手动执行数据库迁移
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 查看数据卷占用
docker system df -v
```

---

### 5. 升级版本

在**本地**重新构建并推送新镜像：

```bash
# 修改代码后，在项目根目录执行
IMAGE_TAG=v1.3.0 docker compose build
IMAGE_TAG=v1.3.0 docker compose push

# 同时更新 latest 标签
docker tag alphaply712/xinghe-lab-backend:v1.3.0 alphaply712/xinghe-lab-backend:latest
docker tag alphaply712/xinghe-lab-web:v1.3.0 alphaply712/xinghe-lab-web:latest
docker push alphaply712/xinghe-lab-backend:latest
docker push alphaply712/xinghe-lab-web:latest
```

在**服务器**上拉取并重启：

```bash
cd /opt/xinghe-lab

# 更新 .env 中的 IMAGE_TAG（如果使用版本号）
# IMAGE_TAG=v1.3.0

# 拉取新镜像
docker compose -f docker-compose.prod.yml pull

# 滚动重启（先停后起，有短暂停机）
docker compose -f docker-compose.prod.yml up -d

# 清理旧镜像
docker image prune -f
```

---

## 本地开发启动

### 系统要求

- Python 3.11+
- Node.js 18+
- Redis（本地或 Docker）
- PostgreSQL（本地或 Docker，也可用 SQLite 快速启动）

### 方式一：uv（推荐）

```bash
# 后端
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 新终端：Celery worker
cd backend
uv run celery -A app.core.celery_app worker --loglevel=info -P solo --queues=high,default,low

# 新终端：Celery beat（定时任务）
cd backend
uv run celery -A app.core.celery_app beat --loglevel=info

# 前端
cd web
npm install --legacy-peer-deps
npm run dev
```

### 方式二：venv + pip

```bash
# 后端（Linux/macOS）
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 后端（Windows PowerShell）
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd web
npm install --legacy-peer-deps
npm run dev
```

### 方式三：本地 Docker Compose（含 build）

```bash
cp .env.docker.example .env
docker compose up --build
```

访问地址：
- 前端：`http://localhost:8080`
- 后端：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`

---

## API 文档

> API 文档仅在 `DEBUG=true` 时可访问。

- Swagger UI：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`
- 健康检查：`http://localhost:8000/health`
- 系统信息：`http://localhost:8000/info`

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/register` | 注册 |
| GET | `/api/v1/users/me` | 当前用户信息 |
| POST | `/api/v1/attacks/{algo}/submit` | 异步提交攻击任务 |
| GET | `/api/v1/tasks/{task_id}` | 查询任务状态 |
| GET | `/api/v1/tasks/queue-status` | 队列状态（公开） |
| POST | `/api/v1/robustness/evaluate` | 提交鲁棒性评估 |
| POST | `/api/v1/sensitivity/scan` | 提交参数敏感性扫描 |
| GET | `/api/v1/leaderboard` | 模型鲁棒性排行榜 |
| POST | `/api/v1/files/upload` | 上传图片（去重） |
| GET | `/api/v1/files/my-uploads` | 我的图片库 |
| GET | `/api/v1/admin/dashboard` | 管理员系统概览 |

---

## 攻击算法

| 算法 | 类型 | 范数 | Celery 队列 | 特点 |
|------|------|------|-------------|------|
| FGSM | 单步 | L∞ | `high` | 最快速的梯度攻击 |
| I-FGSM | 迭代 | L∞ | `default` | FGSM 迭代版，攻击更精细 |
| PGD | 迭代 | L∞/L2 | `default` | 带投影梯度下降，最强 L∞ |
| C&W | 优化 | L2 | `low` | 基于优化，绕过防御能力强 |
| DeepFool | 几何 | L2 | `low` | 最小扰动，寻找最近决策边界 |

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `admin123` |

> ⚠️ **生产部署后请立即通过管理后台修改默认密码。**

---

## 常见问题

**Q：服务器启动时报 `SECRET_KEY is required`？**  
A：`.env` 文件中未设置 `SECRET_KEY` 或 `JWT_SECRET_KEY`，参考[环境变量说明](#3-环境变量说明)生成并填写。

**Q：前端页面空白或 API 请求 404？**  
A：检查 `VITE_API_BASE_URL` 是否正确。同域部署（前后端同一服务器）时应留空，由 Nginx 代理 `/api/`。

**Q：Celery 任务一直 pending，不执行？**  
A：检查 `celery` 容器是否正常运行：`docker compose -f docker-compose.prod.yml logs celery`。确认 Redis 连接正常。

**Q：模型首次加载很慢？**  
A：PyTorch 模型权重在首次请求时从网络下载并缓存到 `backend_models` 数据卷。后续重启不会重新下载。

**Q：如何备份数据库？**  
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U xinghe xinghe_lab > backup_$(date +%Y%m%d).sql
```
