# 星河智安实验室平台 (Xinghe Intelligence Security Lab Platform)

一个现代化、集成化的安全实验室管理平台。

## 项目架构

- **后端 (`api/`)**: 基于 FastAPI 构建的异步 Python 后端。
- **前端 (`web/`)**: 基于 React + Vite + Ant Design 构建的响应式前端。

## 快速启动

### 后端 (api)

1. 进入 `api` 目录:
   ```bash
   cd api
   ```
2. 创建虚拟环境 (推荐):
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. 安装依赖:
   ```bash
   pip install -r requirements.txt
   ```
4. 启动服务:
   ```bash
   uvicorn app.main:app --reload
   ```
5. 访问文档: `http://localhost:8000/docs`

### 前端 (web)

1. 进入 `web` 目录:
   ```bash
   cd web
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 启动开发服务器:
   ```bash
   npm run dev
   ```
4. 访问页面: `http://localhost:5173`

## 目录结构

```text
xinghe-lab/
├── api/                # FastAPI 后端
│   ├── app/            # 核心逻辑
│   │   ├── api/        # 路由
│   │   ├── core/       # 配置
│   │   ├── models/     # 数据库模型
│   │   └── schemas/    # Pydantic 模型
│   └── requirements.txt
├── web/                # React 前端
│   ├── src/
│   │   ├── components/ # 通用组件
│   │   ├── pages/      # 页面组件
│   │   └── App.jsx     # 主路由
│   └── package.json
└── README.md
```
