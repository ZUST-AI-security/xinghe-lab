import time

import redis
from fastapi import HTTPException, Request, status

from .config import settings
from .database import SessionLocal
from .system_config import get_system_config_bool, get_system_config_int

redis_client = redis.from_url(settings.redis_url, decode_responses=True)


class RateLimitExceeded(HTTPException):
    def __init__(self, detail: str = "请求过于频繁，请稍后再试或输入验证码"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"message": detail, "require_captcha": True},
        )


def check_rate_limit(key: str, limit: int = 5, window: int = 60) -> bool:
    """Return True when the current request is still within the rate limit."""
    current_time = time.time()
    window_start = current_time - window
    request_member = f"{current_time:.6f}"

    pipeline = redis_client.pipeline()
    pipeline.zremrangebyscore(key, 0, window_start)
    pipeline.zcard(key)
    pipeline.zadd(key, {request_member: current_time})
    pipeline.expire(key, window)
    results = pipeline.execute()

    request_count = results[1]
    return request_count < limit


async def rate_limiter_dependency(request: Request):
    """
    Limit API request rate.

    Polling and cancellation endpoints are excluded because async attack flows
    rely on frequent task-status checks.
    """
    path = request.url.path
    if "/api/v1/attacks/tasks" in path:
        return True

    client_ip = request.client.host

    db = SessionLocal()
    try:
        rate_limit_enabled = get_system_config_bool(db, "rate_limit_enabled", True)
        submit_limit = get_system_config_int(db, "rate_limit_attack_submit_limit", 6)
        submit_window = get_system_config_int(db, "rate_limit_attack_submit_window_seconds", 60)
        general_limit = get_system_config_int(db, "rate_limit_general_limit", 30)
        general_window = get_system_config_int(db, "rate_limit_general_window_seconds", 60)
    finally:
        db.close()

    if not rate_limit_enabled:
        return True

    if request.method == "POST" and "/submit" in path:
        key = f"rate_limit:submit:{client_ip}"
        limit = submit_limit
        window = submit_window
    else:
        key = f"rate_limit:general:{client_ip}"
        limit = general_limit
        window = general_window

    captcha_id = request.headers.get("X-Captcha-ID") or request.query_params.get("captcha_id")
    captcha_code = request.headers.get("X-Captcha-Code") or request.query_params.get("captcha_code")

    if captcha_id and captcha_code:
        stored_code = redis_client.get(f"captcha:{captcha_id}")
        if stored_code and stored_code.lower() == captcha_code.lower():
            redis_client.delete(key)
            redis_client.delete(f"captcha:{captcha_id}")
            return True
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    is_allowed = check_rate_limit(key, limit=limit, window=window)
    if not is_allowed:
        raise RateLimitExceeded()

    return True
