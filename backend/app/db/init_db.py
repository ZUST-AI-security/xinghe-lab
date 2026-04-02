"""数据库初始化：建表 + 内置数据"""

import logging

from ..core.security import get_password_hash
from ..db.entities import User
from .session import SessionLocal, create_tables

logger = logging.getLogger(__name__)


def init_db() -> None:
    """初始化数据库：建表并创建内置管理员用户"""
    create_tables()

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            hashed_password = get_password_hash("admin123")
            admin_user = User(
                username="admin",
                email="admin@xinghe.com",
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info("✅ 内置admin用户创建成功")
        else:
            logger.info("ℹ️ admin用户已存在")
    except Exception as exc:
        logger.error(f"❌ 创建内置用户失败: {exc}")
        db.rollback()
    finally:
        db.close()
