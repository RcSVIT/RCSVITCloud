import os, cloudinary, cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import D1Wrapper
from utils.security import decode_access_token
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()
db = D1Wrapper()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    rows = await db.query("SELECT * FROM admins WHERE email = ?", [email])
    if not rows:
        raise HTTPException(status_code=401, detail="Admin not found")
    return rows[0]

# ── Year CRUD ──
class YearCreate(BaseModel):
    year: int
    president_name: Optional[str] = None
    cover_image: Optional[str] = None

class YearUpdate(BaseModel):
    president_name: Optional[str] = None
    cover_image: Optional[str] = None

@router.post("/years")
async def create_year(year: YearCreate, current=Depends(get_current_admin)):
    sql = "INSERT INTO years (year, president_name, cover_image) VALUES (?, ?, ?)"
    await db.query(sql, [year.year, year.president_name, year.cover_image or ''])
    # Retrieve the newly created ID
    rows = await db.query("SELECT id FROM years WHERE year = ? ORDER BY id DESC LIMIT 1", [year.year])
    new_id = rows[0]["id"] if rows else None
    return {"success": True, "id": new_id}

@router.put("/years/{year_id}")
async def update_year(year_id: int, update: YearUpdate, current=Depends(get_current_admin)):
    fields = []
    params = []
    if update.president_name is not None:
        fields.append("president_name = ?")
        params.append(update.president_name)
    if update.cover_image is not None:
        fields.append("cover_image = ?")
        params.append(update.cover_image)
    if not fields:
        return {"success": True, "message": "No changes"}
    params.append(year_id)
    sql = f"UPDATE years SET {', '.join(fields)} WHERE id = ?"
    await db.query(sql, params)
    return {"success": True}

@router.delete("/years/{year_id}")
async def delete_year(year_id: int, current=Depends(get_current_admin)):
    await db.query("DELETE FROM years WHERE id = ?", [year_id])
    return {"success": True}

@router.get("/years")
async def get_years(current=Depends(get_current_admin)):
    sql = """
        SELECT y.*, 
               (SELECT COUNT(*) FROM media WHERE media.year_id = y.id) AS media_count
        FROM years y ORDER BY year DESC
    """
    rows = await db.query(sql)
    return {"success": True, "data": rows}

# ── Cover image upload endpoint ──
@router.post("/years/{year_id}/cover")
async def upload_year_cover(
    year_id: int,
    file: UploadFile = File(...),
    current=Depends(get_current_admin)
):
    contents = await file.read()
    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder="rcsvit_covers",
            resource_type="image"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

    cover_url = upload_result["secure_url"]
    await db.query("UPDATE years SET cover_image = ? WHERE id = ?", [cover_url, year_id])
    return {"success": True, "cover_image": cover_url}

# ── Media CRUD (simplified fields) ──
class MediaCreate(BaseModel):
    year_id: int
    title: str
    description: Optional[str] = None
    capture_date: Optional[str] = None
    location: Optional[str] = None
    people: Optional[str] = None
    cloudinary_public_id: str
    cloudinary_url: str
    media_type: str
    file_size: int = 0
    parent_id: Optional[int] = None
    sort_order: int = 0

class MediaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    capture_date: Optional[str] = None
    location: Optional[str] = None
    people: Optional[str] = None
    sort_order: Optional[int] = None

@router.post("/media")
async def create_media(media: MediaCreate, current=Depends(get_current_admin)):
    uploaded_by = current["email"]
    sql = """INSERT INTO media (
        year_id, title, description, capture_date, location, people, uploaded_by,
        cloudinary_public_id, cloudinary_url, media_type, file_size, parent_id, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
    await db.query(sql, [
        media.year_id, media.title, media.description,
        media.capture_date, media.location, media.people, uploaded_by,
        media.cloudinary_public_id, media.cloudinary_url,
        media.media_type, media.file_size, media.parent_id, media.sort_order
    ])
    return {"success": True}

@router.put("/media/{media_id}")
async def update_media(media_id: int, update: MediaUpdate, current=Depends(get_current_admin)):
    fields = []
    params = []
    for field, value in update.dict(exclude_unset=True).items():
        if value is not None:
            fields.append(f"{field} = ?")
            params.append(value)
    if not fields:
        return {"success": True, "message": "No changes"}
    params.append(media_id)
    sql = f"UPDATE media SET {', '.join(fields)} WHERE id = ?"
    await db.query(sql, params)
    return {"success": True}

@router.delete("/media/{media_id}")
async def delete_media(media_id: int, current=Depends(get_current_admin)):
    rows = await db.query("SELECT cloudinary_public_id, media_type FROM media WHERE id = ?", [media_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Media not found")
    public_id = rows[0]["cloudinary_public_id"]
    resource_type = rows[0]["media_type"]
    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    if result.get("result") != "ok":
        raise HTTPException(status_code=500, detail="Cloudinary deletion failed")
    await db.query("DELETE FROM media WHERE id = ?", [media_id])
    return {"success": True}

@router.get("/media")
async def list_media(limit: int = 100, offset: int = 0, current=Depends(get_current_admin)):
    rows = await db.query("SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset])
    return {"success": True, "data": rows}
