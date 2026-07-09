from fastapi import APIRouter, Query
from database import D1Wrapper

router = APIRouter(prefix="/groups", tags=["groups"])
db = D1Wrapper()

@router.get("/")
async def get_groups(year_id: str = Query(...)):
    sql = "SELECT * FROM media WHERE year_id = ? AND parent_id IS NOT NULL ORDER BY parent_id, sort_order"
    rows = await db.query(sql, [year_id])
    groups = {}
    for item in rows:
        parent = item["parent_id"]
        if parent not in groups:
            groups[parent] = []
        groups[parent].append(item)
    return {"success": True, "data": groups}

@router.get("/{parent_id}")
async def get_group(parent_id: str):
    sql = "SELECT * FROM media WHERE parent_id = ? ORDER BY sort_order"
    rows = await db.query(sql, [parent_id])
    return {"success": True, "data": rows}
    
