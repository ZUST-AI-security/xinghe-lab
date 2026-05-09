"""
Authentication API routes - register, login, token refresh, logout.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
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
)
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserResponse
from app.core.config import settings

router = APIRouter()

# 获取Redis客户端
def get_redis_client():
    return redis.from_url(settings.redis_url, decode_responses=True)

# 存储登录尝试的内存字典（生产环境应使用Redis）
login_attempts = {}


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

    # 检查是否被锁定
    if client_ip in login_attempts:
        attempts, lock_time = login_attempts[client_ip]
        if attempts >= settings.max_login_attempts:
            if datetime.now() - lock_time < timedelta(minutes=settings.lockout_duration_minutes):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"登录尝试过多，请{settings.lockout_duration_minutes}分钟后再试",
                )
            else:
                # 锁定时间已过，重置尝试次数
                del login_attempts[client_ip]

    # 验证验证码（如果提供）
    if request_data.captcha_id and request_data.captcha_code:
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

    user = authenticate_user(db, request_data.username, request_data.password)
    if not user:
        # 记录失败的登录尝试
        if client_ip not in login_attempts:
            login_attempts[client_ip] = [1, datetime.now()]
        else:
            login_attempts[client_ip][0] += 1
            login_attempts[client_ip][1] = datetime.now()

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
    if client_ip in login_attempts:
        del login_attempts[client_ip]

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
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Issue a new access token using the current bearer token."""
    access_token = create_access_token(
        data={"sub": current_user.username},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )
    refresh_tok = create_refresh_token(data={"sub": current_user.username})
    return {
        "access_token": access_token,
        "refresh_token": refresh_tok,
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
