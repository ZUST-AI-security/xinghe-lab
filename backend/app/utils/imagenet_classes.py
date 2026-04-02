"""
app/utils/imagenet_classes.py

Re-exports the IMAGENET_CLASSES dict and helper functions from the original
location so new code can use `from app.utils.imagenet_classes import ...`
without duplicating the 35 KB class table.
"""

from app.core.utils.imagenet_classes import (  # noqa: F401
    IMAGENET_CLASSES,
    search_classes,
    get_class_by_id,
    get_popular_classes,
)
