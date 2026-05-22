import os
import sys

from fastapi import FastAPI

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.v1.models import router


def test_models_list_registers_with_and_without_trailing_slash():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/models")

    paths = {route.path for route in app.routes}

    assert "/api/v1/models" in paths
    assert "/api/v1/models/" in paths
