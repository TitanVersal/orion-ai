import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_missions.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_mission_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                goal TEXT NOT NULL,
                status TEXT DEFAULT 'planned',
                priority INTEGER DEFAULT 3,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                details TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id)
            )
            """
        )

        conn.commit()


def create_mission_record(
    title: str,
    goal: str,
    steps: List[str],
    priority: int = 3,
    status: str = "planned",
) -> int:
    init_mission_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO missions
            (title, goal, status, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, goal, status, priority, now, now),
        )

        mission_id = int(cursor.lastrowid)

        for index, step in enumerate(steps, start=1):
            conn.execute(
                """
                INSERT INTO mission_steps
                (mission_id, position, title, details, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (mission_id, index, step, "", "pending", now, now),
            )

        conn.commit()
        return mission_id


def list_mission_records(limit: int = 20) -> List[Dict[str, Any]]:
    init_mission_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, title, goal, status, priority, created_at, updated_at
            FROM missions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_mission_record(mission_id: int) -> Optional[Dict[str, Any]]:
    init_mission_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row

        mission = conn.execute(
            """
            SELECT id, title, goal, status, priority, created_at, updated_at
            FROM missions
            WHERE id = ?
            """,
            (mission_id,),
        ).fetchone()

        if not mission:
            return None

        steps = conn.execute(
            """
            SELECT id, mission_id, position, title, details, status, created_at, updated_at
            FROM mission_steps
            WHERE mission_id = ?
            ORDER BY position ASC
            """,
            (mission_id,),
        ).fetchall()

    result = dict(mission)
    result["steps"] = [dict(step) for step in steps]
    return result


def update_mission_status_record(mission_id: int, status: str) -> bool:
    init_mission_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE missions
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, now, mission_id),
        )
        conn.commit()

    return cursor.rowcount > 0


def update_mission_step_status_record(step_id: int, status: str) -> bool:
    init_mission_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE mission_steps
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, now, step_id),
        )
        conn.commit()

    return cursor.rowcount > 0


def add_mission_step_record(
    mission_id: int,
    title: str,
    details: str = "",
    status: str = "pending",
) -> Optional[int]:
    init_mission_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        current_max = conn.execute(
            """
            SELECT MAX(position)
            FROM mission_steps
            WHERE mission_id = ?
            """,
            (mission_id,),
        ).fetchone()[0]

        position = int(current_max or 0) + 1

        cursor = conn.execute(
            """
            INSERT INTO mission_steps
            (mission_id, position, title, details, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (mission_id, position, title, details, status, now, now),
        )

        conn.execute(
            """
            UPDATE missions
            SET updated_at = ?
            WHERE id = ?
            """,
            (now, mission_id),
        )

        conn.commit()
        return int(cursor.lastrowid)
