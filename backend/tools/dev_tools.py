import shlex
import subprocess
from pathlib import Path

from agents import function_tool

from core.tool_logger import instrument_tool
from core.approvals import create_approval_request, get_approval_request


PROJECT_ROOT = Path.cwd()
SAFE_BASE = PROJECT_ROOT


DANGEROUS_KEYWORDS = [
    "rm",
    "sudo",
    "mkfs",
    "shutdown",
    "reboot",
    "passwd",
    "chown",
    "chmod",
    "dd",
    "curl",
    "wget",
    "scp",
    "ssh",
    ">",
    ">>",
    "|",
    "&&",
    ";",
]


ALLOWED_COMMANDS = [
    ["pwd"],
    ["ls"],
    ["git", "status"],
    ["git", "branch"],
    ["python", "--version"],
    ["python3", "--version"],
    ["node", "--version"],
    ["npm", "--version"],
    ["pip", "--version"],
    ["pip", "list"],
    ["npm", "run", "build"],
]


def _resolve_safe_path(path: str) -> Path:
    target = (SAFE_BASE / path).resolve()

    if not str(target).startswith(str(SAFE_BASE.resolve())):
        raise ValueError("Blocked unsafe path access.")

    return target


def _is_safe_command(command: str) -> bool:
    lowered = command.lower()

    for keyword in DANGEROUS_KEYWORDS:
        if keyword in lowered.split() or keyword in lowered:
            return False

    try:
        parts = shlex.split(command)
    except ValueError:
        return False

    for allowed in ALLOWED_COMMANDS:
        if parts[: len(allowed)] == allowed:
            return True

    return False


def _write_project_file_now(path: str, content: str) -> str:
    safe_output_dir = SAFE_BASE / "backend" / "data" / "generated_files"
    safe_output_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(path).name
    target = safe_output_dir / filename

    target.write_text(content, encoding="utf-8")

    return f"File written safely: {target}"


def _run_safe_command_now(command: str) -> str:
    if not _is_safe_command(command):
        return f"Blocked unsafe or unapproved command: {command}"

    parts = shlex.split(command)

    result = subprocess.run(
        parts,
        cwd=SAFE_BASE,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    output = result.stdout.strip()
    error = result.stderr.strip()

    if error:
        return f"Command completed with messages:\n{error}\n\nOutput:\n{output}"

    return output or "Command completed with no output."


def execute_approved_dev_action(approval_id: int) -> str:
    """
    Execute a previously approved developer action.
    This is called by the approval API only after user approval.
    """
    approval = get_approval_request(approval_id)

    if not approval:
        return "Approval request not found."

    if approval["status"] != "pending":
        return f"Approval request is already {approval['status']}."

    action_type = approval["action_type"]
    payload = approval.get("payload", {})

    if action_type == "WRITE_PROJECT_FILE":
        return _write_project_file_now(
            path=payload.get("path", "generated.txt"),
            content=payload.get("content", ""),
        )

    if action_type == "RUN_SAFE_COMMAND":
        return _run_safe_command_now(
            command=payload.get("command", ""),
        )

    return f"No executor available for action type: {action_type}"


@function_tool
@instrument_tool("get_system_status")
def get_system_status() -> str:
    """
    Get basic local development system status.
    """
    return f"""
Current working directory: {Path.cwd()}
Python executable available: yes
O.R.I.O.N. safe developer tools: online
Command Approval System: online
Safe base path: {SAFE_BASE}
""".strip()


@function_tool
@instrument_tool("list_directory")
def list_directory(path: str = ".") -> str:
    """
    Safely list files and folders inside the O.R.I.O.N. project directory.
    """
    try:
        target = _resolve_safe_path(path)

        if not target.exists():
            return "Path does not exist."

        if not target.is_dir():
            return "Path is not a directory."

        items = sorted(target.iterdir())

        if not items:
            return "Directory is empty."

        lines = []
        for item in items:
            item_type = "DIR " if item.is_dir() else "FILE"
            lines.append(f"{item_type} - {item.relative_to(SAFE_BASE)}")

        return "\n".join(lines)

    except Exception as error:
        return f"Directory listing failed: {error}"


@function_tool
@instrument_tool("read_project_file")
def read_project_file(path: str) -> str:
    """
    Safely read a text file inside the O.R.I.O.N. project directory.
    """
    try:
        target = _resolve_safe_path(path)

        if not target.exists():
            return "File does not exist."

        if not target.is_file():
            return "Path is not a file."

        if target.stat().st_size > 100_000:
            return "File is too large to read safely."

        return target.read_text(encoding="utf-8")

    except UnicodeDecodeError:
        return "File is not a readable UTF-8 text file."
    except Exception as error:
        return f"File read failed: {error}"


@function_tool
@instrument_tool("write_project_file")
def write_project_file(path: str, content: str) -> str:
    """
    Request approval before creating or updating a generated text file.
    """
    approval_id = create_approval_request(
        action_type="WRITE_PROJECT_FILE",
        title=f"Write file: {Path(path).name}",
        description="O.R.I.O.N. requests permission to write a generated project file.",
        payload={
            "path": path,
            "content": content,
        },
        risk_level="medium",
        source="write_project_file",
    )

    return (
        f"Approval required before writing file. "
        f"Approval Request ID: {approval_id}. "
        f"Approve it in Aurora OS Command Approval panel."
    )


@function_tool
@instrument_tool("run_safe_command")
def run_safe_command(command: str) -> str:
    """
    Request approval before running an approved non-destructive developer command.
    """
    if not _is_safe_command(command):
        return f"Blocked unsafe or unapproved command: {command}"

    approval_id = create_approval_request(
        action_type="RUN_SAFE_COMMAND",
        title=f"Run command: {command}",
        description="O.R.I.O.N. requests permission to run an approved developer command.",
        payload={
            "command": command,
        },
        risk_level="medium",
        source="run_safe_command",
    )

    return (
        f"Approval required before running command. "
        f"Approval Request ID: {approval_id}. "
        f"Approve it in Aurora OS Command Approval panel."
    )
