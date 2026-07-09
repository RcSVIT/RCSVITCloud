import uuid
from fastapi import APIRouter, Depends, HTTPException
from database import D1Wrapper
from utils.security import hash_password
from pydantic import BaseModel, Optional
from routers.admin import get_current_admin

router = APIRouter(prefix="/admin/users", tags=["admin_users"])
db = D1Wrapper()

class AdminCreate(BaseModel):
    email: str
    password: str
    role: str = "admin"

class AdminOut(BaseModel):
    id: str
    email: str
    role: str
    created_at: int

async def get_super_admin(current=Depends(get_current_admin)):
    if current["role"] != "super":
        raise HTTPException(status_code=403, detail="Super admin privilege required")
    return current

@router.get("/", response_model=list[AdminOut])
async def list_admins(current=Depends(get_super_admin)):
    rows = await db.query("SELECT id, email, role, created_at FROM admins ORDER BY created_at")
    return rows

@router.post("/")
async def create_admin(admin: AdminCreate, current=Depends(get_super_admin)):
    admin_id = str(uuid.uuid4())
    hashed = hash_password(admin.password)
    sql = "INSERT INTO admins (id, email, password_hash, role) VALUES (?, ?, ?, ?)"
    await db.query(sql, [admin_id, admin.email, hashed, admin.role])
    return {"success": True, "id": admin_id}

@router.delete("/{admin_id}")
async def delete_admin(admin_id: str, current=Depends(get_super_admin)):
    if admin_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    await db.query("DELETE FROM admins WHERE id = ?", [admin_id])
    return {"success": True}
