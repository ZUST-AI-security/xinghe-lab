FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    MODEL_CACHE_DIR=/app/models \
    TORCH_HOME=/app/models \
    LOG_FILE=/app/logs/app.log

WORKDIR /app

# 换 Debian 国内源，加快 apt-get
RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's|http://deb.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list.d/debian.sources

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip --root-user-action=ignore -i https://pypi.tuna.tsinghua.edu.cn/simple \
    && sed '/^torch==/d;/^torchvision==/d;s/^opencv-python==/opencv-python-headless==/' requirements.txt > /tmp/requirements-no-torch.txt \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch==2.6.0 torchvision==0.21.0 \
    && pip install -r /tmp/requirements-no-torch.txt -i https://pypi.tuna.tsinghua.edu.cn/simple \
    && pip uninstall -y opencv-python opencv-python-headless \
    && pip install --force-reinstall --no-deps opencv-python-headless==4.8.1.78 -i https://pypi.tuna.tsinghua.edu.cn/simple \
    && python -c "import cv2; print(cv2.__version__)"

COPY . .

RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /app/logs /app/models /app/outputs

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
