"""
星河智安 (XingHe ZhiAn) - 应用配置管理
使用Pydantic Settings进行配置管理，支持环境变量覆盖
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """
    应用配置类
    所有配置项都可以通过环境变量覆盖
    """
    
    # 应用基础配置
    app_name: str = "星河智安 AI安全攻击可视化平台"
    app_version: str = "1.0.0"
    debug: bool = True  # 开发环境默认开启debug
    secret_key: str = "your-secret-key-here-change-in-production"
    
    # 数据库配置
    database_url: str = "sqlite:///./xinghe_zhi_an.db"
    
    # JWT配置
    jwt_secret_key: str = "your-jwt-secret-key-here"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Redis配置
    redis_url: str = "redis://localhost:6379/0"
    
    # Celery配置
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    
    # 模型配置
    model_cache_dir: str = "./models"
    imagenet_classes_path: str = "./models/imagenet_classes.txt"
    
    # YOLOv8配置
    yolo_model_size: str = "n"  # n, s, m, l, x
    yolo_conf_threshold: float = 0.25
    yolo_iou_threshold: float = 0.7
    
    # 文件上传配置
    max_file_size_mb: int = 10
    allowed_image_types: List[str] = ["jpg", "jpeg", "png", "bmp", "tiff"]
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "./logs/app.log"
    
    # CORS配置（开发模式）
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://127.0.0.1:40747", "http://localhost:3001"]
    
    # 安全配置
    password_min_length: int = 8
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # API限流配置
    rate_limit_per_minute: int = 60
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保必要的目录存在"""
        directories = [
            self.model_cache_dir,
            Path(self.log_file).parent,
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    @property
    def is_development(self) -> bool:
        """判断是否为开发环境"""
        return self.debug
    
    @property
    def is_production(self) -> bool:
        """判断是否为生产环境"""
        return not self.debug
    
    def get_yolo_model_name(self) -> str:
        """获取YOLO模型文件名"""
        return f"yolov8{self.yolo_model_size}.pt"
    
    def get_model_path(self, model_name: str) -> str:
        """获取模型完整路径"""
        return os.path.join(self.model_cache_dir, model_name)

# 创建全局配置实例
settings = Settings()
