"""
星河智安 (XingHe ZhiAn) - FastAPI主应用入口
AI安全攻击可视化平台的后端服务
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import create_tables
from .core.exceptions import (
    XingHeException,
    xinghe_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from .api.v1.endpoints import auth, models, attacks, users
from .utils.logger import setup_logging

# 设置日志
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    # 启动时执行
    logger.info("=" * 50)
    logger.info("🚀 星河智安 AI安全攻击可视化平台启动中...")
    logger.info(f"📋 应用名称: {settings.app_name}")
    logger.info(f"🔧 版本: {settings.app_version}")
    logger.info(f"🌍 环境: {'开发环境' if settings.is_development else '生产环境'}")
    logger.info(f"💾 数据库: {settings.database_url}")
    logger.info(f"🔴 Redis: {settings.redis_url}")
    
    try:
        # 创建数据库表
        create_tables()
        logger.info("✅ 数据库表创建完成")
        
        # 创建内置测试用户
        from .core.database import SessionLocal
        from .models.user import User
        from .core.security import get_password_hash
        
        db = SessionLocal()
        try:
            # 检查是否已存在admin用户
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                # 创建admin用户
                hashed_password = get_password_hash("admin123")
                admin_user = User(
                    username="admin",
                    email="admin@xinghe.com",
                    hashed_password=hashed_password,
                    is_active=True,
                    is_superuser=True
                )
                db.add(admin_user)
                db.commit()
                logger.info("✅ 内置admin用户创建成功")
            else:
                logger.info("ℹ️ admin用户已存在")
        except Exception as e:
            logger.error(f"❌ 创建内置用户失败: {e}")
            db.rollback()
        finally:
            db.close()
        
        # 导入模型以触发注册
        from .services.model_manager import model_registry
        from .services.attacks import attack_registry
        
        # 检查模型注册情况
        model_stats = model_registry.get_stats()
        logger.info(f"🤖 已注册模型: {model_stats['total_models']} 个")
        logger.info(f"   - 分类模型: {model_stats['types'].get('classification', 0)} 个")
        logger.info(f"   - 检测模型: {model_stats['types'].get('detection', 0)} 个")
        
        # 检查攻击算法注册情况
        attack_stats = attack_registry.get_stats()
        logger.info(f"⚔️ 已注册攻击算法: {attack_stats['total_attacks']} 个")
        
        logger.info("✅ 星河智安平台启动完成!")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"❌ 启动失败: {str(e)}", exc_info=True)
        raise
    
    yield
    
    # 关闭时执行
    logger.info("🛑 星河智安平台正在关闭...")

# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    description="""
    ## 星河智安 AI安全攻击可视化平台
    
    ### 功能特性
    - 🤖 **多模型支持**: ResNet100 (ImageNet) + YOLOv8 (COCO)
    - ⚔️ **攻击算法**: C&W L2攻击（首个实现）
    - 🔄 **异步处理**: Celery任务队列，支持长时间攻击
    - 📊 **可视化**: 热力图、置信度变化、对比展示
    - 🔐 **安全认证**: JWT用户认证和权限管理
    - 📝 **历史记录**: 完整的攻击历史追踪
    
    ### 技术栈
    - **后端**: FastAPI + PyTorch + Celery + Redis
    - **AI模型**: ResNet100 (ImageNet) + YOLOv8
    - **攻击算法**: Carlini & Wagner (C&W) L2攻击
    - **前端**: React + Ant Design + Recharts
    
    ### API文档
    - Swagger UI: `/docs`
    - ReDoc: `/redoc`
    """,
    version=settings.app_version,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan
)

# 添加CORS中间件
if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 添加受信任主机中间件（生产环境）
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
    )

# 添加请求处理时间中间件
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """添加请求处理时间头"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# 注册异常处理器
app.add_exception_handler(XingHeException, xinghe_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# 包含API路由
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["认证"]
)

app.include_router(
    models.router,
    prefix="/api/v1/models",
    tags=["模型管理"]
)

app.include_router(
    attacks.router,
    prefix="/api/v1/attacks",
    tags=["攻击算法"]
)

app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["用户管理"]
)

# 根路径
@app.get("/", tags=["系统"])
async def root():
    """
    根路径，返回系统信息
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "AI安全攻击可视化平台",
        "status": "running",
        "docs": "/docs" if settings.is_development else None
    }

# 健康检查
@app.get("/health", tags=["系统"])
async def health_check():
    """
    健康检查接口
    """
    try:
        # 检查数据库连接
        from .core.database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        # 检查Redis连接
        import redis
        r = redis.from_url(settings.redis_url)
        r.ping()
        
        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected",
            "timestamp": time.time()
        }
        
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": time.time()
            }
        )

# 系统信息
@app.get("/info", tags=["系统"])
async def system_info():
    """
    获取系统信息
    """
    from .services.model_manager import model_registry
    from .services.attacks import attack_registry
    
    model_stats = model_registry.get_stats()
    attack_stats = attack_registry.get_stats()
    
    return {
        "app": {
            "name": settings.app_name,
            "version": settings.app_version,
            "environment": "development" if settings.is_development else "production"
        },
        "models": model_stats,
        "attacks": attack_stats,
        "features": {
            "classification": model_stats['types'].get('classification', 0) > 0,
            "detection": model_stats['types'].get('detection', 0) > 0,
            "async_tasks": True,
            "user_auth": True,
            "attack_history": True
        }
    }

# 开发模式下的调试信息
if settings.is_development:
    @app.get("/debug", tags=["调试"])
    async def debug_info():
        """
        调试信息（仅开发环境）
        """
        from .services.model_manager import model_registry
        from .services.attacks import attack_registry
        
        return {
            "models": model_registry.list_models(),
            "attacks": attack_registry.list_attacks(),
            "config": {
                "database_url": settings.database_url,
                "redis_url": settings.redis_url,
                "cors_origins": settings.cors_origins
            }
        }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level="info"
    )
