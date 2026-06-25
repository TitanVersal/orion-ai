import asyncio
import os

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

load_dotenv(dotenv_path="backend/.env")

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
from voice.voice_io import record_voice, transcribe_voice, speak_text


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


session = SQLiteSession("orion_core_v04_voice")


async def run_orion_voice():
    console.print(
        Panel.fit(
            "O.R.I.O.N. Core v0.4 Online\nVoice Mode Activated\nPress Enter to speak\nThink. Plan. Act. Learn.",
            title="Operational Response and Intelligent Orchestration Network",
            border_style="cyan",
        )
    )

    speak_text("O.R.I.O.N. voice mode online.")

    while True:
        console.input("\n[bold cyan]Press Enter to speak...[/bold cyan] ")

        audio_path = record_voice(duration=6)
        user_input = transcribe_voice(audio_path)

        if not user_input:
            console.print("[yellow]No speech detected. Try again.[/yellow]")
            continue

        if user_input.lower() in ["exit", "quit", "stop", "shutdown"]:
            speak_text("O.R.I.O.N. shutting down.")
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

        speak_text(result.final_output)


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        console.print("[bold red]Missing OPENAI_API_KEY in backend/.env[/bold red]")
    else:
        asyncio.run(run_orion_voice())
