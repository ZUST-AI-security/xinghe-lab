#!/bin/bash
# 星河智安 - 后端容器启动脚本
# 等待数据库就绪 → 运行迁移 → 启动应用

set -euo pipefail

echo "=== 星河智安后端启动 ==="

# 等待 PostgreSQL 就绪（最多 30 秒）
echo "等待数据库就绪..."
for i in $(seq 1 30); do
    if python -c "
import sys
from sqlalchemy import create_engine, text
try:
    engine = create_engine('${DATABASE_URL}')
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    engine.dispose()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        echo "数据库已就绪"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "错误: 数据库连接超时"
        exit 1
    fi
    sleep 1
done

# 运行 Alembic 迁移
echo "运行数据库迁移..."
if [ -f "alembic.ini" ]; then
    alembic upgrade head 2>&1 || echo "迁移完成（可能无新迁移）"
else
    echo "未找到 alembic.ini，跳过迁移（使用 SQLite 自动建表）"
fi

echo "启动 FastAPI 应用..."
exec "$@"
