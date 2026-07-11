import asyncio, os
from database import D1Wrapper

async def migrate():
    db = D1Wrapper()
    # Check if migration already applied
    try:
        await db.query("SELECT 1 FROM media_new LIMIT 1")
        print("media_new already exists. Skipping migration.")
        return
    except:
        pass

    print("Step 1/4: Creating media_new with simplified schema...")
    await db.query("""
        CREATE TABLE media_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            capture_date TEXT,
            location TEXT,
            people TEXT,
            uploaded_by TEXT,
            cloudinary_public_id TEXT NOT NULL,
            cloudinary_url TEXT NOT NULL,
            media_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            parent_id INTEGER,
            sort_order INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE
        );
    """)
    print("Step 2/4: Copying data (old fields dropped, uploaded_by set to NULL)...")
    await db.query("""
        INSERT INTO media_new (id, year_id, title, description, capture_date,
                               location, people, cloudinary_public_id, cloudinary_url,
                               media_type, file_size, parent_id, sort_order,
                               views_count, shares_count, created_at)
        SELECT id, year_id, title, description, capture_date,
               location, people, cloudinary_public_id, cloudinary_url,
               media_type, file_size, parent_id, sort_order,
               views_count, shares_count, created_at
        FROM media;
    """)
    print("Step 3/4: Dropping old media table...")
    await db.query("DROP TABLE media;")
    print("Step 4/4: Renaming media_new to media...")
    await db.query("ALTER TABLE media_new RENAME TO media;")
    print("Recreating indexes...")
    await db.query("CREATE INDEX IF NOT EXISTS idx_media_year ON media(year_id);")
    await db.query("CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media(capture_date);")
    await db.query("CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);")
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
