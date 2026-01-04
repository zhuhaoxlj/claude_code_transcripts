"""
Claude Code Session Browser - Interactive Web UI

This module provides the `browse` command for launching an interactive
web browser to view Claude Code sessions.
"""

import subprocess
import webbrowser
from pathlib import Path

import click
import uvicorn

from .api import create_app


def check_and_build_frontend():
    """
    Check if frontend is built, and build if necessary.

    Returns True if frontend is ready, False otherwise.
    """
    frontend_dist = Path(__file__).parent / "frontend" / "dist"
    frontend_src = Path(__file__).parent / "frontend" / "src"

    # Check if already built
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return True

    # Check if source exists
    if not frontend_src.exists():
        click.echo("Warning: Frontend source not found.")
        click.echo("The browse command requires the frontend to be built.")
        return False

    click.echo("Building frontend...")

    # Check if bun is available
    pm = None
    try:
        subprocess.run(
            ["bun", "--version"],
            capture_output=True,
            check=True,
        )
        pm = "bun"
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    # Fallback to npm if bun not found
    if pm is None:
        try:
            subprocess.run(
                ["npm", "--version"],
                capture_output=True,
                check=True,
            )
            pm = "npm"
        except (FileNotFoundError, subprocess.CalledProcessError):
            click.echo("Error: bun (or npm) is not installed.")
            click.echo("Please install bun to build the frontend.")
            return False

    frontend_dir = Path(__file__).parent / "frontend"

    # Install dependencies
    try:
        result = subprocess.run(
            [pm, "install"],
            cwd=frontend_dir,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        click.echo(f"Error running {pm} install: {e}")
        if result.stderr:
            click.echo(f"stderr: {result.stderr.decode()}")
        return False

    # Build
    try:
        result = subprocess.run(
            [pm, "run", "build"],
            cwd=frontend_dir,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        click.echo(f"Error running {pm} run build: {e}")
        if result.stderr:
            click.echo(f"stderr: {result.stderr.decode()}")
        return False

    click.echo("Frontend built successfully.")
    return True


def run_browser(port: int, open_browser: bool = True):
    """
    Run the browser server.

    Args:
        port: Port to run on
        open_browser: Whether to open browser automatically
    """
    # Check and build frontend
    if not check_and_build_frontend():
        click.echo("Failed to build frontend. Exiting.")
        return

    app = create_app()

    url = f"http://127.0.0.1:{port}"

    if open_browser:
        # Open browser in a separate thread
        import threading

        def open_browser_delayed():
            import time

            time.sleep(1)  # Give server time to start
            webbrowser.open(url)

        thread = threading.Thread(target=open_browser_delayed, daemon=True)
        thread.start()

    click.echo(f"Starting Claude Session Browser at {url}")
    click.echo("Press Ctrl+C to stop.")

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
