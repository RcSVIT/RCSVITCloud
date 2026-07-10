from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, media, admin, admin_users, stats, share, groups
from database import D1Wrapper
from utils.security import hash_password
import os

app = FastAPI(title="Club Media API", version="1.0.0")

# CORS – reads ALLOWED_ORIGIN from environment
allowed_origin = os.getenv("ALLOWED_ORIGIN", "https://your-github-username.github.io")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin, "http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(admin_users.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(groups.router, prefix="/api")

@app.on_event("startup")
async def startup():
    db = D1Wrapper()
    admin_email = os.getenv("ADMIN_EMAIL", "super@club.com")
    admin_pass = os.getenv("ADMIN_PASSWORD", "securepassword123")
    rows = await db.query("SELECT * FROM admins WHERE email = ?", [admin_email])
    if not rows:
        hashed = hash_password(admin_pass)
        # No UUID – D1 will auto‑increment the integer primary key
        sql = "INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)"
        await db.query(sql, [admin_email, hashed, "super"])
        print(f"Super admin created: {admin_email}")

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "Club Media API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
