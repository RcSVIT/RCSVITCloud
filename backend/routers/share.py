import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from database import D1Wrapper

router = APIRouter(prefix="/share", tags=["share"])
db = D1Wrapper()
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
GITHUB_PAGES_URL = os.getenv("GITHUB_PAGES_URL", "https://rcsvit.github.io/RCSVITCloud")

@router.get("/{media_id}", response_class=HTMLResponse)
async def share_page(media_id: int):
    rows = await db.query("SELECT * FROM media WHERE id = ?", [media_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Media not found")
    media = rows[0]
    title = media.get("title") or "RCSVIT Media"
    description = media.get("description") or ""
    if not description.strip():
        description = "Shared from our club archive"
    og_description = (description[:197] + "...") if len(description) > 200 else description

    public_id = media["cloudinary_public_id"]
    resource_type = media["media_type"]
    if resource_type == "video":
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/video/upload/so_1,c_fill,w_1200,h_630/{public_id}.jpg"
    else:
        thumbnail_url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/c_fill,w_1200,h_630/{public_id}"

    page_url = f"{GITHUB_PAGES_URL}/detail.html?id={media_id}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{og_description}">
    <meta property="og:image" content="{thumbnail_url}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="{page_url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="RCSVIT Cloud">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{og_description}">
    <meta name="twitter:image" content="{thumbnail_url}">
    <meta name="description" content="{og_description}">
    <title>{title} — RCSVIT</title>
    <meta http-equiv="refresh" content="3;url={page_url}">
</head>
<body>
    <p>Redirecting to <a href="{page_url}">{title}</a>…</p>
</body>
</html>"""
    return HTMLResponse(content=html)
