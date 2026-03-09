 终端 1: 启动 API 服务器
   cd api
   uv run uvicorn app.main:app --reload


  终端 2: 启动 Celery Worker (处理计算密集型攻击)
   cd api
   uv run celery -A app.core.celery_app worker --loglevel=info -P solo
  (注意：Windows 环境下建议加上 -P solo 参数以保证稳定性)