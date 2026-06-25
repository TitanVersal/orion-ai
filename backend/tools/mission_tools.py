from typing import List

from agents import function_tool

from core.tool_logger import instrument_tool
from core.mission_planner import (
    create_mission_record,
    list_mission_records,
    get_mission_record,
    update_mission_status_record,
    update_mission_step_status_record,
    add_mission_step_record,
)


def _format_mission(mission):
    if not mission:
        return "Mission not found."

    steps = mission.get("steps", [])

    if steps:
        steps_text = "\n".join(
            f"- Step {step['position']} [{step['status']}]: "
            f"{step['title']} "
            f"(Step ID: {step['id']})"
            for step in steps
        )
    else:
        steps_text = "No steps yet."

    return f"""
Mission ID: {mission['id']}
Title: {mission['title']}
Goal: {mission['goal']}
Status: {mission['status']}
Priority: {mission['priority']}

Steps:
{steps_text}
""".strip()


@function_tool
@instrument_tool("create_mission")
def create_mission(
    title: str,
    goal: str,
    steps: List[str],
    priority: int = 3,
) -> str:
    """
    Create a structured mission with ordered steps.
    """
    mission_id = create_mission_record(
        title=title,
        goal=goal,
        steps=steps,
        priority=priority,
    )

    return f"Mission created: {title} | Mission ID: {mission_id}"


@function_tool
@instrument_tool("list_missions")
def list_missions(limit: int = 10) -> str:
    """
    List recent missions.
    """
    missions = list_mission_records(limit=limit)

    if not missions:
        return "No missions found."

    return "\n".join(
        f"[{mission['id']}] {mission['title']} | "
        f"Status: {mission['status']} | "
        f"Priority: {mission['priority']}"
        for mission in missions
    )


@function_tool
@instrument_tool("read_mission")
def read_mission(mission_id: int) -> str:
    """
    Read a mission and its steps.
    """
    mission = get_mission_record(mission_id)
    return _format_mission(mission)


@function_tool
@instrument_tool("update_mission_status")
def update_mission_status(mission_id: int, status: str) -> str:
    """
    Update mission status.
    """
    updated = update_mission_status_record(mission_id=mission_id, status=status)

    if not updated:
        return "Mission not found."

    return f"Mission {mission_id} status updated to {status}."


@function_tool
@instrument_tool("update_mission_step_status")
def update_mission_step_status(step_id: int, status: str) -> str:
    """
    Update mission step status.
    """
    updated = update_mission_step_status_record(step_id=step_id, status=status)

    if not updated:
        return "Mission step not found."

    return f"Mission step {step_id} status updated to {status}."


@function_tool
@instrument_tool("add_mission_step")
def add_mission_step(
    mission_id: int,
    title: str,
    details: str = "",
) -> str:
    """
    Add a new step to an existing mission.
    """
    step_id = add_mission_step_record(
        mission_id=mission_id,
        title=title,
        details=details,
    )

    if not step_id:
        return "Mission not found."

    return f"Step added to mission {mission_id}. Step ID: {step_id}"
