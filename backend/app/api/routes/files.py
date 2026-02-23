from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

# Resolve upload directory - same logic as in storage.py
# backend/app/api/routes/files.py -> backend/uploads
UPLOAD_DIR = (Path(__file__).parent.parent.parent.parent / "uploads").resolve()

@router.get("/{file_path:path}")
async def get_file(file_path: str):
    """
    Serve a file from local storage.
    """
    # Simple security check to prevent directory traversal
    if ".." in file_path:
        raise HTTPException(status_code=400, detail="Invalid file path")
        
    full_path = UPLOAD_DIR / file_path
    
    # Resolve absolute path to ensure it's within UPLOAD_DIR
    try:
        resolved_path = full_path.resolve()
        if not str(resolved_path).startswith(str(UPLOAD_DIR)):
             raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
         raise HTTPException(status_code=404, detail="File not found")

    if not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(resolved_path)
