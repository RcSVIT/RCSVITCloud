import sys
import traceback
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, media, admin, admin_users, stats, share
from database import D1Wrapper
from utils.security import hash_password
from routers.admin import get_current_admin    # used by the temporary migration route
from migrate import migrate                     # import the migration function
import os

app = FastAPI(title="RCSVIT Cloud API", version="2.0.0")

# CORS – verify ALLOWED_ORIGIN on Render matches exactly https://rcsvit.github.io (no trailing slash)
allowed_origin = os.getenv("ALLOWED_ORIGIN", "https://rcsvit.github.io")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin, "http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (groups removed)
app.include_router(auth.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(admin_users.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(share.router, prefix="/api")

# ─────────────────────────────────────────────────────────────
# TEMPORARY – run once to migrate your existing D1 database,
# then DELETE this entire block and redeploy.
@app.post("/api/admin/migrate")
async def run_migration(current = Depends(get_current_admin)):
    """Execute the simplified schema migration (admin‑only)."""
    await migrate()
    return {"status": "Migration complete – remove this endpoint now."}
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    db = D1Wrapper()
    admin_email = os.getenv("ADMIN_EMAIL", "super@club.com")
    admin_pass = os.getenv("ADMIN_PASSWORD", "securepassword123")
    rows = await db.query("SELECT * FROM admins WHERE email = ?", [admin_email])
    if not rows:
        hashed = hash_password(admin_pass)
        sql = "INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)"
        await db.query(sql, [admin_email, hashed, "super"])
        print(f"Super admin created: {admin_email}")

@app.get("/")
async def root():
    return {"status": "RCSVIT Cloud API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
