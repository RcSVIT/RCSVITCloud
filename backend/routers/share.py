from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from database import D1Wrapper
import os

router = APIRouter(prefix="/share", tags=["share"])
db = D1Wrapper()
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
GITHUB_PAGES_URL = os.getenv("GITHUB_PAGES_URL", "https://your-github-pages-url.com")

@router.get("/{media_id}", response_class=HTMLResponse)
async def share_page(media_id: int):   # <-- changed to int
    rows = await db.query("SELECT * FROM media WHERE id = ?", [media_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Media not found")
    media = rows[0]

    title = media.get("title") or "Club Media"
    description = media.get("description") or ""
    if not description.strip():
        description = "Shared from our club archive"
    # Truncate for social cards
    og_description = (description[:197] + "...") if len(description) > 200 else description

    public_id = media["cloudinary_public_id"]
    resource_type = media["media_type"]
    if resource_type == "video":
        # Grab first frame and crop to 1200×630
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/video/upload/w_1200,h_630,c_fill,so_1/{public_id}.jpg"
    else:
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/w_1200,h_630,c_fill/{public_id}"

    page_url = f"{GITHUB_PAGES_URL}/detail.html?id={media_id}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="{title}">
        <meta property="og:description" content="{og_description}">
        <meta property="og:image" content="{thumbnail_url}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:url" content="{page_url}">
        <meta property="og:type" content="article">
        <meta property="og:site_name" content="RCSVIT Media">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{title}">
        <meta name="twitter:description" content="{og_description}">
        <meta name="twitter:image" content="{thumbnail_url}">
        <meta name="description" content="{og_description}">
        <title>{title} — RCSVIT</title>
        <meta http-equiv="refresh" content="0; url={page_url}">
    </head>
    <body>
        <p>Redirecting to <a href="{page_url}">media detail</a>...</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
