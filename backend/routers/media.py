from fastapi import APIRouter, HTTPException, Query
from database import D1Wrapper
from datetime import date

router = APIRouter(prefix="/media", tags=["media"])
db = D1Wrapper()

@router.get("/years")
async def get_public_years():
    sql = """
        SELECT y.id, y.year, y.president_name, y.cover_image,
               (SELECT COUNT(*) FROM media WHERE media.year_id = y.id) AS media_count,
               (SELECT cloudinary_url FROM media WHERE media.year_id = y.id 
                AND media_type = 'image' ORDER BY sort_order ASC, created_at ASC LIMIT 1) AS auto_cover
        FROM years y
        ORDER BY y.year DESC
    """
    rows = await db.query(sql)
    return {"success": True, "data": rows}

@router.get("/")
async def get_media_by_year(
    year_id: int = Query(..., description="Year ID"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    sql = "SELECT * FROM media WHERE year_id = ? ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?"
    rows = await db.query(sql, [year_id, limit, offset])
    return {"success": True, "data": rows}

@router.get("/{media_id}")
async def get_media_item(media_id: int):
    rows = await db.query("SELECT * FROM media WHERE id = ?", [media_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"success": True, "data": rows[0]}

@router.post("/{media_id}/view")
async def track_view(media_id: int):
    await db.query("UPDATE media SET views_count = views_count + 1 WHERE id = ?", [media_id])
    return {"success": True}

@router.post("/{media_id}/share")
async def track_share(media_id: int):
    await db.query("UPDATE media SET shares_count = shares_count + 1 WHERE id = ?", [media_id])
    return {"success": True}

@router.post("/visitor")
async def track_visitor():
    today = date.today().isoformat()
    await db.query(
        "INSERT INTO visitor_stats (date, count) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET count = count + 1",
        [today]
    )
    return {"success": True}

@router.get("/year/{year_id}/related")
async def get_related_media(year_id: int, media_id: int, limit: int = 6):
    sql = "SELECT * FROM media WHERE year_id = ? AND id != ? ORDER BY RANDOM() LIMIT ?"
    rows = await db.query(sql, [year_id, media_id, limit])
    return {"success": True, "data": rows}
