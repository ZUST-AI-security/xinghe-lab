import time
import json
from functools import wraps
from typing import Callable, Optional
import redis

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from .config import settings

# Create a sync redis client for rate limiting and captcha
redis_client = redis.from_url(settings.redis_url, decode_responses=True)

class RateLimitExceeded(HTTPException):
    def __init__(self, detail: str = "请求过于频繁，请稍后再试或输入验证码"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"message": detail, "require_captcha": True}
        )

def check_rate_limit(key: str, limit: int = 5, window: int = 60) -> bool:
    """
    检查是否超过速率限制
    Returns True if allowed, False if exceeded limit.
    """
    current_time = int(time.time())
    window_start = current_time - window
    
    pipeline = redis_client.pipeline()
    # Remove older requests
    pipeline.zremrangebyscore(key, 0, window_start)
    # Count requests in window
    pipeline.zcard(key)
    # Add current request
    pipeline.zadd(key, {str(current_time): current_time})
    # Set expiry
    pipeline.expire(key, window)
    
    results = pipeline.execute()
    request_count = results[1]
    
    return request_count < limit

async def rate_limiter_dependency(request: Request):
    """
    FastAPI依赖项，用于限制API请求速率
    如果在头部或查询参数中带有有效的 captcha_id 和 captcha_code，则可以重置或跳过限制。
    """
    # Exempt polling and cancellation endpoints from captcha/rate-limit.
    # Async attack flow relies on frequent task-status polling.
    path = request.url.path
    if "/api/v1/attacks/tasks" in path:
        return True

    client_ip = request.client.host
    user_id = "anonymous"
    
    # 尝试提取用户信息 (如果在 auth 中执行，可能 request.state.user 存在)
    # 对于本项目的需求，简单地使用 IP 进行限制
    key = f"rate_limit:{client_ip}"
    
    # 获取验证码进行验证 (如果是被限流后提交验证码重试的情况)
    captcha_id = request.headers.get("X-Captcha-ID") or request.query_params.get("captcha_id")
    captcha_code = request.headers.get("X-Captcha-Code") or request.query_params.get("captcha_code")
    
    if captcha_id and captcha_code:
        # 验证验证码
        stored_code = redis_client.get(f"captcha:{captcha_id}")
        if stored_code and stored_code.lower() == captcha_code.lower():
            # 验证码正确，清除频率限制并删除验证码
            redis_client.delete(key)
            redis_client.delete(f"captcha:{captcha_id}")
            return True
        else:
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

    # 进行限流检查（仅针对真实攻击提交类请求）
    is_allowed = check_rate_limit(key, limit=3, window=60)
    
    if not is_allowed:
        raise RateLimitExceeded()
        
    return True
