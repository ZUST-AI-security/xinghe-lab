"""
XingHe ZhiAn — FastAPI application entry point.

Start with:
    .venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import initialize_database, ensure_required_tables
from app.core.exceptions import (
    XingHeException,
    xinghe_exception_handler,
    general_exception_handler,
)
from app.utils.logger import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info(" 星河智安 AI安全攻击可视化平台启动中...")
    logger.info(f" 版本: {settings.app_version} | 环境: {'dev' if settings.is_development else 'prod'}")

    try:
        initialize_database()
        ensure_required_tables("users")
        logger.info(" 数据库 schema 已就绪")

        # Seed default admin user
        from app.core.database import SessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash

        db = SessionLocal()
        try:
            if not db.query(User).filter(User.username == "admin").first():
                db.add(User(
                    username="admin",
                    email="admin@xinghe.com",
                    hashed_password=get_password_hash("admin123"),
                    is_active=True,
                    is_superuser=True,
                    role="admin",
                ))
                db.commit()
                logger.info(" 内置 admin 用户创建成功")
        except Exception as e:
            logger.error(f" 创建内置用户失败: {e}")
            db.rollback()
        finally:
            db.close()

        # Trigger registration side-effects
        import app.algorithms   # registers FGSM, CW, …
        import app.ml_models    # registers ResNet, YOLOv8, …

        from app.algorithms.registry import list_all as list_algos
        from app.ml_models.registry import list_all as list_models

        logger.info(f" 已注册算法: {[a['name'] for a in list_algos()]}")
        logger.info(f" 已注册模型: {[m['id'] for m in list_models()]}")
        logger.info(" 平台启动完成!")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f" 启动失败: {e}", exc_info=True)
        raise

    yield

    logger.info(" 星河智安平台正在关闭...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "星河智安 AI 安全攻击可视化平台 API\n\n"
        "浙江科技大学 · 大数据与智能安全实验室（星河智安实验室）\n\n"
        "支持的攻击算法: FGSM, I-FGSM, PGD, C&W, DeepFool\n"
        "支持的模型: ResNet (ImageNet), YOLOv8 (COCO)"
    ),
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.time() - start:.4f}"
    return response


app.add_exception_handler(XingHeException, xinghe_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ── API routes ──────────────────────────────────────────────────────────────

from app.api.v1 import auth, users, models, admin  # noqa: E402
from app.api.v1.attacks import router as attacks_router  # noqa: E402
from app.api.v1 import captcha  # noqa: E402

app.include_router(auth.router,       prefix="/api/v1/auth",    tags=["认证"])
app.include_router(users.router,      prefix="/api/v1/users",   tags=["用户管理"])
app.include_router(models.router,     prefix="/api/v1/models",  tags=["模型管理"])
app.include_router(attacks_router,    prefix="/api/v1/attacks", tags=["攻击算法"])
app.include_router(captcha.router,    prefix="/api/v1/captcha", tags=["验证码"])
app.include_router(admin.router,      prefix="/api/v1/admin",   tags=["系统管理"])

# ── System endpoints ─────────────────────────────────────────────────────────

@app.get("/", tags=["系统"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs" if settings.is_development else None,
    }


@app.get("/health", tags=["系统"])
async def health_check():
    try:
        from app.core.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()

        import redis
        redis.from_url(settings.redis_url).ping()

        return {"status": "healthy", "database": "connected", "redis": "connected"}
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})


@app.get("/info", tags=["系统"])
async def system_info():
    from app.algorithms.registry import list_all as list_algos
    from app.ml_models.registry import list_all as list_models

    algos = list_algos()
    models_list = list_models()
    return {
        "app": {"name": settings.app_name, "version": settings.app_version},
        "algorithms": algos,
        "models": models_list,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.is_development)

