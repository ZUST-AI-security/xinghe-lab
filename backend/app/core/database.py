"""
星河智安 (XingHe ZhiAn) - 数据库配置
支持 SQLite（开发）和 PostgreSQL（生产）
"""

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateColumn
from .config import settings

logger = logging.getLogger(__name__)

# 创建数据库引擎
# 生产环境强制关闭 SQL 日志，防止敏感数据泄露
_sql_echo = settings.debug and settings.is_development

if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False, "timeout": 20},
        poolclass=StaticPool,
        echo=_sql_echo,
    )
    # SQLite WAL 模式：更好的并发读写和崩溃恢复
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
else:
    engine = create_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=_sql_echo,
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

    if settings.database_url.startswith("sqlite"):
        _sync_sqlite_columns()


def initialize_database():
    """
    初始化数据库 schema。

    - SQLite: 允许本地开发自动建表，并对旧库补齐新增列。
    - 其他数据库: 统一要求通过 Alembic 管理版本，不在应用启动时隐式建表。
    """
    if settings.database_url.startswith("sqlite"):
        create_tables()
        return

    logger.info("检测到非 SQLite 数据库，跳过自动建表，请通过 Alembic 管理 schema")


def ensure_required_tables(*table_names: str):
    """
    确保关键表已经存在；不存在时给出明确迁移指引。
    """
    inspector = inspect(engine)
    missing_tables = [table_name for table_name in table_names if not inspector.has_table(table_name)]
    if missing_tables:
        missing_text = ", ".join(missing_tables)
        raise RuntimeError(
            f"数据库缺少必要表: {missing_text}。"
            "如果你使用 PostgreSQL/MySQL，请先执行 `alembic upgrade head`；"
            "如果你使用现有 SQLite 本地库，请重启后端以触发自动补齐。"
        )


def _sync_sqlite_columns():
    """
    为已有 SQLite 表补齐 ORM 中新增的列。

    Base.metadata.create_all() 只会创建缺失的表，不会修改已存在的表结构；
    这会导致老的本地 SQLite 数据库在模型新增字段后继续沿用旧 schema。
    """
    inspector = inspect(engine)

    with engine.begin() as connection:
        for table_name, table in Base.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}

            for column in table.columns:
                if column.name in existing_columns or column.primary_key:
                    continue

                column_ddl = str(CreateColumn(column).compile(dialect=engine.dialect)).strip()
                connection.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN {column_ddl}'))
                logger.info("为 SQLite 旧表补充字段: %s.%s", table_name, column.name)

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
