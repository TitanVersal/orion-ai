import asyncio
import os
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from agents import Agent, Runner, SQLiteSession

from core.prompt import ORION_SYSTEM_PROMPT
from tools.safe_tools import create_note, read_note, save_activity_log, list_notes
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


load_dotenv(dotenv_path="backend/.env")

console = Console()


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
    ],
)


session = SQLiteSession("orion_core_v03")


async def run_orion():
    console.print(
        Panel.fit(
            "O.R.I.O.N. Core v0.3 Online\nProject Command Center Activated\nThink. Plan. Act. Learn.",
            title="Operational Response and Intelligent Orchestration Network",
            border_style="cyan",
        )
    )

    while True:
        user_input = console.input("\n[bold cyan]You:[/bold cyan] ")

        if user_input.lower() in ["exit", "quit", "stop"]:
            console.print("[bold magenta]O.R.I.O.N. shutting down.[/bold magenta]")
            break

        result = await Runner.run(
            orion,
            user_input,
            session=session,
        )

        console.print(
            Panel(
                result.final_output,
                title="O.R.I.O.N.",
                border_style="cyan",
            )
        )


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        console.print("[bold red]Missing OPENAI_API_KEY in backend/.env[/bold red]")
    else:
        asyncio.run(run_orion())
