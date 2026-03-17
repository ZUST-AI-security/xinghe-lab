from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
import os
import shutil

router = APIRouter()

# Store original user uploads separately
UPLOAD_DIR = "uploads/original"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Handle user image uploads, stored in uploads/original.
    """
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, WEBP allowed.")
    
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    return {
        "url": f"/uploads/original/{filename}",
        "id": filename
    }
