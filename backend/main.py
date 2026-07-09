from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, media, admin, admin_users, stats, share, groups
from database import D1Wrapper
from utils.security import hash_password
import os, uuid

app = FastAPI(title="Club Media API", version="1.0.0")

# CORS – update with your GitHub Pages URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://YOUR_GITHUB_USERNAME.github.io",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(media.router, prefix="/api")      # public media endpoints + years
app.include_router(admin.router, prefix="/api")      # protected CRUD
app.include_router(admin_users.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(groups.router, prefix="/api")

@app.on_event("startup")
async def startup():
    db = D1Wrapper()
    # Create super admin if not exists
    admin_email = os.getenv("ADMIN_EMAIL", "super@club.com")
    admin_pass = os.getenv("ADMIN_PASSWORD", "securepassword123")
    rows = await db.query("SELECT * FROM admins WHERE email = ?", [admin_email])
    if not rows:
        hashed = hash_password(admin_pass)
        admin_id = str(uuid.uuid4())
        sql = "INSERT INTO admins (id, email, password_hash, role) VALUES (?, ?, ?, ?)"
        await db.query(sql, [admin_id, admin_email, hashed, "super"])
        print(f"Super admin created: {admin_email}")

@app.get("/")
async def root():
    return {"status": "Club Media API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
