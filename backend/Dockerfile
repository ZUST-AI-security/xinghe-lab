# 星河智安 (XingHe ZhiAn) - 后端 Dockerfile
# FastAPI + Uvicorn + Celery

FROM python:3.13-slim AS base

WORKDIR /app

# 系统依赖（opencv 需要 libgl/libglib）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 创建必要目录
RUN mkdir -p /app/outputs /app/logs /app/models

# 复制并设置启动脚本
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 非 root 用户运行
RUN useradd -m -r appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# 使用 entrypoint 脚本（等待 DB → 运行迁移 → 启动应用）
# Celery 通过 docker-compose 覆盖 entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
