from typing import Any, Dict, Optional
from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "星河智安实验室平台"
    API_V1_STR: str = "/api/v1"

    # Database Settings
    # If POSTGRES_SERVER is provided, use PostgreSQL; otherwise default to SQLite
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = "postgres"
    POSTGRES_PASSWORD: Optional[str] = ""
    POSTGRES_DB: Optional[str] = "xinghe_lab"
    POSTGRES_PORT: Optional[int] = 5432
    
    # SQLite fallback
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str) and v:
            return v
        
        # Check if Postgres settings are provided
        postgres_server = values.data.get("POSTGRES_SERVER")
        if postgres_server:
            user = values.data.get("POSTGRES_USER")
            password = values.data.get("POSTGRES_PASSWORD")
            db = values.data.get("POSTGRES_DB")
            port = values.data.get("POSTGRES_PORT")
            return f"postgresql://{user}:{password}@{postgres_server}:{port}/{db}"
        
        # Default to SQLite if no Postgres server is specified
        return "sqlite:///./sql_app.db"

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore" # 允许环境变量中有额外的变量而不报错
    )

settings = Settings()
