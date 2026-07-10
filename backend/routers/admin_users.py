import uuid
from fastapi import APIRouter, Depends, HTTPException
from database import D1Wrapper
from utils.security import hash_password
from pydantic import BaseModel
from typing import Optional, List
from routers.admin import get_current_admin

# Disable automatic trailing‑slash redirects to avoid CORS issues
router = APIRouter(prefix="/admin/users", tags=["admin_users"], redirect_slashes=False)
db = D1Wrapper()

class AdminCreate(BaseModel):
    email: str
    password: str
    role: str = "admin"

class AdminOut(BaseModel):
    id: int          # integer primary key
    email: str
    role: str
    created_at: Optional[int] = None

# Helper: only super admins can create/delete other admins
async def get_super_admin(current=Depends(get_current_admin)):
    if current["role"] != "super":
        raise HTTPException(status_code=403, detail="Super admin privilege required")
    return current

@router.get("/", response_model=List[AdminOut])
async def list_admins(current=Depends(get_current_admin)):
    """Any logged-in admin can view the admin list."""
    rows = await db.query("SELECT id, email, role, created_at FROM admins ORDER BY created_at")
    return rows

@router.post("/")
async def create_admin(admin: AdminCreate, current=Depends(get_super_admin)):
    """Only super admins can create new admins."""
    # Check for duplicate email
    existing = await db.query("SELECT id FROM admins WHERE email = ?", [admin.email])
    if existing:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    hashed = hash_password(admin.password)
    sql = "INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)"
    await db.query(sql, [admin.email, hashed, admin.role])
    return {"success": True}

@router.delete("/{admin_id}")
async def delete_admin(admin_id: int, current=Depends(get_super_admin)):
    """Only super admins can delete other admins. Cannot delete yourself."""
    if admin_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    await db.query("DELETE FROM admins WHERE id = ?", [admin_id])
    return {"success": True}
