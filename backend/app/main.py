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


def _cleanup_stale_task_records() -> None:
    """
    启动时清理上次异常退出遗留的孤儿任务记录。

    将所有 status IN ('pending', 'running') 且创建时间超过配置阈值的
    TaskRecord 标记为 'failed'，防止其永久占用并发名额导致新任务被误拒。
    同时通过 Celery purge 清空 Redis 队列里残留的未消费消息。
    """
    from datetime import datetime, timezone, timedelta
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        from app.models.task_record import TaskRecord

        stale_after = int(getattr(settings, "active_task_stale_seconds", 2200) or 2200)
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=stale_after)
        stale = (
            db.query(TaskRecord)
            .filter(
                TaskRecord.status.in_(["pending", "running"]),
                TaskRecord.created_at < cutoff,
            )
            .all()
        )
        if stale:
            for record in stale:
                record.status = "failed"
                record.completed_at = datetime.now(timezone.utc)
                record.result = {"error": "服务重启，任务被自动标记为失败"}
            db.commit()
            logger.warning(
                " 启动清理：将 %d 条孤儿任务标记为 failed（超过 %d 秒未完成）",
                len(stale),
                stale_after,
            )
        else:
            logger.info(" 启动清理：无孤儿任务记录")
    except Exception as exc:
        logger.warning(" 启动清理任务记录失败（非致命）: %s", exc)
        db.rollback()
    finally:
        db.close()

    # 清空 Redis 队列里未消费的残留消息
    try:
        from app.core.config import settings
        import redis as redis_lib

        client = redis_lib.from_url(settings.redis_url, socket_connect_timeout=2)
        for q in ("high", "default", "low"):
            removed = client.delete(q)
            if removed:
                logger.warning(" 启动清理：已清空 Redis 队列 '%s' 的残留消息", q)
    except Exception as exc:
        logger.warning(" 启动清理 Redis 队列失败（非致命）: %s", exc)


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

        # 清理上次异常退出留下的孤儿任务记录（status=pending/running）
        # worker 重启前来不及标记完成，这些记录会永久阻塞并发限制检查
        _cleanup_stale_task_records()

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
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

os.makedirs("outputs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.time() - start:.4f}"
    return response


app.add_exception_handler(XingHeException, xinghe_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

from app.api.v1 import admin, auth, captcha, models, users  # noqa: E402
from app.api.v1.attacks import router as attacks_router  # noqa: E402
from app.api.v1.attacks.tasks import router as tasks_router  # noqa: E402
from app.api.v1.files import router as files_router  # noqa: E402
from app.api.v1.leaderboard import router as leaderboard_router  # noqa: E402
from app.api.v1.robustness import router as robustness_router  # noqa: E402
from app.api.v1.sensitivity import router as sensitivity_router  # noqa: E402

app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用户管理"])
app.include_router(models.router, prefix="/api/v1/models", tags=["模型管理"])
app.include_router(attacks_router, prefix="/api/v1/attacks", tags=["攻击算法"])
app.include_router(tasks_router, prefix="/api/v1", tags=["任务队列"])
app.include_router(captcha.router, prefix="/api/v1/captcha", tags=["验证码"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["系统管理"])
app.include_router(files_router, prefix="/api/v1", tags=["文件管理"])
app.include_router(robustness_router, prefix="/api/v1", tags=["鲁棒性评估"])
app.include_router(sensitivity_router, prefix="/api/v1", tags=["敏感性分析"])
app.include_router(leaderboard_router, prefix="/api/v1", tags=["排行榜"])


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
