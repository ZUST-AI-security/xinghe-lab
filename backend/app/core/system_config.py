from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig


DEFAULT_SYSTEM_CONFIGS: dict[str, dict[str, str]] = {
    "rate_limit_enabled": {
        "value": "true",
        "description": "Whether request rate limiting is enabled.",
    },
    "rate_limit_attack_submit_limit": {
        "value": "6",
        "description": "Max attack submission requests allowed within the submit window.",
    },
    "rate_limit_attack_submit_window_seconds": {
        "value": "60",
        "description": "Time window in seconds for attack submission rate limiting.",
    },
    "rate_limit_general_limit": {
        "value": "30",
        "description": "Max non-polling API requests allowed within the general window.",
    },
    "rate_limit_general_window_seconds": {
        "value": "60",
        "description": "Time window in seconds for general API rate limiting.",
    },
}


def ensure_default_system_configs(db: Session) -> None:
    existing = {
        row.key
        for row in db.query(SystemConfig.key).filter(
            SystemConfig.key.in_(list(DEFAULT_SYSTEM_CONFIGS.keys()))
        )
    }

    created = False
    for key, payload in DEFAULT_SYSTEM_CONFIGS.items():
        if key in existing:
            continue
        db.add(
            SystemConfig(
                key=key,
                value=payload["value"],
                description=payload["description"],
            )
        )
        created = True

    if created:
        db.commit()


def get_system_config_value(
    db: Session,
    key: str,
    default: Optional[str] = None,
) -> Optional[str]:
    item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if item is None or item.value is None:
        return default
    return item.value


def get_system_config_int(db: Session, key: str, default: int) -> int:
    value = get_system_config_value(db, key, str(default))
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def get_system_config_bool(db: Session, key: str, default: bool) -> bool:
    value = get_system_config_value(db, key, "true" if default else "false")
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
