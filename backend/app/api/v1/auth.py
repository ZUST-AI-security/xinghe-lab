"""
Authentication API routes - register, login, token refresh, logout.
"""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import redis

from app.core.database import get_db
from app.core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    verify_token,
)
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserResponse
from app.core.config import settings

router = APIRouter()

# 获取Redis客户端
def get_redis_client():
    return redis.from_url(settings.redis_url, decode_responses=True)


def _get_login_attempt_key(client_ip: str) -> str:
    return f"login_attempts:{client_ip}"


def _check_login_lockout(redis_client, client_ip: str) -> None:
    """检查IP是否被锁定，锁定中则抛出429异常。"""
    key = _get_login_attempt_key(client_ip)
    attempts = redis_client.get(key)
    if attempts is not None and int(attempts) >= settings.max_login_attempts:
        ttl = redis_client.ttl(key)
        if ttl > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"登录尝试过多，请{settings.lockout_duration_minutes}分钟后再试",
            )
        else:
            redis_client.delete(key)


def _record_login_failure(redis_client, client_ip: str) -> None:
    """记录一次登录失败，首次失败时设置过期时间。"""
    key = _get_login_attempt_key(client_ip)
    if not redis_client.exists(key):
        redis_client.set(key, 1, ex=settings.lockout_duration_minutes * 60)
    else:
        redis_client.incr(key)


def _clear_login_attempts(redis_client, client_ip: str) -> None:
    """登录成功后清除尝试记录。"""
    redis_client.delete(_get_login_attempt_key(client_ip))


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    captcha_id: str = Field(..., description="验证码ID")
    captcha_code: str = Field(..., min_length=4, max_length=4, description="验证码")


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_id: Optional[str] = Field(None, description="验证码ID")
    captcha_code: Optional[str] = Field(None, min_length=4, max_length=4, description="验证码")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")


@router.post("/register", response_model=UserResponse)
async def register(request_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with captcha verification."""
    # 验证验证码
    redis_client = get_redis_client()
    stored_captcha = redis_client.get(f"captcha:{request_data.captcha_id}")
    if not stored_captcha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码已过期，请重新获取",
        )
    if stored_captcha.lower() != request_data.captcha_code.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误",
        )
    # 验证成功后删除验证码
    redis_client.delete(f"captcha:{request_data.captcha_id}")

    if db.query(User).filter(User.username == request_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在",
        )
    if db.query(User).filter(User.email == request_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册",
        )

    # A fresh deployment has no seeded credentials. The first user becomes admin.
    is_first_user = db.query(User.id).first() is None

    db_user = User(
        username=request_data.username,
        email=request_data.email,
        full_name=request_data.full_name,
        hashed_password=get_password_hash(request_data.password),
        is_active=True,
        is_superuser=is_first_user,
        role="admin" if is_first_user else "user",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
async def login(
    request_data: LoginRequest,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Authenticate and return JWT access + refresh tokens with captcha verification."""
    client_ip = request.client.host if request else "unknown"
    redis_client = get_redis_client()

    # 检查是否被锁定
    _check_login_lockout(redis_client, client_ip)

    # 验证验证码（如果提供）
    if request_data.captcha_id and request_data.captcha_code:
        stored_captcha = redis_client.get(f"captcha:{request_data.captcha_id}")
        if not stored_captcha:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码已过期，请重新获取",
            )
        if stored_captcha.lower() != request_data.captcha_code.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误",
            )
        redis_client.delete(f"captcha:{request_data.captcha_id}")

    user = authenticate_user(db, request_data.username, request_data.password)
    if not user:
        _record_login_failure(redis_client, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户账号已被禁用",
        )

    # 登录成功，清除尝试记录
    _clear_login_attempts(redis_client, client_ip)

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(request_data: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    payload = verify_token(request_data.refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的刷新令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用",
        )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )
    new_refresh_token = create_refresh_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Log out (client should discard its token; server-side blacklist TODO)."""
    return {"message": "登出成功"}
