#!/bin/bash
# 星河智安快速启动脚本

echo "🚀 星河智安 AI安全攻击可视化平台 - 快速启动"
echo "=================================================="

# 进入API目录
cd api

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "📦 激活虚拟环境..."
source venv/bin/activate

# 安装基础依赖
echo "📦 安装基础依赖..."
pip install fastapi uvicorn sqlalchemy pydantic-settings python-jose[cryptography] passlib[bcrypt] python-multipart --quiet

# 创建环境配置
if [ ! -f ".env" ]; then
    echo "📝 创建环境配置..."
    cat > .env << EOF
# 星河智安 (XingHe ZhiAn) - 环境配置
APP_NAME="星河智安 AI安全攻击可视化平台"
APP_VERSION="1.0.0"
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=sqlite:///./xinghe_zhi_an.db
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
MODEL_CACHE_DIR=./models
MAX_FILE_SIZE_MB=10
ALLOWED_IMAGE_TYPES=["jpg", "jpeg", "png", "bmp", "tiff"]
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
EOF
fi

# 创建数据库表
echo "🗄️ 创建数据库表..."
python -c "
from app.core.database import create_tables
create_tables()
print('✅ 数据库表创建完成')
" 2>/dev/null || echo "⚠️ 数据库表可能已存在"

# 创建演示用户
echo "👤 创建演示用户..."
python -c "
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

db = SessionLocal()
try:
    existing = db.query(User).filter(User.username == 'demo').first()
    if not existing:
        demo_user = User(
            username='demo',
            email='demo@xinghe.com',
            full_name='演示用户',
            hashed_password=get_password_hash('demo123456'),
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        print('✅ 演示用户创建成功')
        print('   用户名: demo')
        print('   密码: demo123456')
    else:
        print('✅ 演示用户已存在')
        print('   用户名: demo')
        print('   密码: demo123456')
except Exception as e:
    print(f'❌ 创建用户失败: {e}')
finally:
    db.close()
" 2>/dev/null || echo "⚠️ 演示用户可能已存在"

# 启动后端服务
echo "🚀 启动后端服务 (端口8000)..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
    echo "🌐 后端API: http://localhost:8000"
    echo "📚 API文档: http://localhost:8000/docs"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

# 进入前端目录
cd ../web

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install --silent --legacy-peer-deps 2>/dev/null || echo "⚠️ 前端依赖可能已安装"

# 创建前端环境配置
if [ ! -f ".env" ]; then
    echo "📝 创建前端环境配置..."
    cat > .env << EOF
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_API_VERSION=v1
REACT_APP_ENABLE_DEBUG=true
EOF
fi

# 启动前端服务
echo "🚀 启动前端服务 (端口3000)..."
npm start &
FRONTEND_PID=$!

# 等待前端启动
sleep 5

# 检查前端是否启动成功
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ 前端服务启动成功 (PID: $FRONTEND_PID)"
    echo "🌐 前端应用: http://localhost:3000"
else
    echo "❌ 前端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 星河智安平台启动完成！"
echo "=================================="
echo "🌐 访问地址："
echo "   前端应用: http://localhost:3000"
echo "   后端API:  http://localhost:8000"
echo "   API文档:  http://localhost:8000/docs"
echo ""
echo "👤 演示账号："
echo "   用户名: demo"
echo "   密码:   demo123456"
echo ""
echo "🛑 停止服务："
echo "   停止后端: kill $BACKEND_PID"
echo "   停止前端: kill $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 保存进程ID
echo $BACKEND_PID > /tmp/xinghe-backend.pid
echo $FRONTEND_PID > /tmp/xinghe-frontend.pid

# 设置信号处理
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# 等待用户输入
while true; do
    sleep 1
done
