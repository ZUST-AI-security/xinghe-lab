"""
星河智安 (XingHe ZhiAn) - 数据库会话与引擎
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..core.config import settings
from .base import Base

# Import all entities to register with SQLAlchemy
from .entities import User  # noqa: F401

# 创建数据库引擎
if settings.database_url.startswith("sqlite"):
    # SQLite特殊配置
    engine = create_engine(
        settings.database_url,
        connect_args={
            "check_same_thread": False,
            "timeout": 20
        },
        poolclass=StaticPool,
        echo=settings.debug
    )
else:
    # 其他数据库配置
    engine = create_engine(
        settings.database_url,
        echo=settings.debug
    )

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    获取数据库会话
    用于FastAPI的依赖注入
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """创建所有数据库表"""
    Base.metadata.create_all(bind=engine)
