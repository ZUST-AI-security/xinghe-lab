from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Check if we're using SQLite
is_sqlite = settings.database_url.startswith("sqlite")

# SQLite requires 'check_same_thread: False' for FastAPI
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.database_url, 
    connect_args=connect_args
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
