"""
XingHe ZhiAn - FastAPI application entry point.

Start with:
    .venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import ensure_required_tables, initialize_database
from app.core.exceptions import (
    XingHeException,
    general_exception_handler,
    xinghe_exception_handler,
)
from app.utils.logger import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info(" 星河智安 AI安全攻击可视化平台启动中...")
    logger.info(
        " 版本: %s | 环境: %s",
        settings.app_version,
        "dev" if settings.is_development else "prod",
    )

    try:
        initialize_database()
        ensure_required_tables("users")
        logger.info(" 数据库 schema 已就绪")

        # Trigger registration side-effects.
        import app.algorithms  # noqa: F401
        import app.ml_models  # noqa: F401

        from app.algorithms.registry import list_all as list_algos
        from app.ml_models.registry import list_all as list_models

        logger.info(" 已注册算法: %s", [a["name"] for a in list_algos()])
        logger.info(" 已注册模型: %s", [m["id"] for m in list_models()])
        logger.info(" 平台启动完成!")
        logger.info("=" * 50)
    except Exception as exc:
        logger.error(" 启动失败: %s", exc, exc_info=True)
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
    contact={"name": "星河智安实验室", "url": "https://lab.rjmart.cn/10366/AISecurityLab"},
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.time() - start:.4f}"

    # 添加安全头部
    if settings.is_production:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response


app.add_exception_handler(XingHeException, xinghe_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

from app.api.v1 import admin, auth, captcha, models, users  # noqa: E402
from app.api.v1.attacks import router as attacks_router  # noqa: E402
from app.api.v1.attacks.tasks import router as tasks_router  # noqa: E402

app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用户管理"])
app.include_router(models.router, prefix="/api/v1/models", tags=["模型管理"])
app.include_router(attacks_router, prefix="/api/v1/attacks", tags=["攻击算法"])
app.include_router(tasks_router, prefix="/api/v1/attacks", tags=["任务管理"])
app.include_router(captcha.router, prefix="/api/v1/captcha", tags=["验证码"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["系统管理"])


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
        from sqlalchemy import text

        from app.core.database import SessionLocal
        import redis

        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        redis.from_url(settings.redis_url).ping()

        return {"status": "healthy", "database": "connected", "redis": "connected"}
    except Exception as exc:
        logger.error("健康检查失败: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(exc)},
        )


@app.get("/info", tags=["系统"])
async def system_info():
    from app.algorithms.registry import list_all as list_algos
    from app.ml_models.registry import list_all as list_models

    return {
        "app": {"name": settings.app_name, "version": settings.app_version},
        "algorithms": list_algos(),
        "models": list_models(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
    )
