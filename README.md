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

### 后端
- Python 3.12、FastAPI、Uvicorn
- PyTorch 2.6（CPU/GPU）
- SQLAlchemy 2.0 + Alembic（SQLite / PostgreSQL）
- Celery 5 + Redis（异步任务）
- Pydantic v2、python-jose (JWT)、passlib (bcrypt)

### 前端
- React 18、Vite 5
- Ant Design 5、Aceternity UI、MagicUI
- Zustand（状态管理）
- react-router-dom v6、Axios

---

## 快速启动（开发环境）

### 系统要求
- Python 3.10+（推荐 3.12）
- Node.js 18+
- Redis（异步任务需要）

### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制并编辑环境配置
cp .env.example .env
# 编辑 .env，设置 SECRET_KEY、JWT_SECRET_KEY 等

# 数据库迁移
alembic upgrade head

# 启动
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd web
npm install --legacy-peer-deps
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端 API 在 `http://localhost:8000`。

---

## Docker 生产部署

### 系统要求
- Docker 24+
- Docker Compose V2
- 域名（可选，用于 SSL）

### 1. 配置环境变量

```bash
cp .env.production .env
```

编辑 `.env`，**必须替换**以下占位符：

| 变量 | 说明 | 生成命令 |
|------|------|----------|
| `SECRET_KEY` | 应用密钥 | `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | JWT 签名密钥 | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | 数据库密码 | `openssl rand -hex 16` |
| `REDIS_PASSWORD` | Redis 密码 | `openssl rand -hex 16` |
| `CORS_ORIGINS` | 允许的前端域名 | `["https://yourdomain.com"]` |

### 2. 一键部署

```bash
# 构建前端
cd web && npm install && npm run build && cd ..

# Docker 部署
./scripts/deploy.sh
```

### 3. SSL 证书（可选）

```bash
./scripts/init-ssl.sh yourdomain.com
```

### 4. 常用命令

```bash
docker compose up -d          # 启动所有服务
docker compose down            # 停止所有服务
docker compose logs -f         # 查看日志
docker compose logs -f backend # 查看后端日志
docker compose ps              # 查看服务状态
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
