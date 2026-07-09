from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from database import D1Wrapper
import os

router = APIRouter(prefix="/share", tags=["share"])
db = D1Wrapper()
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
GITHUB_PAGES_URL = "https://your-github-username.github.io"  # CHANGE THIS

@router.get("/{media_id}", response_class=HTMLResponse)
async def share_page(media_id: str):
    rows = await db.query("SELECT * FROM media WHERE id = ?", [media_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Media not found")
    media = rows[0]
    public_id = media["cloudinary_public_id"]
    resource_type = media["media_type"]
    if resource_type == "video":
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/video/upload/w_1200,h_630,c_fill,so_0/{public_id}.jpg"
    else:
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/w_1200,h_630,c_fill/{public_id}.jpg"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="{media.get('title', 'Club Media')}">
        <meta property="og:description" content="{media.get('description', 'Shared from our club archive')}">
        <meta property="og:image" content="{thumbnail_url}">
        <meta property="og:url" content="{GITHUB_PAGES_URL}/detail.html?id={media_id}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{media.get('title', 'Club Media')}">
        <meta name="twitter:description" content="{media.get('description', 'Shared from our club archive')}">
        <meta name="twitter:image" content="{thumbnail_url}">
        <title>{media.get('title', 'Club Media')}</title>
        <meta http-equiv="refresh" content="0; url={GITHUB_PAGES_URL}/detail.html?id={media_id}">
    </head>
    <body>
        <p>Redirecting to <a href="{GITHUB_PAGES_URL}/detail.html?id={media_id}">media detail</a>...</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
