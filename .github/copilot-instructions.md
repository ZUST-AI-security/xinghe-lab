# XingHe ZhiAn repository instructions

## Commands

### Backend setup and run
- From `backend\`, create and activate the virtual environment if needed:
  - `python -m venv .venv`
  - `.\.venv\Scripts\activate`
- Install dependencies:
  - `pip install -r requirements.txt`
- Start the backend:
  - `.\run_backend.ps1`
  - or `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Backend verification
- Health check: `curl http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`
- FGSM parameter schema: `curl http://localhost:8000/api/v1/attacks/fgsm/params/schema`

### Tests
- `pytest` is listed in `backend\requirements.txt`, but no committed test files are present in this repository snapshot.
- If adding or running a single future pytest test, use:
  - `.\.venv\Scripts\python.exe -m pytest path\to\test_file.py::test_name`

## High-level architecture

- The backend entry point is `backend\app\main.py`. Startup creates database tables, ensures required directories exist through settings initialization, seeds the built-in `admin` user, and imports model and attack packages to trigger registration side effects.
- API routes live under `backend\app\api\v1\endpoints\`. `app.main` mounts the auth, model, attack, and user routers directly under `/api/v1/...`.
- Configuration is centralized in `backend\app\core\config.py` via `pydantic-settings`. Default development storage is SQLite (`xinghe_zhi_an.db`), while Redis/Celery settings are present for async task execution.
- Database access uses SQLAlchemy sessions from `backend\app\core\database.py`. ORM models are under `backend\app\models\`.
- Model discovery is registry-driven. Importing `backend\app\core\models` and `backend\app\services\model_manager` registers available models via decorators; callers resolve models by name from the registry instead of instantiating model classes directly.
- Attack execution is also registry-driven. The FGSM API endpoint decodes base64 image input, resolves a model from the registry, resolves the attack from the attack registry, runs the attack, and returns transformed images plus metadata. Async FGSM work goes through Celery tasks in `backend\app\workers\tasks\fgsm_task.py`.
- The backend is currently centered on image attacks: classification support is implemented around ResNet/ImageNet, while detection/YOLO support exists as scaffolding in the model manager.

## Key conventions

- Prefer `backend\app\core\database.py` for `engine`, `SessionLocal`, `Base`, and `get_db`. There is also a `core\db.py`, but the FastAPI app, auth layer, and active endpoints use `core\database.py`.
- Registration is import-driven. When adding a new model or attack, wire it into the relevant package `__init__.py` so startup imports trigger decorator registration before requests hit the registry.
- Request and response contracts are defined with Pydantic models under `backend\app\schemas\`. The FGSM endpoints expect base64 `data:image/...` payloads rather than file-path inputs.
- Authentication uses JWT bearer tokens from `backend\app\core\security.py`, and protected endpoints depend on `get_current_user` or `get_current_active_user`.
- Startup behavior matters: the app auto-creates tables and seeds a default admin account (`admin` / `admin123`) if it does not already exist.
- Logging is initialized once from `backend\app\utils\logger.py` and writes to `backend\logs\app.log` in addition to console output.
- The repository contains both older/stubbed routes and newer registry-based code. Before changing model or attack flows, trace both the endpoint and the registry implementation instead of assuming every module is wired consistently.
