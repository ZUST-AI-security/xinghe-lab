"""
星河智安 (XingHe ZhiAn) - 应用配置管理
使用Pydantic Settings进行配置管理，支持环境变量覆盖
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    """
    应用配置类
    所有配置项都可以通过环境变量覆盖
    """
    
    model_config = {"protected_namespaces": ()}
    
    # 应用基础配置
    app_name: str = "星河智安 AI安全攻击可视化平台"
    app_version: str = "1.0.0"
    debug: bool = True
    secret_key: str = "your-secret-key-here-change-in-production"
    
    # 项目根目录
    project_root: str = str(PROJECT_ROOT)
    
    # 统一数据目录配置 - 所有下载文件都放到这里
    data_dir: str = str(PROJECT_ROOT / "data")
    
    # 数据库配置（放在 data 目录）
    database_url: str = f"sqlite:///{(PROJECT_ROOT / 'data' / 'db' / 'xinghe_zhi_an.db').as_posix()}"
    
    # JWT配置
    jwt_secret_key: str = "your-jwt-secret-key-here"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Redis配置（可选，如果没有Redis服务则使用内存存储）
    redis_url: str = "redis://localhost:6379/0"
    
    # Celery配置（可选，如果没有Redis则禁用异步功能）
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    enable_celery: bool = True  # 可以通过环境变量禁用Celery
    
    @field_validator("enable_celery", mode="before")
    @classmethod
    def _parse_enable_celery(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"false", "0", "no", "disable", "disabled"}:
                return False
            if normalized in {"true", "1", "yes", "enable", "enabled"}:
                return True
        return value
    
    # AI模型目录（放在 data/models）
    model_cache_dir: str = str(PROJECT_ROOT / "data" / "models")
    imagenet_classes_path: str = str(PROJECT_ROOT / "data" / "models" / "imagenet_classes.txt")
    
    # 上传与结果目录（放在 data/uploads）
    uploads_dir: str = str(PROJECT_ROOT / "data" / "uploads")
    
    # YOLOv8配置
    yolo_model_size: str = "n"  # n, s, m, l, x
    yolo_conf_threshold: float = 0.25
    yolo_iou_threshold: float = 0.7
    
    # 文件上传配置
    max_file_size_mb: int = 10
    allowed_image_types: List[str] = ["jpg", "jpeg", "png", "bmp", "tiff"]
    
    # 日志配置（放在 data/logs）
    log_level: str = "INFO"
    log_file: str = str(PROJECT_ROOT / "data" / "logs" / "app.log")
    
    # CORS配置（开发模式）
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:40747",
        "http://localhost:3001",
    ]
    
    # 安全配置
    password_min_length: int = 8
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # API限流配置
    rate_limit_per_minute: int = 60
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._ensure_directories()

    @field_validator("debug", mode="before")
    @classmethod
    def _parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "false", "0", "no"}:
                return False
            if normalized in {"dev", "development", "true", "1", "yes"}:
                return True
        return value
    
    def _ensure_directories(self):
        """确保必要的目录存在 - 统一放在 data 目录下"""
        directories = [
            # 数据根目录
            Path(self.data_dir),
            # 数据库目录
            Path(self.data_dir) / "db",
            # 模型目录
            Path(self.model_cache_dir),
            # 上传文件目录
            Path(self.uploads_dir),
            Path(self.uploads_dir) / "results",
            # 日志目录
            Path(self.log_file).parent,
            # 缓存目录
            Path(self.data_dir) / ".cache" / "matplotlib",
            Path(self.data_dir) / ".cache" / "ultralytics",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
        
        # 将Torch下载缓存指向 data/models
        os.environ.setdefault("TORCH_HOME", str(Path(self.model_cache_dir).resolve()))
        # 将Matplotlib缓存指向 data/.cache
        os.environ.setdefault(
            "MPLCONFIGDIR",
            str((Path(self.data_dir) / ".cache" / "matplotlib").resolve())
        )
        # 将Ultralytics配置目录指向 data/.cache
        os.environ.setdefault(
            "YOLO_CONFIG_DIR",
            str((Path(self.data_dir) / ".cache" / "ultralytics").resolve())
        )
    
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
