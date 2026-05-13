#!/usr/bin/env sh
set -eu

python - <<'PY'
import os
import socket
import sys
import time
from urllib.parse import urlparse

targets = []
for env_name in ("DATABASE_URL", "REDIS_URL", "CELERY_BROKER_URL"):
    value = os.getenv(env_name, "")
    if not value or value.startswith("sqlite"):
        continue
    parsed = urlparse(value.replace("postgresql+psycopg://", "postgresql://"))
    if parsed.hostname and parsed.port:
        targets.append((env_name, parsed.hostname, parsed.port))

deadline = time.time() + int(os.getenv("WAIT_FOR_SERVICES_TIMEOUT", "60"))
for env_name, host, port in targets:
    while True:
        try:
            with socket.create_connection((host, port), timeout=3):
                break
        except OSError:
            if time.time() > deadline:
                print(f"Timed out waiting for {env_name} at {host}:{port}", file=sys.stderr)
                sys.exit(1)
            time.sleep(2)
PY

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    alembic upgrade head
fi

exec "$@"
