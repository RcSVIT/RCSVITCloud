from fastapi import APIRouter, HTTPException
from database import D1Wrapper
from utils.security import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])
db = D1Wrapper()

class AdminLogin(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(login: AdminLogin):
    rows = await db.query("SELECT * FROM admins WHERE email = ?", [login.email])
    if not rows or not verify_password(login.password, rows[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": login.email, "role": rows[0]["role"]})
    return {"access_token": token, "token_type": "bearer", "role": rows[0]["role"]}
