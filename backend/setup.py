import asyncio
from database import D1Wrapper

async def create_tables():
    db = D1Wrapper()
    sqls = [
        """
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TEXT DEFAULT (datetime('now'))
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            president_name TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_id INTEGER NOT NULL,
            title TEXT,
            description TEXT,
            capture_date TEXT,
            upload_date TEXT,
            location TEXT,
            people TEXT,
            event TEXT,
            tags TEXT,
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
        """,
        """
        CREATE TABLE IF NOT EXISTS visitor_stats (
            date TEXT PRIMARY KEY,
            count INTEGER DEFAULT 0
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_media_year ON media(year_id);",
        "CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media(capture_date);",
        "CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);",
        "CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);"
    ]
    for sql in sqls:
        await db.query(sql)
        print(f"Executed: {sql[:60]}...")

if __name__ == "__main__":
    asyncio.run(create_tables())
    print("Tables created successfully.")
