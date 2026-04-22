"""`f4l intake` — create a new intake record."""

from __future__ import annotations

import typer

from f4l_cli.client import post_intake

app = typer.Typer(help="Create a new F4L workflow intake.")


@app.command("create")
def create(
    title: str = typer.Option(..., "--title", help="Deliverable title"),
    type: str = typer.Option("A", "--type", help="A (hardware) or B (product)"),
    details: str = typer.Option("", "--details", help="Free-form description"),
) -> None:
    """Create a new intake in Grist via f4l-engine."""
    if type not in {"A", "B"}:
        raise typer.BadParameter("type must be A or B")
    resp = post_intake(
        {
            "source": "cli",
            "title": title,
            "deliverable_type": type,
            "details": details,
        }
    )
    intake_id = resp.get("intake_id", "(no id returned)")
    typer.echo(f"intake_id: {intake_id}")
