"""`f4l gate advance <slug> <gate> --verdict pass|fail|skipped`."""

from __future__ import annotations

import typer

from f4l_cli.client import post_gate_advance

app = typer.Typer(help="Advance a gate on a deliverable.")

GATES = {"G-spec", "G-impl", "G-ship", "G-ready", "G-release"}
VERDICTS = {"pass", "fail", "skipped"}


@app.command()
def advance(
    slug: str = typer.Argument(..., help="Deliverable slug"),
    gate_name: str = typer.Argument(..., help="Gate name"),
    verdict: str = typer.Option("pass", "--verdict", help="pass|fail|skipped"),
    reasons: str = typer.Option("", "--reasons", help="Free-form reasons"),
) -> None:
    if gate_name not in GATES:
        raise typer.BadParameter(f"gate must be one of {sorted(GATES)}")
    if verdict not in VERDICTS:
        raise typer.BadParameter(f"verdict must be one of {sorted(VERDICTS)}")
    resp = post_gate_advance(slug, gate_name, verdict, reasons)
    if resp.get("ok"):
        typer.echo(f"{gate_name} → {verdict}")
    else:
        typer.echo(f"engine error: {resp}", err=True)
        raise typer.Exit(1)
