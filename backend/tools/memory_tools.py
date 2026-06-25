from agents import function_tool
from backend.core.tool_logger import instrument_tool
from backend.core.persistent_memory import (
    save_memory_item,
    list_recent_memory,
    search_memory_items,
)


def _format_memory_items(items):
    if not items:
        return "No memory items found."

    lines = []

    for item in items:
        lines.append(
            f"[{item['id']}] {item['title']} | "
            f"Category: {item['category']} | "
            f"Importance: {item['importance']}\n"
            f"{item['content']}"
        )

    return "\n\n".join(lines)


@function_tool
@instrument_tool("remember_information")
def remember_information(
    category: str,
    title: str,
    content: str,
    importance: int = 3,
) -> str:
    """
    Save important long-term information into O.R.I.O.N.'s persistent memory.
    """
    memory_id = save_memory_item(
        category=category,
        title=title,
        content=content,
        source="O.R.I.O.N.",
        importance=importance,
    )

    return f"Memory saved with ID {memory_id}: {title}"


@function_tool
@instrument_tool("search_persistent_memory")
def search_persistent_memory(query: str, limit: int = 10) -> str:
    """
    Search O.R.I.O.N.'s persistent memory database.
    """
    items = search_memory_items(query=query, limit=limit)
    return _format_memory_items(items)


@function_tool
@instrument_tool("list_recent_persistent_memory")
def list_recent_persistent_memory(limit: int = 10) -> str:
    """
    List recent persistent memory items.
    """
    items = list_recent_memory(limit=limit)
    return _format_memory_items(items)
