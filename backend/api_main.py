import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(dotenv_path=BACKEND_DIR / ".env")

from agents import Agent, Runner, SQLiteSession

from core.prompt import ORION_SYSTEM_PROMPT

from core.activity import log_activity, get_recent_activity, clear_activity

from core.persistent_memory import (
    init_memory_db,
    list_recent_memory,
    search_memory_items,
)

from core.mission_planner import (
    init_mission_db,
    list_mission_records,
    get_mission_record,
)

from core.mission_run_history import (
    init_mission_run_db,
    start_mission_run,
    complete_mission_run,
    fail_mission_run,
    list_mission_runs,
    list_runs_for_mission,
    generate_mission_report,
)

from core.approvals import (
    init_approval_db,
    list_approval_requests,
    update_approval_status,
)

from tools.safe_tools import (
    create_note,
    read_note,
    save_activity_log,
    list_notes,
)

from tools.project_tools import (
    register_project,
    list_projects,
    read_project,
    update_project_status,
    add_project_note,
    save_project_roadmap,
    save_portfolio_summary,
)

from tools.dev_tools import (
    get_system_status,
    list_directory,
    read_project_file,
    write_project_file,
    run_safe_command,
    execute_approved_dev_action,
)

from tools.memory_tools import (
    remember_information,
    search_persistent_memory,
    list_recent_persistent_memory,
)

from tools.mission_tools import (
    create_mission,
    list_missions,
    read_mission,
    update_mission_status,
    update_mission_step_status,
    add_mission_step,
)


app = FastAPI(
    title="O.R.I.O.N. API",
    description="Operational Response and Intelligent Orchestration Network backend API.",
    version="1.7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


orion = Agent(
    name="O.R.I.O.N.",
    instructions=ORION_SYSTEM_PROMPT,
    tools=[
        create_note,
        read_note,
        save_activity_log,
        list_notes,
        register_project,
        list_projects,
        read_project,
        update_project_status,
        add_project_note,
        save_project_roadmap,
        save_portfolio_summary,
        get_system_status,
        list_directory,
        read_project_file,
        write_project_file,
        run_safe_command,
        remember_information,
        search_persistent_memory,
        list_recent_persistent_memory,
        create_mission,
        list_missions,
        read_mission,
        update_mission_status,
        update_mission_step_status,
        add_mission_step,
    ],
)

session = SQLiteSession("orion_core_v17_dashboard")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class SystemStatusResponse(BaseModel):
    name: str
    version: str
    mode: str
    status: str
    tagline: str
    modules: List[str]


class ActivityEvent(BaseModel):
    id: int
    timestamp: str
    type: str
    source: str
    message: str


class ActivityResponse(BaseModel):
    events: List[ActivityEvent]


class ProjectItem(BaseModel):
    key: str
    name: str
    type: str
    status: str
    description: str
    updated_at: Optional[str] = None


class ProjectsResponse(BaseModel):
    projects: List[ProjectItem]


class MemoryItem(BaseModel):
    id: int
    category: str
    title: str
    content: str
    source: str
    importance: int
    created_at: str
    updated_at: str


class MemoryResponse(BaseModel):
    items: List[MemoryItem]


class MissionStepItem(BaseModel):
    id: int
    mission_id: int
    position: int
    title: str
    details: str
    status: str
    created_at: str
    updated_at: str


class MissionItem(BaseModel):
    id: int
    title: str
    goal: str
    status: str
    priority: int
    created_at: str
    updated_at: str


class MissionDetailItem(MissionItem):
    steps: List[MissionStepItem] = Field(default_factory=list)


class MissionsResponse(BaseModel):
    missions: List[MissionItem]


class MissionRunResponse(BaseModel):
    mission_id: int
    step_id: Optional[int] = None
    status: str
    output: str
    result: Optional[str] = None


class MissionRunItem(BaseModel):
    id: int
    mission_id: int
    step_id: Optional[int] = None
    mission_title: str
    step_title: str
    status: str
    output: str
    error: str
    started_at: str
    completed_at: Optional[str] = None
    created_at: str


class MissionRunsResponse(BaseModel):
    runs: List[MissionRunItem]


class MissionReportResponse(BaseModel):
    mission_id: int
    report_path: str
    status: str


class ApprovalItem(BaseModel):
    id: int
    action_type: str
    title: str
    description: str
    payload: Dict[str, Any]
    risk_level: str
    status: str
    result: str
    source: str
    created_at: str
    updated_at: str


class ApprovalsResponse(BaseModel):
    approvals: List[ApprovalItem]


@app.on_event("startup")
def startup_event():
    init_memory_db()
    init_mission_db()
    init_approval_db()
    init_mission_run_db()

    log_activity(
        "SYSTEM_START",
        "O.R.I.O.N. API v1.7.0 started with mission run history enabled.",
        "API",
    )


@app.get("/")
def root():
    return {
        "name": "O.R.I.O.N.",
        "version": "1.7.0",
        "status": "online",
        "mode": "Aurora OS API Bridge",
    }


def load_project_items() -> List[ProjectItem]:
    projects_file = BACKEND_DIR / "data" / "projects.json"

    if not projects_file.exists():
        return []

    try:
        projects_data = json.loads(projects_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    items: List[ProjectItem] = []

    for key, project in projects_data.items():
        items.append(
            ProjectItem(
                key=key,
                name=project.get("name", key),
                type=project.get("type", "Unknown"),
                status=project.get("status", "unknown"),
                description=project.get("description", ""),
                updated_at=project.get("updated_at"),
            )
        )

    return items


def get_next_actionable_step(mission: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    steps = mission.get("steps", [])

    for step in steps:
        if step.get("status") in ["pending", "in_progress", "waiting_approval"]:
            return step

    return None


@app.get("/api/status", response_model=SystemStatusResponse)
def status():
    return SystemStatusResponse(
        name="O.R.I.O.N.",
        version="1.7.0",
        mode="Aurora OS Dashboard",
        status="online",
        tagline="Think. Plan. Act. Learn.",
        modules=[
            "AI Brain",
            "Safe Tools",
            "Project Memory",
            "Developer Command Center",
            "Voice Mode",
            "Wake Phrase Mode",
            "Aurora OS API",
            "Live Activity Timeline",
            "Tool-Level Instrumentation",
            "Project Launcher Panel",
            "Mission Control Release",
            "UI Polish + Screenshot Showcase",
            "Persistent Memory Upgrade",
            "Command Approval System",
            "Controlled Autonomous Mission Execution Loop",
            "Mission Run History + Execution Reports",
        ],
    )


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "O.R.I.O.N.",
        "version": "1.7.0",
        "message": "O.R.I.O.N. Mission Control backend is operational.",
    }


@app.get("/api/mission")
def mission():
    return {
        "name": "O.R.I.O.N.",
        "full_name": "Operational Response and Intelligent Orchestration Network",
        "interface": "Aurora OS",
        "tagline": "Think. Plan. Act. Learn.",
        "release": "v1.7 Mission Control",
        "capabilities": [
            "AI chat console",
            "Project memory",
            "Safe developer tools",
            "Voice mode",
            "Wake phrase mode",
            "Live activity timeline",
            "Tool-level instrumentation",
            "Project launcher",
            "Mission Planner System",
            "Command Approval System",
            "Controlled Autonomous Mission Execution Loop",
            "Mission Run History",
            "Mission Execution Reports",
        ],
        "safety_model": [
            "No uncontrolled destructive commands",
            "Safe project directory access",
            "Approved developer command execution only",
            "Activity and tool execution logging",
            "Mission run history records every controlled execution cycle",
        ],
    }


@app.get("/api/activity", response_model=ActivityResponse)
def activity():
    return ActivityResponse(events=get_recent_activity())


@app.post("/api/activity/clear")
def clear_activity_route():
    clear_activity()
    log_activity("SYSTEM", "Activity timeline cleared.", "Aurora OS")

    return {
        "status": "cleared",
    }


@app.get("/api/projects", response_model=ProjectsResponse)
def projects():
    log_activity(
        "PROJECTS_VIEW",
        "Aurora OS requested the project launcher list.",
        "Aurora OS",
    )

    return ProjectsResponse(projects=load_project_items())


@app.get("/api/projects/{project_key}", response_model=ProjectItem)
def project_detail(project_key: str):
    items = load_project_items()

    for item in items:
        if item.key == project_key:
            log_activity(
                "PROJECT_OPEN",
                f"Project opened in launcher: {item.name}",
                "Aurora OS",
            )

            return item

    return ProjectItem(
        key=project_key,
        name="Project not found",
        type="Unknown",
        status="missing",
        description="No project found with that key.",
        updated_at=None,
    )


@app.get("/api/memory", response_model=MemoryResponse)
def memory_items():
    log_activity(
        "MEMORY_VIEW",
        "Aurora OS requested persistent memory items.",
        "Aurora OS",
    )

    return MemoryResponse(items=list_recent_memory(limit=20))


@app.get("/api/memory/search", response_model=MemoryResponse)
def memory_search(q: str):
    log_activity(
        "MEMORY_SEARCH",
        f"Aurora OS searched memory for: {q}",
        "Aurora OS",
    )

    return MemoryResponse(items=search_memory_items(query=q, limit=20))


@app.get("/api/missions", response_model=MissionsResponse)
def missions():
    log_activity(
        "MISSIONS_VIEW",
        "Aurora OS requested mission planner records.",
        "Aurora OS",
    )

    return MissionsResponse(missions=list_mission_records(limit=20))


@app.get("/api/missions/{mission_id}", response_model=MissionDetailItem)
def mission_detail(mission_id: int):
    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_OPEN_FAILED",
            f"Mission not found: {mission_id}",
            "Aurora OS",
        )

        return MissionDetailItem(
            id=mission_id,
            title="Mission not found",
            goal="No mission found with that ID.",
            status="missing",
            priority=0,
            created_at="",
            updated_at="",
            steps=[],
        )

    log_activity(
        "MISSION_OPEN",
        f"Mission opened: {mission_record['title']}",
        "Aurora OS",
    )

    return MissionDetailItem(**mission_record)


@app.get("/api/mission-runs", response_model=MissionRunsResponse)
def mission_runs():
    log_activity(
        "MISSION_RUNS_VIEW",
        "Aurora OS requested mission run history.",
        "Aurora OS",
    )

    return MissionRunsResponse(runs=list_mission_runs(limit=30))


@app.get("/api/missions/{mission_id}/runs", response_model=MissionRunsResponse)
def mission_runs_for_mission(mission_id: int):
    log_activity(
        "MISSION_RUNS_VIEW",
        f"Aurora OS requested run history for mission {mission_id}.",
        "Aurora OS",
    )

    return MissionRunsResponse(
        runs=list_runs_for_mission(
            mission_id=mission_id,
            limit=50,
        )
    )


@app.post("/api/missions/{mission_id}/report", response_model=MissionReportResponse)
def mission_report(mission_id: int):
    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_REPORT_FAILED",
            f"Mission not found for report: {mission_id}",
            "O.R.I.O.N.",
        )

        return MissionReportResponse(
            mission_id=mission_id,
            report_path="",
            status="mission_not_found",
        )

    report_path = generate_mission_report(mission_record)

    log_activity(
        "MISSION_REPORT_CREATED",
        f"Mission execution report generated: {report_path}",
        "O.R.I.O.N.",
    )

    return MissionReportResponse(
        mission_id=mission_id,
        report_path=report_path,
        status="created",
    )


@app.get("/api/approvals", response_model=ApprovalsResponse)
def approvals():
    log_activity(
        "APPROVALS_VIEW",
        "Aurora OS requested command approval queue.",
        "Aurora OS",
    )

    return ApprovalsResponse(approvals=list_approval_requests(limit=30))


@app.post("/api/approvals/{approval_id}/approve")
def approve_request(approval_id: int):
    log_activity(
        "APPROVAL_APPROVE",
        f"Approval request approved: {approval_id}",
        "Aurora OS",
    )

    try:
        result = execute_approved_dev_action(approval_id)
        update_approval_status(approval_id, "approved", result)

        log_activity(
            "APPROVAL_EXECUTED",
            f"Approval {approval_id} executed: {result}",
            "O.R.I.O.N.",
        )

        return {
            "status": "approved",
            "approval_id": approval_id,
            "result": result,
        }

    except Exception as error:
        update_approval_status(approval_id, "failed", str(error))

        log_activity(
            "APPROVAL_FAILED",
            f"Approval {approval_id} failed: {error}",
            "O.R.I.O.N.",
        )

        return {
            "status": "failed",
            "approval_id": approval_id,
            "result": str(error),
        }


@app.post("/api/approvals/{approval_id}/reject")
def reject_request(approval_id: int):
    update_approval_status(
        approval_id,
        "rejected",
        "Rejected by user.",
    )

    log_activity(
        "APPROVAL_REJECTED",
        f"Approval request rejected: {approval_id}",
        "Aurora OS",
    )

    return {
        "status": "rejected",
        "approval_id": approval_id,
        "result": "Rejected by user.",
    }


@app.post("/api/missions/{mission_id}/run-next", response_model=MissionRunResponse)
async def run_next_mission_step(mission_id: int):
    if not os.getenv("OPENAI_API_KEY"):
        log_activity(
            "MISSION_RUN_FAILED",
            "Missing OPENAI_API_KEY in backend/.env",
            "API",
        )

        output = "Missing OPENAI_API_KEY in backend/.env"

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="missing_api_key",
            output=output,
            result=output,
        )

    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_RUN_FAILED",
            f"Mission not found: {mission_id}",
            "O.R.I.O.N.",
        )

        output = "Mission not found."

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="missing",
            output=output,
            result=output,
        )

    next_step = get_next_actionable_step(mission_record)

    if not next_step:
        log_activity(
            "MISSION_RUN_COMPLETE",
            f"No pending steps for mission: {mission_record['title']}",
            "O.R.I.O.N.",
        )

        output = "No pending mission steps found. Mission appears complete."

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="complete",
            output=output,
            result=output,
        )

    step_id = int(next_step["id"])

    run_id = start_mission_run(
        mission_id=mission_id,
        mission_title=mission_record["title"],
        step_id=step_id,
        step_title=next_step["title"],
    )

    log_activity(
        "MISSION_STEP_START",
        f"Running mission {mission_id}, step {step_id}: {next_step['title']}",
        "O.R.I.O.N.",
    )

    internal_prompt = f"""
You are O.R.I.O.N. running a controlled mission execution cycle.

Mission:
ID: {mission_record['id']}
Title: {mission_record['title']}
Goal: {mission_record['goal']}
Status: {mission_record['status']}
Priority: {mission_record['priority']}

Current step:
Step ID: {next_step['id']}
Step title: {next_step['title']}
Step details: {next_step.get('details', '')}
Current step status: {next_step['status']}

Rules:
1. Execute only this one step.
2. Use available safe tools if needed.
3. If file writing or terminal command execution is needed, create an approval request through the existing tools.
4. Do not bypass the Command Approval System.
5. If you completed the step, update mission step {step_id} status to completed.
6. If approval is required, update mission step {step_id} status to waiting_approval.
7. If more user input is needed, update mission step {step_id} status to blocked.
8. Return a clear execution summary.
"""

    try:
        result = await Runner.run(
            orion,
            internal_prompt,
            session=session,
        )

        final_output = result.final_output or "Mission cycle completed."

        complete_mission_run(
            run_id=run_id,
            status="cycle_complete",
            output=final_output,
        )

        log_activity(
            "MISSION_STEP_COMPLETE",
            f"Mission {mission_id}, step {step_id} cycle completed.",
            "O.R.I.O.N.",
        )

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=step_id,
            status="cycle_complete",
            output=final_output,
            result=final_output,
        )

    except Exception as error:
        error_message = str(error)

        fail_mission_run(
            run_id=run_id,
            error=error_message,
        )

        log_activity(
            "MISSION_STEP_ERROR",
            f"Mission {mission_id}, step {step_id} failed: {error_message}",
            "O.R.I.O.N.",
        )

        output = f"Mission execution failed: {error_message}"

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=step_id,
            status="error",
            output=output,
            result=output,
        )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        log_activity(
            "ERROR",
            "Missing OPENAI_API_KEY in backend/.env",
            "API",
        )

        return ChatResponse(
            response="Missing OPENAI_API_KEY in backend/.env"
        )

    clean_message = request.message.strip()

    if not clean_message:
        log_activity(
            "WARNING",
            "Empty message received.",
            "API",
        )

        return ChatResponse(
            response="No message received."
        )

    log_activity(
        "USER_REQUEST",
        clean_message,
        "Aurora OS Chat",
    )

    log_activity(
        "AGENT_START",
        "O.R.I.O.N. started processing the request.",
        "O.R.I.O.N.",
    )

    try:
        result = await Runner.run(
            orion,
            clean_message,
            session=session,
        )

        final_output = result.final_output or "No response generated."

        log_activity(
            "AGENT_COMPLETE",
            "O.R.I.O.N. generated a final response.",
            "O.R.I.O.N.",
        )

        return ChatResponse(response=final_output)

    except Exception as error:
        log_activity(
            "ERROR",
            f"Agent execution failed: {error}",
            "O.R.I.O.N.",
        )

        return ChatResponse(
            response=f"O.R.I.O.N. encountered an error: {error}"
        )
