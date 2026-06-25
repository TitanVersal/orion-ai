import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
REPORTS_DIR = DATA_DIR / "mission_reports"
DB_PATH = DATA_DIR / "orion_mission_runs.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_mission_run_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_id INTEGER,
                mission_title TEXT NOT NULL,
                step_title TEXT DEFAULT '',
                status TEXT DEFAULT 'started',
                output TEXT DEFAULT '',
                error TEXT DEFAULT '',
                started_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def start_mission_run(
    mission_id: int,
    mission_title: str,
    step_id: Optional[int],
    step_title: str,
) -> int:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO mission_runs
            (mission_id, step_id, mission_title, step_title, status, output, error, started_at, completed_at, created_at)
            VALUES (?, ?, ?, ?, 'started', '', '', ?, '', ?)
            """,
            (mission_id, step_id, mission_title, step_title, now, now),
        )
        conn.commit()
        return int(cursor.lastrowid)


def complete_mission_run(run_id: int, status: str, output: str) -> bool:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET status = ?, output = ?, completed_at = ?
            WHERE id = ?
            """,
            (status, output, now, run_id),
        )
        conn.commit()

    return cursor.rowcount > 0


def fail_mission_run(run_id: int, error: str) -> bool:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET status = 'error', error = ?, completed_at = ?
            WHERE id = ?
            """,
            (error, now, run_id),
        )
        conn.commit()

    return cursor.rowcount > 0


def list_mission_runs(limit: int = 30) -> List[Dict[str, Any]]:
    init_mission_run_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM mission_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def list_runs_for_mission(mission_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    init_mission_run_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM mission_runs
            WHERE mission_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (mission_id, limit),
        ).fetchall()

    return [dict(row) for row in rows]


def generate_mission_report(mission: Dict[str, Any]) -> str:
    init_mission_run_db()

    mission_id = int(mission["id"])
    runs = list_runs_for_mission(mission_id=mission_id, limit=100)

    safe_title = (
        mission["title"]
        .lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
    )

    file_path = REPORTS_DIR / f"mission_{mission_id}_{safe_title}_report.md"

    steps = mission.get("steps", [])

    step_text = "\n".join(
        f"- Step {step['position']} [{step['status']}]: {step['title']} "
        f"(Step ID: {step['id']})"
        for step in steps
    ) or "No steps recorded."

    run_text = "\n\n".join(
        f"## Run #{run['id']}\n\n"
        f"- Mission ID: {run['mission_id']}\n"
        f"- Step ID: {run['step_id']}\n"
        f"- Step Title: {run['step_title']}\n"
        f"- Status: {run['status']}\n"
        f"- Started: {run['started_at']}\n"
        f"- Completed: {run['completed_at']}\n\n"
        f"### Output\n\n{run['output'] or 'No output.'}\n\n"
        f"### Error\n\n{run['error'] or 'No error.'}"
        for run in runs
    ) or "No mission runs recorded yet."

    content = f"""# Mission Execution Report

## Mission

- Mission ID: {mission['id']}
- Title: {mission['title']}
- Goal: {mission['goal']}
- Status: {mission['status']}
- Priority: {mission['priority']}
- Created: {mission['created_at']}
- Updated: {mission['updated_at']}

## Mission Steps

{step_text}

## Execution History

{run_text}
"""

    file_path.write_text(content, encoding="utf-8")
    return str(file_path)
