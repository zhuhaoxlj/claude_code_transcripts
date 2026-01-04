"""
Starlette API server for Claude Session Browser.

Provides REST API endpoints for browsing local Claude Code sessions.
"""

from pathlib import Path

from starlette.applications import Starlette
from starlette.responses import JSONResponse, HTMLResponse, FileResponse
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

# Import functions from parent module
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from claude_code_transcripts import (
    find_local_sessions,
    parse_session_file,
    get_session_summary,
    get_project_display_name,
)


def _find_session_file(session_id: str) -> Path | None:
    """
    Find a session file by its ID.

    Args:
        session_id: The session ID (filename without extension)

    Returns:
        Path to the session file, or None if not found
    """
    projects_folder = Path.home() / ".claude" / "projects"

    if not projects_folder.exists():
        return None

    for filepath in projects_folder.glob("**/*.jsonl"):
        if filepath.stem == session_id:
            return filepath

    return None


def get_session_id(filepath: Path) -> str:
    """Generate a session ID from file path."""
    return filepath.stem


def format_session_info(filepath: Path, summary: str) -> dict:
    """Format session info for API response."""
    stat = filepath.stat()
    project_name = get_project_display_name(filepath.parent.parent.name)

    return {
        "id": get_session_id(filepath),
        "summary": summary,
        "mtime": int(stat.st_mtime),
        "size": stat.st_size,
        "project": project_name,
        "filePath": str(filepath),
    }


async def get_sessions(request):
    """
    GET /api/sessions

    Returns list of sessions.
    Query params:
        limit: maximum number of sessions to return (default: 50)
    """
    limit = int(request.query_params.get("limit", 50))
    projects_folder = Path.home() / ".claude" / "projects"

    if not projects_folder.exists():
        return JSONResponse({"sessions": []}, status_code=200)

    results = find_local_sessions(projects_folder, limit=limit)
    sessions = [format_session_info(fp, summary) for fp, summary in results]

    return JSONResponse({"sessions": sessions})


async def get_session_detail(request):
    """
    GET /api/sessions/{session_id}

    Returns full session data including loglines.
    """
    session_id = request.path_params["session_id"]
    session_file = _find_session_file(session_id)

    if session_file is None:
        return JSONResponse({"error": "Session not found"}, status_code=404)

    try:
        data = parse_session_file(session_file)
        summary = get_session_summary(session_file)

        return JSONResponse(
            {
                "loglines": data.get("loglines", []),
                "summary": summary,
            }
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def get_session_html(request):
    """
    GET /api/sessions/{session_id}/html

    Returns rendered HTML for the session (reusing existing templates).
    """
    session_id = request.path_params["session_id"]
    session_file = _find_session_file(session_id)

    if session_file is None:
        return HTMLResponse(
            "<html><body>Session not found</body></html>", status_code=404
        )

    # For now, return a simple HTML response
    # TODO: Could reuse generate_html() logic for full rendering
    try:
        data = parse_session_file(session_file)
        loglines = data.get("loglines", [])

        html_parts = ["<html><head><title>Session</title></head><body>"]
        for entry in loglines:
            entry_type = entry.get("type", "unknown")
            message = entry.get("message", {})
            content = message.get("content", "")

            if isinstance(content, list):
                text = " ".join(
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                )
            else:
                text = content

            html_parts.append(
                f"<div class='entry {entry_type}'><pre>{text}</pre></div>"
            )

        html_parts.append("</body></html>")
        return HTMLResponse("".join(html_parts))
    except Exception as e:
        return HTMLResponse(f"<html><body>Error: {e}</body></html>", status_code=500)


def create_app(*, dev_mode: bool = False) -> Starlette:
    """
    Create and configure the Starlette application.

    Args:
        dev_mode: If True, serve frontend from Vite dev server proxy.
                  If False, serve static files from dist folder.
    """
    # Determine frontend static files path
    frontend_dist = Path(__file__).parent / "frontend" / "dist"
    frontend_assets = frontend_dist / "assets"

    routes = [
        # API routes (must be first)
        Route("/api/sessions", get_sessions),
        Route("/api/sessions/{session_id}", get_session_detail),
        Route("/api/sessions/{session_id}/html", get_session_html),
    ]

    # Add frontend static files
    if frontend_dist.exists():
        # Static assets (JS, CSS, etc.)
        if frontend_assets.exists():
            routes.append(
                Mount(
                    "/assets",
                    app=StaticFiles(directory=str(frontend_assets)),
                    name="assets",
                )
            )

        # Catch-all route for SPA (must be last)
        async def serve_index(request):
            return FileResponse(frontend_dist / "index.html")

        routes.append(Route("/{path:path}", serve_index))
        routes.append(Route("/", serve_index))

    app = Starlette(
        routes=routes,
        debug=dev_mode,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
