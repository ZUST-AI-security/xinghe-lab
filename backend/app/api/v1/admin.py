"""
Admin management API routes: dashboard, system config, logs, attack history, users.
"""

import math
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.core.system_config import DEFAULT_SYSTEM_CONFIGS, ensure_default_system_configs
from app.models.attack_history import AttackHistory
from app.models.system_config import SystemConfig
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard", summary="System dashboard")
async def admin_dashboard(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    total_attacks = db.query(func.count(AttackHistory.id)).scalar() or 0
    successful_attacks = (
        db.query(func.count(AttackHistory.id))
        .filter(AttackHistory.success.is_(True))
        .scalar()
        or 0
    )
    algo_stats = (
        db.query(AttackHistory.algorithm, func.count(AttackHistory.id).label("count"))
        .group_by(AttackHistory.algorithm)
        .all()
    )

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": max(total_users - active_users, 0),
        },
        "attacks": {
            "total": total_attacks,
            "successful": successful_attacks,
            "failed": max(total_attacks - successful_attacks, 0),
            "success_rate": successful_attacks / total_attacks if total_attacks else 0,
            "by_algorithm": {row.algorithm: row.count for row in algo_stats},
        },
        "system": {
            "version": settings.app_version,
            "debug": settings.debug,
            "database": "sqlite" if settings.database_url.startswith("sqlite") else "postgresql",
        },
    }


@router.get("/attack-history", summary="Attack history")
async def list_attack_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    algorithm: str = Query("", description="Filter by algorithm"),
    user_id: int = Query(0, description="Filter by user id"),
    status: str = Query("", description="Filter by task status"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(AttackHistory)
    if algorithm:
        query = query.filter(AttackHistory.algorithm == algorithm)
    if user_id > 0:
        query = query.filter(AttackHistory.user_id == user_id)
    if status:
        query = query.filter(AttackHistory.status == status)

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    items = (
        query.order_by(AttackHistory.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "items": [
            {
                "id": h.id,
                "user_id": h.user_id,
                "algorithm": h.algorithm,
                "model_name": h.model_name,
                "params": h.params,
                "success": h.success,
                "success_rate": h.success_rate,
                "l2_norm": h.l2_norm,
                "linf_norm": h.linf_norm,
                "execution_time": h.execution_time,
                "status": h.status,
                "error_message": h.error_message,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in items
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/config", summary="Get system config")
async def get_system_config(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    ensure_default_system_configs(db)
    configs = db.query(SystemConfig).order_by(SystemConfig.key.asc()).all()
    payload = {c.key: {"value": c.value, "description": c.description} for c in configs}
    for key, default in DEFAULT_SYSTEM_CONFIGS.items():
        payload.setdefault(key, default)
    return payload


@router.put("/config/{key}", summary="Update system config")
async def update_system_config(
    key: str,
    value: str,
    description: str = "",
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if config:
        config.value = value
        if description:
            config.description = description
    else:
        config = SystemConfig(key=key, value=value, description=description)
        db.add(config)
    db.commit()
    return {"key": key, "value": value, "description": config.description}


@router.get("/logs", summary="Get system logs")
async def get_system_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: str = Query("", description="Filter by INFO/WARNING/ERROR"),
    admin_user: User = Depends(get_current_admin_user),
):
    log_path = Path(settings.log_file)
    if not log_path.exists():
        return {"lines": [], "total": 0}

    try:
        all_lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        if level:
            level_upper = level.upper()
            all_lines = [line for line in all_lines if level_upper in line]
        return {"lines": all_lines[-lines:], "total": len(all_lines)}
    except Exception as exc:
        logger.error("Read logs failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"日志读取失败: {exc}")


@router.get("/users", summary="List users")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search username, email, or full name"),
    role: str = Query("", description="Filter by role"),
    is_active: str = Query("", description="Filter by active status"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )
    if role:
        query = query.filter(User.role == role)
    if is_active in {"true", "false"}:
        query = query.filter(User.is_active.is_(is_active == "true"))

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "is_superuser": u.is_superuser,
                "bio": u.bio,
                "avatar_url": u.avatar_url,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in items
        ],
        "total": total,
        "page": page,
        "size": size,
    }


@router.put("/users/{user_id}", summary="Update user")
async def update_user(
    user_id: int,
    email: str | None = Query(None),
    full_name: str | None = Query(None),
    role: str | None = Query(None),
    is_active: str | None = Query(None),
    bio: str | None = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if user.id == admin_user.id:
        if is_active == "false":
            raise HTTPException(status_code=400, detail="不能禁用自己")
        if role and role != "admin":
            raise HTTPException(status_code=400, detail="不能移除自己的管理员权限")

    if email is not None:
        normalized_email = email.strip()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="邮箱不能为空")
        user.email = normalized_email
    if full_name is not None:
        user.full_name = full_name.strip() or None
    if role:
        user.role = role
        user.is_superuser = role == "admin"
    if is_active in {"true", "false"}:
        user.is_active = is_active == "true"
    if bio is not None:
        user.bio = bio.strip() or None

    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "bio": user.bio,
    }


@router.post("/users/{user_id}/toggle-active", summary="Toggle user active")
async def toggle_user_active(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="不能禁用自己")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.post("/users/{user_id}/reset-password", summary="Reset user password")
async def reset_user_password(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from app.core.security import get_password_hash

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.hashed_password = get_password_hash("Abc12345")
    db.commit()
    return {"message": "密码已重置为 Abc12345"}


@router.delete("/users/{user_id}", summary="Delete user")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    db.delete(user)
    db.commit()
    return {"message": "删除成功"}
