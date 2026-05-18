"""
星河智安 (XingHe ZhiAn) - 安全模块
JWT认证、密码哈希、用户认证相关功能
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from ..models.user import User

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer认证
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码（bcrypt）
    
    Args:
        plain_password: 明文密码
        hashed_password: 哈希密码
        
    Returns:
        bool: 密码是否正确
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    生成密码哈希（bcrypt）
    
    Args:
        password: 明文密码
        
    Returns:
        str: 哈希后的密码
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建访问令牌
    
    Args:
        data: 要编码的数据
        expires_delta: 过期时间增量
        
    Returns:
        str: JWT访问令牌
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None, remember_me: bool = False) -> str:
    """
    创建刷新令牌

    Args:
        data: 要编码的数据
        expires_delta: 自定义过期时间增量，None则使用默认配置
        remember_me: 是否为记住登录状态的长期token

    Returns:
        str: JWT刷新令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh", "remember_me": remember_me})

    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    验证JWT令牌

    Args:
        token: JWT令牌
        token_type: 令牌类型 ("access" 或 "refresh")

    Returns:
        Optional[dict]: 解码后的数据，验证失败返回None
    """
    try:
        # Check server-side blacklist first
        if is_token_blacklisted(token):
            return None

        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )

        # 检查令牌类型
        if payload.get("type") != token_type:
            return None

        # 检查过期时间
        exp = payload.get("exp")
        if exp is None or datetime.fromtimestamp(exp) < datetime.utcnow():
            return None

        return payload

    except JWTError:
        return None


def blacklist_token(token: str) -> None:
    """Add a token to the server-side blacklist (Redis)."""
    import logging
    import redis as redis_lib
    try:
        r = redis_lib.from_url(settings.redis_url, decode_responses=True)
        # Store for the max possible token lifetime (refresh token expiry)
        ttl = settings.jwt_refresh_token_expire_days * 86400
        r.set(f"token_blacklist:{token}", "1", ex=ttl)
    except Exception:
        logging.getLogger(__name__).error("Redis不可用，Token黑名单写入失败，token可能仍有效")


def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been revoked server-side. Fail-closed for security."""
    import logging
    import redis as redis_lib
    try:
        r = redis_lib.from_url(settings.redis_url, decode_responses=True)
        return r.exists(f"token_blacklist:{token}") == 1
    except Exception:
        logging.getLogger(__name__).warning("Redis不可用，Token黑名单检查失败，拒绝请求（fail-closed）")
        return True  # Fail-closed: if Redis is down, reject the token

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    用户认证
    
    Args:
        db: 数据库会话
        username: 用户名
        password: 密码
        
    Returns:
        Optional[User]: 认证成功返回用户对象，失败返回None
    """
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    获取当前用户（依赖注入）
    
    Args:
        credentials: HTTP认证凭据
        db: 数据库会话
        
    Returns:
        User: 当前用户对象
        
    Raises:
        HTTPException: 认证失败时抛出401错误
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    获取当前活跃用户
    
    Args:
        current_user: 当前用户
        
    Returns:
        User: 当前活跃用户
        
    Raises:
        HTTPException: 用户未激活时抛出400错误
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户账户未激活")
    
    return current_user


def require_role(*allowed_roles: str):
    """
    角色权限依赖工厂，用于限制端点只允许特定角色访问。

    用法::

        @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
    """
    async def _check(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要以下角色之一: {', '.join(allowed_roles)}",
            )
        return current_user
    return _check


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """获取当前管理员用户，非 admin/superuser 角色返回 403。"""
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要管理员权限",
        )
    return current_user


def create_user_tokens(user: User, remember_me: bool = False) -> dict:
    """
    为用户创建访问令牌和刷新令牌

    Args:
        user: 用户对象
        remember_me: 是否记住登录状态

    Returns:
        dict: 包含访问令牌和刷新令牌的字典
    """
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    if remember_me:
        refresh_expires = timedelta(hours=24)
    else:
        refresh_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    refresh_token = create_refresh_token(data={"sub": user.username}, expires_delta=refresh_expires, remember_me=remember_me)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }
