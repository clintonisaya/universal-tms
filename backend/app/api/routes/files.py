import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.models import User

router = APIRouter()

# Resolve upload directory - same logic as in storage.py
# backend/app/api/routes/files.py -> backend/uploads
UPLOAD_DIR = (Path(__file__).parent.parent.parent.parent / "uploads").resolve()


@router.get("/{file_path:path}")
async def get_file(
    file_path: str,
    _user: User = Depends(get_current_user),
):
    """
    Serve a file from local storage.
    Requires authentication. Blocks path traversal attacks.
    """
    full_path = UPLOAD_DIR / file_path

    # Resolve real path and validate it stays within UPLOAD_DIR
    try:
        resolved_path = Path(os.path.realpath(full_path))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not str(resolved_path).startswith(str(UPLOAD_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(resolved_path)
