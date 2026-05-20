# 星河智安 (XingHe ZhiAn) - 后端 Dockerfile
# FastAPI + Uvicorn + Celery
#
# 构建方式：
#   有 GPU: docker compose build backend
#   无 GPU: DEVICE=cpu docker compose build backend
#
# GPU 需要: NVIDIA GPU + nvidia-container-toolkit
#
# 国内镜像加速（默认启用）：
#   apt  → mirrors.aliyun.com
#   pip  → pypi.tuna.tsinghua.edu.cn
#   torch → mirror.sjtu.edu.cn/pytorch

FROM python:3.13-slim AS base

WORKDIR /app

ARG DEVICE=gpu

# 使用国内 apt 镜像源
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources

# 系统依赖（opencv 需要 libgl/libglib）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 配置 pip 使用国内镜像源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 安装 PyTorch（根据 DEVICE 参数选择 GPU 或 CPU 版本）
# 使用上海交大 PyTorch 镜像加速下载
COPY requirements.txt .
RUN if [ "$DEVICE" = "cpu" ]; then \
        echo ">>> 安装 CPU 版 PyTorch（国内镜像）<<<" && \
        pip install --no-cache-dir torch torchvision \
            --index-url https://mirror.sjtu.edu.cn/pytorch-wheels/cpu \
            --extra-index-url https://pypi.tuna.tsinghua.edu.cn/simple; \
    else \
        echo ">>> 安装 CUDA 版 PyTorch（国内镜像）<<<" && \
        pip install --no-cache-dir torch torchvision \
            --index-url https://mirror.sjtu.edu.cn/pytorch-wheels/cu124 \
            --extra-index-url https://pypi.tuna.tsinghua.edu.cn/simple; \
    fi

# 安装其余 Python 依赖（已配置清华镜像源）
RUN pip install --no-cache-dir --no-deps -r requirements.txt

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
