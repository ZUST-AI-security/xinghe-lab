from fastapi import APIRouter, HTTPException, Depends
from celery.result import AsyncResult
from app.schemas.schemas import TaskSubmit, TaskResponse, TaskResult
from app.core.celery_app import celery_app
from app.core.db import SessionLocal
from app.models.models import TaskRecord
from sqlalchemy.orm import Session
from typing import Any, Dict, List

router = APIRouter()

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/task/submit", response_model=TaskResponse)
async def submit_task(task_data: TaskSubmit, db: Session = Depends(get_db)):
    """
    Submit a task and save to DB.
    """
    algorithm_id = task_data.algorithm_id
    params = task_data.params
    
    # Send task to Celery
    task = celery_app.send_task(
        "app.tasks.cv_tasks.process_attack",
        args=[algorithm_id, params]
    )
    
    # Save to DB record
    db_task = TaskRecord(
        task_id=task.id,
        algorithm_id=algorithm_id,
        params=params,
        status="PENDING"
    )
    db.add(db_task)
    db.commit()
    
    return TaskResponse(task_id=task.id, status="PENDING")

@router.get("/tasks", response_model=List[Dict[str, Any]])
async def list_tasks(limit: int = 50, db: Session = Depends(get_db)):
    """
    Get all tasks history from DB.
    """
    tasks = db.query(TaskRecord).order_by(TaskRecord.created_at.desc()).limit(limit).all()
    return [
        {
            "task_id": t.task_id,
            "algorithm_id": t.algorithm_id,
            "status": t.status,
            "created_at": t.created_at,
            "params": t.params,
            "result": t.result
        }
        for t in tasks
    ]

@router.get("/task/status/{task_id}", response_model=TaskResult)
async def get_task_status(task_id: str, db: Session = Depends(get_db)):
    """
    Check status and update DB if finished.
    """
    task_result = AsyncResult(task_id, app=celery_app)
    
    # Sync status from Celery to DB
    db_task = db.query(TaskRecord).filter(TaskRecord.task_id == task_id).first()
    
    response = {
        "task_id": task_id,
        "status": task_result.status,
    }
    
    if task_result.status == "SUCCESS":
        result = task_result.result
        response["result"] = result
        if db_task and db_task.status != "SUCCESS":
            db_task.status = "SUCCESS"
            db_task.result = result
            db.commit()
    elif task_result.status == "FAILURE":
        error_msg = str(task_result.result)
        response["result"] = {"error": error_msg}
        if db_task and db_task.status != "FAILURE":
            db_task.status = "FAILURE"
            db_task.result = {"error": error_msg}
            db.commit()
            
    return TaskResult(**response)
