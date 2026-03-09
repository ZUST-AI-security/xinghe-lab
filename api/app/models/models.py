from sqlalchemy import Column, String, JSON, DateTime, Integer
from sqlalchemy.sql import func
from app.core.db import Base

class TaskRecord(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True) # Celery task ID
    algorithm_id = Column(String)
    status = Column(String, default="PENDING")
    params = Column(JSON)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
