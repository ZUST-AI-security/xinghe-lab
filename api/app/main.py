from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1 import algorithms, tasks, datasets, uploads
from app.core.db import engine, Base
from app.models import models
import os

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Xinghe Lab AI Platform", version="2.0.0")

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files ---
os.makedirs("data/samples", exist_ok=True)
os.makedirs("uploads/original", exist_ok=True)
os.makedirs("uploads/results", exist_ok=True)

# Mount data for serving dataset samples
app.mount("/data", StaticFiles(directory="data"), name="data")
# Mount uploads for serving user images and results
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- Include Routers ---
app.include_router(algorithms.router, prefix="/api", tags=["Registry"])
app.include_router(tasks.router, prefix="/api", tags=["Tasks"])
app.include_router(datasets.router, prefix="/api", tags=["Datasets"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])

@app.get("/")
async def root():
    return {"message": "Welcome to Xinghe Lab AI Platform API v2"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
