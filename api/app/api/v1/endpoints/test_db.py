from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from sqlalchemy import text

router = APIRouter()

@router.get("/test-connection")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # Simple test query
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Database connection is working!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
