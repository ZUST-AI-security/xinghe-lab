# 星河智安 (XingHe ZhiAn) - AI安全攻击可视化平台

## 📁 项目结构

```
xinghe-zhi-an/
├── web/                    # 前端项目 (React + Ant Design)
│   ├── public/            # 静态资源
│   │   ├── favicon.ico    # 网站图标
│   │   ├── index.html     # HTML模板
│   │   └── manifest.json  # PWA配置
│   ├── src/              # 源代码
│   │   ├── api/         # API接口调用
│   │   │   ├── auth.js   # 认证相关API
│   │   │   ├── client.js # HTTP客户端配置
│   │   │   └── models.js # 模型相关API
│   │   ├── components/   # React组件
│   │   │   ├── Common/  # 通用组件
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   └── LanguageSwitch.jsx
│   │   │   └── Layout/  # 布局组件
│   │   │       └── MainLayout.jsx
│   │   ├── pages/       # 页面组件
│   │   │   ├── Auth/    # 认证页面
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Dashboard/ # 主页
│   │   │   │   ├── components/
│   │   │   │   │   ├── TopNav/
│   │   │   │   │   ├── WelcomeBanner/
│   │   │   │   │   ├── StatCards/
│   │   │   │   │   ├── QuickStart/
│   │   │   │   │   ├── RecentActivity/
│   │   │   │   │   └── ExploreNav/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.jsx
│   │   │   └── Attacks/  # 攻击页面
│   │   │       └── CWAttack.jsx
│   │   ├── hooks/       # 自定义Hook
│   │   │   ├── useAuth.js
│   │   │   └── useCWAttack.js
│   │   ├── store/       # 状态管理
│   │   │   ├── authStore.js
│   │   │   └── modelStore.js
│   │   ├── utils/       # 工具函数
│   │   │   ├── dateUtils.js
│   │   │   └── numberUtils.js
│   │   ├── i18n/        # 国际化
│   │   │   ├── index.js
│   │   │   └── locales/
│   │   │       ├── zh.json
│   │   │       └── en.json
│   │   ├── App.jsx      # 主应用组件
│   │   └── index.js     # 应用入口
│   ├── package.json       # 前端依赖配置
│   └── Dockerfile        # 前端容器配置
│
├── api/                    # 后端项目 (Python + FastAPI)
│   ├── app/              # 应用主目录
│   │   ├── api/         # API路由
│   │   │   └── v1/      # API版本1
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py    # 认证路由
│   │   │       │   ├── users.py   # 用户管理
│   │   │       │   ├── models.py  # 模型管理
│   │   │       │   └── attacks/  # 攻击算法
│   │   │       │       └── cw.py     # C&W攻击
│   │   │       └── __init__.py
│   │   ├── core/        # 核心配置
│   │   │   ├── config.py    # 应用配置
│   │   │   ├── database.py  # 数据库配置
│   │   │   ├── security.py  # 安全认证
│   │   │   └── logger.py   # 日志配置
│   │   ├── models/      # 数据模型
│   │   │   ├── user.py     # 用户模型
│   │   │   ├── model.py    # AI模型
│   │   │   └── history.py  # 攻击历史
│   │   ├── schemas/     # 数据验证
│   │   │   ├── user.py
│   │   │   ├── model.py
│   │   │   └── attack.py
│   │   ├── services/    # 业务逻辑
│   │   │   ├── auth_service.py
│   │   │   ├── model_service.py
│   │   │   └── attack_service.py
│   │   ├── utils/       # 工具函数
│   │   │   └── logger.py
│   │   ├── workers/     # 异步任务
│   │   │   └── celery_app.py
│   │   └── main.py      # 应用入口
│   ├── requirements.txt   # 后端依赖配置
│   ├── .env.example      # 环境变量模板
│   ├── logs/            # 日志文件
│   └── Dockerfile        # 后端容器配置
│
├── docker-compose.yml      # Docker编排配置
├── Makefile             # 便捷命令
├── quick-start.sh        # 快速启动脚本
├── start-services.sh     # 服务启动脚本
├── stop-services.sh      # 服务停止脚本
└── README.md            # 项目说明文档
```

## 🚀 从零开始启动指南

### 📋 前置要求

**通用要求：**
- Git
- Docker (可选，推荐)
- 现代浏览器 (Chrome、Firefox、Safari、Edge)

**Windows要求：**
- Windows 10/11
- Python 3.8+ (推荐3.11)
- Node.js 16+ (推荐18)
- Redis (可选)

**Linux要求：**
- Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- Python 3.8+ (推荐3.11)
- Node.js 16+ (推荐18)
- Redis (可选)

---

## 🐳 方式一：Docker部署 (推荐初学者)

### Windows系统

```powershell
# 1. 克隆项目
git clone https://github.com/ZUST-AI-security/xinghe-lab.git
cd xinghe-lab
git checkout yunzen

# 2. 启动所有服务 (PowerShell)
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志 (可选)
docker-compose logs -f

# 5. 停止服务
docker-compose down
```

### Linux/macOS系统

```bash
# 1. 克隆项目
git clone https://github.com/ZUST-AI-security/xinghe-lab.git
cd xinghe-lab
git checkout yunzen

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志 (可选)
docker-compose logs -f

# 5. 停止服务
docker-compose down
```

---

## 💻 方式二：本地开发 (推荐开发者)

### 🔧 后端设置 (api目录)

#### Windows系统

```powershell
# 1. 进入后端目录
cd api

# 2. 创建Python虚拟环境
python -m venv venv

# 3. 激活虚拟环境
.\venv\Scripts\activate

# 4. 升级pip
python -m pip install --upgrade pip

# 5. 安装Python依赖
pip install -r requirements.txt

# 6. 配置环境变量
copy .env.example .env
# 使用记事本或VS Code编辑 .env 文件
notepad .env

# 7. 创建数据库和初始用户
python -c "
from app.core.database import engine, Base
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)
db = Session(engine)

# 创建管理员用户
if not db.query(User).filter(User.username == 'admin').first():
    admin_user = User(
        username='admin',
        email='admin@xinghe.com',
        full_name='管理员',
        hashed_password=get_password_hash('admin123'),
        is_active=True,
        is_superuser=True
    )
    db.add(admin_user)
    db.commit()
    print('✅ 管理员用户创建成功')
else:
    print('✅ 管理员用户已存在')

db.close()
"

# 8. 启动后端API服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 9. 启动异步任务处理 (新开PowerShell窗口)
.\venv\Scripts\activate
celery -A app.workers.celery_app worker --loglevel=info
```

#### Linux/macOS系统

```bash
# 1. 进入后端目录
cd api

# 2. 创建Python虚拟环境
python3 -m venv venv

# 3. 激活虚拟环境
source venv/bin/activate

# 4. 升级pip
python -m pip install --upgrade pip

# 5. 安装Python依赖
pip install -r requirements.txt

# 6. 配置环境变量
cp .env.example .env
# 使用编辑器修改 .env 文件
nano .env  # 或 vim .env

# 7. 创建数据库和初始用户
python -c "
from app.core.database import engine, Base
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)
db = Session(engine)

# 创建管理员用户
if not db.query(User).filter(User.username == 'admin').first():
    admin_user = User(
        username='admin',
        email='admin@xinghe.com',
        full_name='管理员',
        hashed_password=get_password_hash('admin123'),
        is_active=True,
        is_superuser=True
    )
    db.add(admin_user)
    db.commit()
    print('✅ 管理员用户创建成功')
else:
    print('✅ 管理员用户已存在')

db.close()
"

# 8. 启动后端API服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 9. 启动异步任务处理 (新开终端)
source venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

### 🎨 前端设置 (web目录)

#### Windows系统

```powershell
# 1. 进入前端目录
cd web

# 2. 检查Node.js版本
node --version  # 应该 >= 16.0.0
npm --version   # 应该 >= 8.0.0

# 3. 安装Node.js依赖
npm install

# 4. 配置环境变量
copy .env.example .env
# 使用记事本或VS Code编辑 .env 文件
notepad .env

# 5. 启动前端开发服务器
npm start

# 6. 如果端口被占用，指定其他端口
$env:PORT=3001; npm start
```

#### Linux/macOS系统

```bash
# 1. 进入前端目录
cd web

# 2. 检查Node.js版本
node --version  # 应该 >= 16.0.0
npm --version   # 应该 >= 8.0.0

# 3. 安装Node.js依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 使用编辑器修改 .env 文件
nano .env  # 或 vim .env

# 5. 启动前端开发服务器
npm start

# 6. 如果端口被占用，指定其他端口
PORT=3001 npm start
```

---

## 🌐 访问地址

启动成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8000  
- **API文档**: http://localhost:8000/docs
- **任务监控**: http://localhost:5555 (如果启动了Celery)

---

## 🔑 默认账号

**管理员账号：**
- 用户名：`admin`
- 密码：`admin123`
- 权限：超级管理员

---

## 🛠️ 便捷脚本

### Windows系统

```powershell
# 快速启动所有服务
.\quick-start.sh

# 启动服务
.\start-services.sh

# 停止服务
.\stop-services.sh
```

### Linux/macOS系统

```bash
# 快速启动所有服务
./quick-start.sh

# 启动服务
./start-services.sh

# 停止服务
./stop-services.sh
```

---

## 📂 详细目录说明

### 📂 web/ - 前端项目

前端使用React + Ant Design构建，提供现代化的用户界面。

**核心特性：**
- ⚛️ React 18 + React Router v6
- 🎨 Ant Design 5.x UI组件库
- 🌍 react-i18next 国际化支持
- 🔄 Zustand 状态管理
- 📱 响应式设计
- 🔐 JWT认证
- 📊 数据可视化

**主要目录：**
- `src/api/` - API接口调用，包含认证、模型、攻击算法等接口
- `src/components/` - 可复用的React组件
- `src/pages/` - 页面级组件，包含认证、Dashboard、攻击页面
- `src/hooks/` - 自定义React Hook，处理认证、攻击逻辑
- `src/store/` - 全局状态管理，使用Zustand
- `src/utils/` - 工具函数，日期格式化、数字处理等
- `src/i18n/` - 国际化配置，支持中英文

### 📂 api/ - 后端项目

后端使用Python + FastAPI构建，提供高性能的AI模型和攻击算法服务。

**核心特性：**
- 🚀 FastAPI 高性能Web框架
- 🗄️ SQLAlchemy ORM + SQLite数据库
- 🔐 JWT认证 + 密码哈希
- 📋 Pydantic数据验证
- 📊 自动生成API文档
- 🌿 Celery异步任务处理

**主要目录：**
- `app/api/` - API路由定义，按版本和功能模块组织
- `app/core/` - 核心配置，数据库、认证、安全、日志
- `app/models/` - 数据库模型定义，用户、模型、攻击历史
- `app/services/` - 业务逻辑，模型管理、攻击算法服务
- `app/utils/` - 工具函数，日志记录等
- `app/workers/` - 异步任务处理，长时间运行的攻击任务

---

## 🎯 使用流程

1. **启动服务**：按照上述步骤启动前后端服务
2. **访问应用**：打开 http://localhost:3000
3. **用户登录**：使用默认管理员账号登录
4. **浏览主页**：查看平台概况和快速开始
5. **开始攻击**：点击"图像分类攻击"进入C&W攻击页面
6. **上传图片**：选择要测试的图片文件
7. **选择模型**：选择要攻击的AI模型（ResNet100）
8. **调节参数**：根据需要调整攻击算法参数
9. **运行攻击**：点击运行按钮执行攻击
10. **查看结果**：观察对比滑块、热力图和置信度变化

---

## 🐛 常见问题

### Windows系统

**Q: Python虚拟环境激活失败**
```powershell
# 解决方案：使用PowerShell而不是CMD
# 或手动激活
.\venv\Scripts\activate.ps1
```

**Q: npm install 权限错误**
```powershell
# 解决方案：以管理员身份运行PowerShell
# 或使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

**Q: 端口被占用**
```powershell
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# 结束进程
taskkill /PID <进程ID> /F
```

### Linux/macOS系统

**Q: Python版本过低**
```bash
# 解决方案：安装Python 3.11
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-pip
```

**Q: Node.js版本过低**
```bash
# 解决方案：使用nvm安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**Q: 端口被占用**
```bash
# 查看端口占用
lsof -i :3000
lsof -i :8000

# 结束进程
kill -9 <进程ID>
```

---

## 📞 技术支持

如果遇到问题，请：

1. 查看控制台错误信息
2. 检查服务是否正常启动
3. 确认网络连接正常
4. 参考上述常见问题解决方案

---

## 🛠️ Makefile命令

```bash
# 查看所有可用命令
make help

# 安装所有依赖
make install

# 启动开发服务器
make run

# 运行测试
make test

# Docker相关命令
make docker-up    # 启动Docker服务
make docker-down  # 停止Docker服务
```

---

<div align="center">

**让AI安全研究更简单、更直观**

Made with ❤️ by 星河智安团队

</div>
