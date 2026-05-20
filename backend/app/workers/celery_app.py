"""
Backwards-compatibility shim.

The canonical Celery app is in app.core.celery_app.
This module re-exports it so existing imports continue to work.
"""
from app.core.celery_app import celery_app

__all__ = ["celery_app"]
