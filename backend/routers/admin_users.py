import uuid
from fastapi import APIRouter, Depends, HTTPException
from database import D1Wrapper
from utils.security import hash_password
from pydantic import BaseModel
from typing import Optional, List
from routers.admin import get_current_admin

# Disable automatic trailing‑slash redirects to avoid 403 on /api/admin/users
router = APIRouter(prefix="/admin/users", tags=["admin_users"], redirect_slashes=False)
db = D1Wrapper()

class AdminCreate(BaseModel):
    email: str
    password: str
    role: str = "admin"

# id is now int, matching INTEGER PRIMARY KEY AUTOINCREMENT
class AdminOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: Optional[int] = None

async def get_super_admin(current=Depends(get_current_admin)):
    if current["role"] != "super":
        raise HTTPException(status_code=403, detail="Super admin privilege required")
    return current

@router.get("/", response_model=List[AdminOut])
async def list_admins(current=Depends(get_super_admin)):
    rows = await db.query("SELECT id, email, role, created_at FROM admins ORDER BY created_at")
    return rows

@router.post("/")
async def create_admin(admin: AdminCreate, current=Depends(get_super_admin)):
    # No UUID – D1 will auto‑increment the integer primary key
    hashed = hash_password(admin.password)
    sql = "INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)"
    await db.query(sql, [admin.email, hashed, admin.role])
    return {"success": True}

@router.delete("/{admin_id}")
async def delete_admin(admin_id: int, current=Depends(get_super_admin)):   # admin_id is now int
    if admin_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    await db.query("DELETE FROM admins WHERE id = ?", [admin_id])
    return {"success": True}
