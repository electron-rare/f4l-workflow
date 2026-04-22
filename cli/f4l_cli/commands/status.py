"""`f4l status <slug>` — show current state of a deliverable."""

from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

from f4l_cli.client import get_deliverable

app = typer.Typer(help="Show current state of a deliverable.")
console = Console()


@app.command()
def show(slug: str = typer.Argument(..., help="Deliverable slug")) -> None:
    data = get_deliverable(slug)
    table = Table(title=f"Deliverable {slug}")
    table.add_column("field", style="cyan")
    table.add_column("value", style="white")
    for key in (
        "deliverable_id",
        "slug",
        "type",
        "current_state",
        "compliance_profile",
        "owner",
        "last_transition_at",
    ):
        table.add_row(key, str(data.get(key, "—")))
    console.print(table)
