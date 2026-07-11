from fastapi import APIRouter, Depends
from database import D1Wrapper
from routers.admin import get_current_admin
import cloudinary, cloudinary.api
from datetime import date

router = APIRouter(prefix="/stats", tags=["stats"])
db = D1Wrapper()

@router.get("/dashboard")
async def get_dashboard_stats(current=Depends(get_current_admin)):
    total_media = (await db.query("SELECT COUNT(*) as count FROM media"))[0]["count"] or 0
    storage = (await db.query("SELECT SUM(file_size) as total FROM media"))[0]["total"] or 0
    views = (await db.query("SELECT SUM(views_count) as total FROM media"))[0]["total"] or 0
    shares = (await db.query("SELECT SUM(shares_count) as total FROM media"))[0]["total"] or 0
    years = (await db.query("SELECT COUNT(*) as count FROM years"))[0]["count"] or 0

    today = date.today().isoformat()
    month_start = date.today().replace(day=1).isoformat()
    year_start = date.today().replace(month=1, day=1).isoformat()
    visitors_today = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date = ?", [today]))[0]["total"] or 0
    visitors_month = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date >= ?", [month_start]))[0]["total"] or 0
    visitors_year = (await db.query("SELECT SUM(count) as total FROM visitor_stats WHERE date >= ?", [year_start]))[0]["total"] or 0

    top_views = await db.query(
        "SELECT id, title, cloudinary_url, media_type, views_count FROM media ORDER BY views_count DESC LIMIT 5"
    )
    top_shares = await db.query(
        "SELECT id, title, cloudinary_url, media_type, shares_count FROM media ORDER BY shares_count DESC LIMIT 5"
    )

    # Real Cloudinary usage
    cloudinary_usage_mb = None
    try:
        usage_data = cloudinary.api.usage()
        cloudinary_usage_mb = round(usage_data.get("storage", {}).get("usage", 0) / (1024*1024), 2)
    except:
        pass

    return {
        "total_media": total_media,
        "storage_bytes": storage,
        "total_views": views,
        "total_shares": shares,
        "total_years": years,
        "visitors_today": visitors_today,
        "visitors_month": visitors_month,
        "visitors_year": visitors_year,
        "top_views": top_views,
        "top_shares": top_shares,
        "render_status": "Online",
        "cloudinary_usage_mb": cloudinary_usage_mb,
        "d1_storage_mb": None,
        "d1_requests_monthly": None
    }
