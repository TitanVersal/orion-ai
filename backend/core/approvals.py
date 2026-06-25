import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_approvals.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_approval_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS approval_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                risk_level TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                result TEXT DEFAULT '',
                source TEXT DEFAULT 'O.R.I.O.N.',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def create_approval_request(
    action_type: str,
    title: str,
    description: str,
    payload: Dict[str, Any],
    risk_level: str = "medium",
    source: str = "O.R.I.O.N.",
) -> int:
    init_approval_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO approval_requests
            (action_type, title, description, payload_json, risk_level, status, result, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', '', ?, ?, ?)
            """,
            (
                action_type,
                title,
                description,
                json.dumps(payload),
                risk_level,
                source,
                now,
                now,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    data = dict(row)

    try:
        data["payload"] = json.loads(data.pop("payload_json"))
    except json.JSONDecodeError:
        data["payload"] = {}

    return data


def list_approval_requests(
    limit: int = 30,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    init_approval_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row

        if status:
            rows = conn.execute(
                """
                SELECT *
                FROM approval_requests
                WHERE status = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT *
                FROM approval_requests
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    return [_row_to_dict(row) for row in rows]


def get_approval_request(approval_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT *
            FROM approval_requests
            WHERE id = ?
            """,
            (approval_id,),
        ).fetchone()

    if not row:
        return None

    return _row_to_dict(row)


def update_approval_status(
    approval_id: int,
    status: str,
    result: str = "",
) -> bool:
    init_approval_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE approval_requests
            SET status = ?, result = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, result, now, approval_id),
        )
        conn.commit()

    return cursor.rowcount > 0
