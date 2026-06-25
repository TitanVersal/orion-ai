from functools import wraps
from typing import Any, Callable

from backend.core.activity import log_activity


def _shorten(value: Any, limit: int = 220) -> str:
    """
    Convert tool input/output into a short readable preview for Aurora OS logs.
    """
    text = str(value)

    if len(text) > limit:
        return text[:limit] + "..."

    return text


def instrument_tool(tool_name: str) -> Callable:
    """
    Decorator for logging tool execution lifecycle events.
    Use this under @function_tool.

    Correct order:
    @function_tool
    @instrument_tool("tool_name")
    def tool_name(...):
        ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            input_preview = {
                "args": [_shorten(arg) for arg in args],
                "kwargs": {key: _shorten(value) for key, value in kwargs.items()},
            }

            log_activity(
                "TOOL_START",
                f"{tool_name} started with input: {input_preview}",
                tool_name,
            )

            try:
                result = func(*args, **kwargs)

                log_activity(
                    "TOOL_COMPLETE",
                    f"{tool_name} completed with result: {_shorten(result)}",
                    tool_name,
                )

                return result

            except Exception as error:
                log_activity(
                    "TOOL_ERROR",
                    f"{tool_name} failed: {error}",
                    tool_name,
                )
                raise

        return wrapper

    return decorator
