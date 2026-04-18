"""攻击历史记录模型"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from ..core.database import Base


class AttackHistory(Base):
    """攻击历史记录"""
    __tablename__ = "attack_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    algorithm = Column(String(50), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    params = Column(JSON, nullable=True)
    success = Column(Boolean, default=False)
    success_rate = Column(Float, nullable=True)
    l2_norm = Column(Float, nullable=True)
    linf_norm = Column(Float, nullable=True)
    execution_time = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<AttackHistory(id={self.id}, algorithm='{self.algorithm}', user_id={self.user_id})>"
