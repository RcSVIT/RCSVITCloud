from fastapi import APIRouter, Depends
from database import D1Wrapper
from routers.admin import get_current_admin

router = APIRouter(prefix="/stats", tags=["stats"])
db = D1Wrapper()

@router.get("/dashboard")
async def get_dashboard_stats(current=Depends(get_current_admin)):
    total_media = (await db.query("SELECT COUNT(*) as count FROM media"))[0]["count"] or 0
    storage = (await db.query("SELECT SUM(file_size) as total FROM media"))[0]["total"] or 0
    views = (await db.query("SELECT SUM(views_count) as total FROM media"))[0]["total"] or 0
    shares = (await db.query("SELECT SUM(shares_count) as total FROM media"))[0]["total"] or 0
    years = (await db.query("SELECT COUNT(*) as count FROM years"))[0]["count"] or 0

    today = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date = date('now')"))[0]["total"] or 0
    month = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date >= date('now', 'start of month')"))[0]["total"] or 0
    year_visitors = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date >= date('now', 'start of year')"))[0]["total"] or 0

    top_views = await db.query(
        "SELECT id, title, cloudinary_url, media_type, views_count FROM media ORDER BY views_count DESC LIMIT 5"
    )
    top_shares = await db.query(
        "SELECT id, title, cloudinary_url, media_type, shares_count FROM media ORDER BY shares_count DESC LIMIT 5"
    )

    return {
        "total_media": total_media,
        "storage_bytes": storage,
        "total_views": views,
        "total_shares": shares,
        "total_years": years,
        "visitors_today": today,
        "visitors_month": month,
        "visitors_year": year_visitors,
        "top_views": top_views,
        "top_shares": top_shares
    }
