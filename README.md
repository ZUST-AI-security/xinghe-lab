# 星河智安 (XingHe ZhiAn) - AI安全攻击可视化平台

## 📁 项目结构

```
xinghe-lab/
├── web/                     # 前端项目 (React + Ant Design)
│   ├── src/
│   │   ├── api/            # API接口调用
│   │   │   └── attacks/    # 攻击算法API
│   │   │       └── cw.js   # C&W攻击API
│   │   ├── pages/          # 页面组件
│   │   │   └── Attacks/    # 攻击页面
│   │   │       └── CWAttack/ # C&W攻击模块
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
│   │   │       └── cw.py   # C&W攻击API端点
│   │   ├── core/           # 核心配置
│   │   │   ├── models/     # AI模型管理
│   │   │   │   └── resnet/ # ResNet模型
│   │   │   └── config.py   # 应用配置
│   │   ├── services/       # 业务逻辑
│   │   │   └── attacks/    # 攻击算法服务
│   │   │       ├── cw.py   # C&W攻击实现
│   │   │       ├── base.py # 攻击算法基类
│   │   │       └── registry.py # 攻击算法注册
│   │   ├── schemas/        # 数据验证
│   │   │   └── attacks/cw.py # C&W数据验证
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
- Python 3.8+ (推荐3.11)
- Node.js 16+ (推荐18)
- 现代浏览器 (Chrome、Firefox、Safari、Edge)

---

### 💻 Windows系统

#### 后端启动

```powershell
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python -m venv venv

# 3. 激活虚拟环境
.\venv\Scripts\activate

# 4. 安装依赖
pip install -r requirements.txt
pip install email-validator python-multipart torch torchvision pillow

# 5. 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端启动

```powershell
# 1. 新开PowerShell窗口，进入前端目录
cd web

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 配置环境变量
echo SKIP_PREFLIGHT_CHECK=true > .env
echo REACT_APP_API_BASE_URL=http://localhost:8000 >> .env

# 4. 启动前端服务
npm start
```

---

### 🐧 Linux/macOS系统

#### 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python3 -m venv venv

# 3. 激活虚拟环境
source venv/bin/activate

# 4. 安装依赖
pip install -r requirements.txt
pip install email-validator python-multipart torch torchvision pillow

# 5. 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端启动

```bash
# 1. 新开终端，进入前端目录
cd web

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 配置环境变量
echo "SKIP_PREFLIGHT_CHECK=true" > .env
echo "REACT_APP_API_BASE_URL=http://localhost:8000" >> .env

# 4. 启动前端服务
npm start
```

---

## 🌐 访问地址

启动成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **C&W攻击页面**: http://localhost:3000/attacks/cw

## 🔑 默认账号

- 用户名：`admin`
- 密码：`admin123`

---

## ⚠️ 常见问题与解决方案

### 1. C&W攻击超时问题

**问题**: `timeout of 30000ms exceeded`

**解决方案**:
- 前端已优化超时设置为60秒
- 后端已优化攻击算法，现在约4秒完成
- 使用默认参数: `max_iter=100`, `binary_search_steps=1`

### 2. JavaScript语法错误

**问题**: 在JSX文件中使用Python注释语法 `#`

**解决方案**:
```javascript
// 错误写法
binary_search_steps: 3,  # Python注释

// 正确写法
binary_search_steps: 3,  // JavaScript注释
```

### 3. 模型注册错误

**问题**: `'RegisteredResNet100' object has no attribute 'model_name'`

**解决方案**:
- 已修复模型构造函数调用
- 统一了ModelType枚举定义
- 确保模型正确继承BaseModel

### 4. 参数验证错误

**问题**: `Input should be less than or equal to 1000`

**解决方案**:
- 前端默认`max_iter`已调整为100
- 参数范围已更新为100-1000
- 滑块步长已优化为50

### 5. Redis连接问题

**问题**: Redis连接失败

**解决方案**:
- Redis为可选组件，不影响核心功能
- C&W攻击使用同步模式，无需Redis
- 如需异步功能，可安装并启动Redis服务

---

## 🎯 C&W攻击使用指南

### 快速测试步骤

1. **访问前端**: http://localhost:3000
2. **登录系统**: 使用admin/admin123
3. **进入C&W攻击**: 点击导航栏"攻击算法" → "C&W Attack"
4. **上传图片**: 支持JPEG、PNG格式，建议224x224像素
5. **调整参数**: 使用默认参数即可快速测试
6. **运行攻击**: 点击"运行攻击"按钮
7. **查看结果**: 约4秒后显示对抗样本和热力图

### 参数优化建议

**快速测试** (默认参数):
- `max_iter`: 100 (最小值)
- `binary_search_steps`: 1 (最小值)
- `c`: 5.0 (高攻击成功率)
- `lr`: 0.05 (快速收敛)

**高质量攻击**:
- `max_iter`: 200-300
- `binary_search_steps`: 3-5
- `c`: 2.0-3.0
- `lr`: 0.01-0.02

---

## 📊 性能优化成果

通过以下优化，C&W攻击性能提升约85%：

1. **减少模型预测频率**: 只在最后迭代检查成功率
2. **启用模型缓存**: 避免重复加载模型
3. **优化算法参数**: 使用快速收敛配置
4. **修复变量作用域**: 解决bool对象错误
5. **前端超时优化**: 从30秒增加到60秒

**优化结果**: 从>30秒超时 → 4秒完成攻击

---

## 🛠️ 开发调试

### 后端调试

```bash
# 查看后端日志
cd backend
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# 测试API健康状态
curl http://localhost:8000/health

# 测试C&W参数schema
curl http://localhost:8000/api/v1/attacks/cw/params/schema
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
