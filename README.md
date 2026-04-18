# 星河智安 AI 安全攻击可视化平台

> **浙江科技大学 · 大数据与智能安全实验室**
> XingHe ZhiAn — AI Security Attack Visualization Platform

本平台为浙江科技大学大数据与智能安全实验室（星河智安实验室）自主研发的对抗攻击可视化与交互实验系统，支持主流对抗样本攻击算法在深度学习分类模型上的演示与分析。

---

## 功能概览

| 功能模块 | 说明 |
|----------|------|
| **攻击算法** | FGSM、I-FGSM、PGD、C&W、DeepFool，支持同步/异步执行 |
| **模型管理** | ResNet-101/152 (ImageNet)；YOLO 检测模型（预留） |
| **可视化** | 原始图/对抗图对比、扰动热力图、Top-5 概率柱状图 |
| **用户系统** | JWT 认证、角色权限（admin/user）、注册/登录 |
| **管理后台** | 系统概览、用户管理、攻击历史、系统日志、系统配置 |
| **异步任务** | Celery + Redis 异步攻击队列，前端轮询进度 |

---

## 技术栈

### 后端
- Python 3.10+、FastAPI 0.104、Uvicorn
- PyTorch 2.6（CPU/GPU）
- SQLAlchemy 2.0 + Alembic（SQLite / PostgreSQL）
- Celery 5.3 + Redis（异步任务）
- Pydantic v2、python-jose (JWT)、passlib (bcrypt)

### 前端
- React 18、Vite 5
- Ant Design 5.12
- Zustand 4（状态管理）
- react-router-dom v6、Axios

---

## 项目结构

```
xinghe-lab/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # 应用入口 & 路由挂载
│   │   ├── algorithms/      # 攻击算法（FGSM/I-FGSM/PGD/CW/DeepFool）
│   │   ├── api/v1/          # REST API 路由
│   │   │   ├── auth.py      # 认证（注册/登录/刷新）
│   │   │   ├── users.py     # 用户管理
│   │   │   ├── admin.py     # 管理后台 API
│   │   │   ├── models.py    # 模型管理
│   │   │   └── attacks/     # 攻击算法路由
│   │   ├── core/            # 配置、数据库、安全
│   │   ├── ml_models/       # ML 模型注册与加载
│   │   ├── models/          # ORM 模型
│   │   ├── schemas/         # Pydantic schema
│   │   ├── utils/           # 工具函数
│   │   └── workers/         # Celery 异步任务
│   ├── alembic/             # 数据库迁移
│   ├── models/checkpoints/  # 模型权重文件
│   └── requirements.txt
├── web/                     # React 前端
│   ├── src/
│   │   ├── api/             # API 客户端
│   │   ├── components/      # 通用组件 & 布局
│   │   ├── pages/           # 页面
│   │   │   ├── Attacks/     # 攻击算法页面
│   │   │   ├── Admin/       # 管理后台页面
│   │   │   ├── Dashboard/   # 首页仪表盘
│   │   │   └── Auth/        # 登录/注册
│   │   ├── store/           # Zustand 状态管理
│   │   └── hooks/           # 自定义 Hooks
│   └── package.json
└── README.md
```

---

## 快速开始

### 环境要求
- Python >= 3.10
- Node.js >= 18
- Redis（仅异步任务需要）
- PostgreSQL（生产环境推荐；开发可用 SQLite）

### 1. 克隆仓库

```bash
git clone https://github.com/ZUST-AI-security/xinghe-lab.git
cd xinghe-lab
```

### 2. 后端部署

```powershell
cd backend

# 创建并激活虚拟环境
python -m venv .venv
.\.venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 或者使用uv进行项目管理，运行命令的时候uv run xxx即可

# 配置环境变量（编辑 .env）
# DATABASE_URL=sqlite:///./xinghe_zhi_an.db  (开发)
# DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/xinghe  (生产)

# 数据库迁移
alembic upgrade head

# 启动
.\run_backend.ps1
# 或
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

首次启动会自动创建数据库表并生成默认管理员账号。

### 3. 前端部署

```bash
cd web
npm install
npm run dev        # 开发模式 → http://localhost:5173
npm run build      # 生产构建
```

### 4. 异步任务

```powershell
cd backend
.\.venv\Scripts\activate
celery -A app.workers.celery_app worker --loglevel=info
```

---

## API 文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 登录 |
| POST | /api/v1/auth/register | 注册 |
| GET | /api/v1/users/me | 当前用户 |
| GET | /api/v1/users/ | 用户列表（管理员） |
| POST | /api/v1/attacks/fgsm/run | FGSM 同步攻击 |
| POST | /api/v1/attacks/ifgsm/run | I-FGSM 同步攻击 |
| POST | /api/v1/attacks/pgd/run | PGD 同步攻击 |
| POST | /api/v1/attacks/cw/run | C&W 同步攻击 |
| POST | /api/v1/attacks/deepfool/run | DeepFool 同步攻击 |
| POST | /api/v1/attacks/{algo}/submit | 异步提交 |
| GET | /api/v1/admin/dashboard | 系统概览 |

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

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

> 生产部署后请立即修改默认密码。

---

实验室主页: https://lab.rjmart.cn/10366/AISecurityLab
