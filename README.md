# 星河智安 (XingHe ZhiAn) - AI安全攻击可视化平台

基于 FastAPI + React 的 AI 对抗样本攻击可视化平台，支持 C&W L2 攻击算法。

---

## 📁 项目结构

```
xinghe-lab/
├── backend/                 # 后端 (FastAPI)
│   ├── app/
│   │   ├── api/                 # API 路由 (扁平化)
│   │   │   ├── attacks/         # 攻击端点 (cw, algorithms)
│   │   │   ├── v1/              # v1 端点 (auth, models, users)
│   │   │   └── deps.py
│   │   ├── core/                # 核心配置
│   │   ├── db/entities/         # 数据库模型
│   │   ├── schemas/             # Pydantic 模型
│   │   ├── services/            # 业务逻辑
│   │   │   ├── attacks/         # 攻击算法
│   │   │   └── model_manager/   # 模型管理
│   │   ├── tasks/               # Celery 任务 (扁平化)
│   │   ├── utils/               # 工具函数
│   │   ├── workers/             # Celery 配置
│   │   └── main.py              # 应用入口
│   ├── pyproject.toml
│   └── .env.example
│
├── web/                     # 前端 (React)
│   ├── src/
│   │   ├── components/          # 组件 (扁平化)
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── layout/
│   │   │   └── visualization/
│   │   ├── pages/               # 页面
│   │   ├── hooks/
│   │   ├── services/api/
│   │   ├── store/
│   │   └── App.jsx
│   └── package.json
│
├── infra/redis/             # Redis 服务
├── data/                    # 数据文件
└── scripts/                 # 项目脚本
```

---

## 🚀 快速启动

### 环境要求
- Python 3.12+
- Node.js 18+
- Windows/Linux/macOS

### 后端启动

```powershell
cd backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
copy .env.example .env

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端启动

```powershell
cd web

# 安装依赖
npm install --legacy-peer-deps

# 配置环境变量 (PowerShell)
@'
HOST=localhost
SKIP_PREFLIGHT_CHECK=true
REACT_APP_API_BASE_URL=http://localhost:8000
DANGEROUSLY_DISABLE_HOST_CHECK=true
'@ | Set-Content -Path .env -Encoding utf8

# 启动服务
npm start
```

---

## 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |

---

## 🔑 默认账号

- 用户名: `admin`
- 密码: `admin123`

---

## 📚 技术栈

**后端**
- FastAPI + Uvicorn
- SQLAlchemy + SQLite
- PyTorch + TorchVision
- Celery + Redis (可选)

**前端**
- React 18 + React Router
- Ant Design 5
- Axios + Zustand
- Recharts

**算法**
- C&W L2 攻击 (Carlini & Wagner)
- ResNet100 (ImageNet)
- YOLOv8 (目标检测)

---

## 🛠️ 开发规范

1. **后端代码**: 按领域分层 (`api/`, `services/`, `schemas/`)
2. **前端代码**: 组件按功能分类 (`common/`, `layout/`, `dashboard/`)
3. **命名规范**: 使用小写 + 下划线 (Python), 驼峰 (JavaScript)
4. **数据库模型**: 放在 `db/entities/` (避免与 `models/` 目录混淆)

---

<div align="center">

**让AI安全研究更简单、更直观**

Made with ❤️ by 星河智安团队

</div>
