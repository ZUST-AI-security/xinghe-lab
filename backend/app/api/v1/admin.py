"""
Admin management API routes — system dashboard, logs, config, attack history.
All endpoints require admin role.
"""

import math
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.core.config import settings
from app.models.user import User
from app.models.attack_history import AttackHistory
from app.models.system_config import SystemConfig

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard", summary="系统概览统计")
async def admin_dashboard(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """返回系统概览统计信息：用户数、攻击总数、成功率等。"""
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()  # noqa: E712
    total_attacks = db.query(func.count(AttackHistory.id)).scalar()
    successful_attacks = db.query(func.count(AttackHistory.id)).filter(
        AttackHistory.success == True  # noqa: E712
    ).scalar()

    # 按算法统计
    algo_stats = (
        db.query(
            AttackHistory.algorithm,
            func.count(AttackHistory.id).label("count"),
        )
        .group_by(AttackHistory.algorithm)
        .all()
    )

    return {
        "users": {
            "total": total_users,
            "active": active_users,
        },
        "attacks": {
            "total": total_attacks,
            "successful": successful_attacks,
            "success_rate": successful_attacks / total_attacks if total_attacks > 0 else 0,
            "by_algorithm": {row.algorithm: row.count for row in algo_stats},
        },
        "system": {
            "version": settings.app_version,
            "debug": settings.debug,
            "database": "sqlite" if settings.database_url.startswith("sqlite") else "postgresql",
        },
    }


# ── Attack History ───────────────────────────────────────────────────────────

@router.get("/attack-history", summary="攻击任务历史")
async def list_attack_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    algorithm: str = Query("", description="按算法筛选"),
    user_id: int = Query(0, description="按用户 ID 筛选"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """管理员查看攻击任务历史，支持分页和筛选。"""
    query = db.query(AttackHistory)
    if algorithm:
        query = query.filter(AttackHistory.algorithm == algorithm)
    if user_id > 0:
        query = query.filter(AttackHistory.user_id == user_id)

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    items = query.order_by(AttackHistory.id.desc()).offset((page - 1) * size).limit(size).all()

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


# ── System Config ────────────────────────────────────────────────────────────

@router.get("/config", summary="获取系统配置")
async def get_system_config(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """获取所有系统配置键值对。"""
    configs = db.query(SystemConfig).all()
    return {c.key: {"value": c.value, "description": c.description} for c in configs}


@router.put("/config/{key}", summary="更新系统配置")
async def update_system_config(
    key: str,
    value: str,
    description: str = "",
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """创建或更新指定的系统配置。"""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if config:
        config.value = value
        if description:
            config.description = description
    else:
        config = SystemConfig(key=key, value=value, description=description)
        db.add(config)
    db.commit()
    return {"key": key, "value": value}


# ── System Logs ──────────────────────────────────────────────────────────────

@router.get("/logs", summary="查看系统日志")
async def get_system_logs(
    lines: int = Query(100, ge=1, le=1000, description="返回最新的日志行数"),
    level: str = Query("", description="日志级别筛选: INFO/WARNING/ERROR"),
    admin_user: User = Depends(get_current_admin_user),
):
    """读取最新的系统日志。"""
    log_path = Path(settings.log_file)
    if not log_path.exists():
        return {"lines": [], "total": 0}

    try:
        all_lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        if level:
            level_upper = level.upper()
            all_lines = [line for line in all_lines if level_upper in line]

        recent = all_lines[-lines:]
        return {"lines": recent, "total": len(all_lines)}
    except Exception as e:
        logger.error(f"读取日志失败: {e}")
        raise HTTPException(status_code=500, detail=f"日志读取失败: {e}")


# ── User Management ──────────────────────────────────────────────────────────

@router.get("/users", summary="获取用户列表")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="按用户名或邮箱搜索"),
    role: str = Query("", description="按角色筛选"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == role)
    total = query.count()
    items = query.order_by(User.id.desc()).offset((page - 1) * size).limit(size).all()
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
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in items
        ],
        "total": total,
        "page": page,
        "size": size,
    }


@router.put("/users/{user_id}", summary="更新用户信息")
async def update_user(
    user_id: int,
    email: str = "",
    full_name: str = "",
    role: str = "",
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if email:
        user.email = email
    if full_name:
        user.full_name = full_name
    if role:
        user.role = role
    db.commit()
    return {"id": user.id, "username": user.username, "email": user.email,
            "full_name": user.full_name, "role": user.role}


@router.post("/users/{user_id}/toggle-active", summary="启用/禁用用户")
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


@router.post("/users/{user_id}/reset-password", summary="重置用户密码")
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


@router.delete("/users/{user_id}", summary="删除用户")
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
