"""
星河智安 (XingHe ZhiAn) - 数据库配置
使用SQLAlchemy进行数据库管理
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from .config import settings

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

# 创建基础模型类
Base = declarative_base()

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
    """
    创建所有数据库表
    在应用启动时调用
    """
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """
    删除所有数据库表
    仅用于测试环境
    """
    if settings.is_development:
        Base.metadata.drop_all(bind=engine)

def reset_database():
    """
    重置数据库
    删除并重新创建所有表
    """
    if settings.is_development:
        drop_tables()
        create_tables()
