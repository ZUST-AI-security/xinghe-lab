# 星河智安 (XingHe ZhiAn) - AI安全攻击可视化平台

## 📁 项目结构

```
xinghe-lab/
├── web/                     # 前端项目 (React + Ant Design)
│   ├── src/
│   │   ├── api/            # API接口调用
│   │   │   └── attacks/    # 攻击算法API
│   │   │       └── fgsm.js   # FGSM攻击API
│   │   ├── pages/          # 页面组件
│   │   │   └── Attacks/    # 攻击页面
│   │   │       └── FGSMAttack/ # FGSM攻击模块
│   │   │           ├── index.jsx
│   │   │           ├── components/
│   │   │           └── hooks/
│   │   ├── api/client.js   # HTTP客户端配置
│   │   ├── App.jsx         # 主应用组件
│   │   └── index.js        # 应用入口
│   ├── package.json        # 前端依赖配置
│   └── .env                # 环境变量配置
│
├── backend/                 # 后端项目 (Python + FastAPI)
│   ├── app/
│   │   ├── api/v1/         # API路由
│   │   │   └── endpoints/attacks/
│   │   │       └── fgsm.py   # FGSM攻击API端点
│   │   ├── core/           # 核心配置
│   │   │   ├── models/     # AI模型管理
│   │   │   │   └── resnet/ # ResNet模型
│   │   │   └── config.py   # 应用配置
│   │   ├── services/       # 业务逻辑
│   │   │   └── attacks/    # 攻击算法服务
│   │   │       ├── fgsm.py   # FGSM攻击实现
│   │   │       ├── base.py # 攻击算法基类
│   │   │       └── registry.py # 攻击算法注册
│   │   ├── schemas/        # 数据验证
│   │   │   └── attacks/fgsm.py # FGSM数据验证
│   │   ├── utils/          # 工具函数
│   │   │   └── image_utils.py # 图片处理工具
│   │   └── main.py         # 应用入口
│   ├── requirements.txt    # 后端依赖配置
│   └── venv/               # Python虚拟环境
│
├── README.md               # 项目说明文档
└── 开发团队成员算法开发规范（必看）.md # 开发指南
```

## 🚀 快速启动

### 📋 系统要求

**通用要求：**
- Python 3.8+ (推荐 3.11)
- Node.js 16+ (推荐 18)
- [可选推荐] [uv 包管理器](https://github.com/astral-sh/uv) 

---

### 🌟 推荐启动方式 (基于 uv)

在系统中已安装 `uv` 包管理器时推荐使用以下快捷指令。

#### 后端与队列服务 (Windows / Linux)
```bash
# 1. 进入后端目录
cd backend

# 2. 从锁文件同步并安装依赖
uv sync

# 3. 数据库配置与迁移 (需确保已在 .env 中正确配置 PostgreSQL URL)
uv run alembic upgrade head

# 4. 启动后端服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

*如果你希望使用完整的异步攻防任务处理逻辑和速率限制，请确保本地 `Redis` 已启动。并使用 `uv` 开启后台协程队列:*
```bash
# = 新开终端，进入 backend =
# 启动 Celery Worker
uv run celery -A app.core.celery_app worker --loglevel=info -P solo

# 启动 Celery Beat 定时清理服务 (定期自动清理历史图片防止爆盘)
uv run celery -A app.core.celery_app beat --loglevel=info
```

#### 前端启动
```bash
# 1. 新开终端，进入前端目录
cd web

# 2. 安装依赖并启动
npm install --legacy-peer-deps
npm run dev
```

---

### 💻 传统启动方式 (基于 venv 和 pip)

如果您未安装 `uv`，可使用传统的虚拟环境建立指令。

#### Windows 传统启动
```powershell
# 后端与数据库初始化
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 另外开启终端，利用同一虚拟环境启动队列
.\venv\Scripts\activate
celery -A app.core.celery_app worker --loglevel=info -P solo
```

#### Linux/macOS 传统启动
```bash
# 后端与数据库初始化
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 新开终端，同样激活环境并启动队列
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info &
celery -A app.core.celery_app beat --loglevel=info &
```

*(前端传统启动步骤与上方 `基于 uv` 中的前端安装描述一致。)*

---

## 🌐 访问地址

启动成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:5173  (或通过控制台提示的本地开发 URL)
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **攻击实验室**: http://localhost:5173/attacks/fgsm

## 🔑 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 🛠️ 开发调试

### 后端调试

```bash
# 查看后端日志
cd backend
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# 测试API健康状态
curl http://localhost:8000/health

# 测试FGSM参数schema
curl http://localhost:8000/api/v1/attacks/fgsm/params/schema
```

### 前端调试

- 打开浏览器开发者工具 (F12)
- 查看Console和Network标签
- 检查API请求响应状态
- 验证图片上传和参数传递

---

## 📚 技术栈

**前端技术**:
- React 18 + Ant Design
- Axios + Zustand状态管理
- JavaScript ES6+ + JSX

**后端技术**:
- Python 3.11 + FastAPI
- PyTorch + ResNet100
- SQLAlchemy + Pydantic

**攻击算法**:
- Carlini & Wagner L2攻击
- ImageNet预训练模型
- Adam优化器 + 二分搜索

---

## 📝 开发规范

详细的开发指南请参考：`开发团队成员算法开发规范（必看）.md`

该文档包含：
- 完整的开发步骤
- 关键错误解决方案
- 性能优化经验
- 开发检查清单

---

<div align="center">

**让AI安全研究更简单、更直观**

Made with ❤️ by 星河智安团队

</div>
