# GEMINI.md - 星河智安实验室平台 (Xinghe Lab)

## Project Overview
星河智安实验室平台 (Xinghe Intelligence Security Lab Platform) is a modern, integrated security laboratory management platform focusing on Computer Vision (CV) security. It allows users to test and visualize various adversarial attacks against machine learning models.

### Core Architecture
- **Backend (`api/`)**: Built with **FastAPI** (Python).
  - **Task Queue**: Uses **Celery** with **Redis** as the broker/backend for asynchronous CV task processing.
  - **Database**: Supports **SQLite** (default for local development) and **PostgreSQL**.
  - **Services**: Specialized CV services for classification attacks (e.g., ResNet18 on CIFAR-10) and detection attacks (e.g., YOLOv8).
- **Frontend (`web/`)**: Built with **React** + **Vite**.
  - **UI Framework**: **Ant Design** (v6) with custom glassmorphism and neon styles.
  - **State Management**: React Hooks and custom hooks for attack logic.
  - **Communication**: **Axios** for API requests.

## Building and Running

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis Server (running on `localhost:6379` by default)

### Backend (api)
1. **Environment Setup**:
   ```bash
   cd api
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Configuration**:
   - Copy `.env.example` to `.env` and adjust settings (Database, Redis, etc.).
3. **Run API Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. **Run Celery Worker**:
   ```bash
   # Windows: celery -A app.core.celery_app worker --loglevel=info -P solo
   # Linux/macOS: celery -A app.core.celery_app worker --loglevel=info
   ```
5. **API Documentation**: Available at `http://localhost:8000/docs`

### Frontend (web)
1. **Install Dependencies**:
   ```bash
   cd web
   npm install
   ```
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```

## Development Conventions

### Backend (Python/FastAPI)
- **Structure**: Follows a standard FastAPI layout:
  - `app/api/v1/`: API endpoints/routers.
  - `app/core/`: Global configuration, DB engine, and Celery app.
  - `app/models/`: SQLAlchemy ORM models.
  - `app/schemas/`: Pydantic models for request/response validation.
  - `app/services/`: Business logic, especially CV attack implementations.
  - `app/tasks/`: Celery task definitions.
- **Naming**: Use `snake_case` for functions, variables, and file names. `PascalCase` for classes.
- **Type Hinting**: Use Python type hints (Pydantic models) for all API endpoints and internal services.

### Frontend (React/Vite)
- **Component Organization**:
  - `src/components/common/`: Reusable UI primitives (buttons, sliders, cards).
  - `src/components/business/`: Domain-specific components (selectors, uploaders).
  - `src/pages/`: Main view components.
- **Styling**: Uses standard CSS (global and module-based) with a focus on a "dark mode" aesthetic.
- **Hooks**: Logic for API calls and state management related to attacks should be encapsulated in custom hooks (e.g., `useAttack.js`).
- **Icons**: Use `@ant-design/icons`.

### Data Management
- **Local Storage**: `api/data/` for dataset samples and `api/uploads/` for user-uploaded images and generated results.
- **Paths**: Backend serves these directories via `StaticFiles` at `/data` and `/uploads`.
