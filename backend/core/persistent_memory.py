import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_memory.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_memory_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT DEFAULT 'user',
                importance INTEGER DEFAULT 3,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_memory_item(
    category: str,
    title: str,
    content: str,
    source: str = "user",
    importance: int = 3,
) -> int:
    init_memory_db()

    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO memory_items
            (category, title, content, source, importance, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (category, title, content, source, importance, now, now),
        )
        conn.commit()
        return int(cursor.lastrowid)


def list_recent_memory(limit: int = 20) -> List[Dict[str, Any]]:
    init_memory_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, category, title, content, source, importance, created_at, updated_at
            FROM memory_items
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def search_memory_items(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    init_memory_db()

    like_query = f"%{query.lower()}%"

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, category, title, content, source, importance, created_at, updated_at
            FROM memory_items
            WHERE lower(category) LIKE ?
               OR lower(title) LIKE ?
               OR lower(content) LIKE ?
            ORDER BY importance DESC, id DESC
            LIMIT ?
            """,
            (like_query, like_query, like_query, limit),
        ).fetchall()

    return [dict(row) for row in rows]
