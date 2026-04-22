"""`f4l` root Typer app."""

from __future__ import annotations

import typer

from f4l_cli.commands import gate, intake, status

app = typer.Typer(help="Factory 4 Life workflow CLI.")
app.add_typer(intake.app, name="intake")
app.add_typer(status.app, name="status")
app.add_typer(gate.app, name="gate")


if __name__ == "__main__":
    app()
