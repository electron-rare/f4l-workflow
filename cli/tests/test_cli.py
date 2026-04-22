"""Smoke tests for the f4l CLI."""

from __future__ import annotations

import os

import httpx
import respx
from typer.testing import CliRunner

from f4l_cli.main import app

runner = CliRunner()


def test_help_lists_commands():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "intake" in result.stdout
    assert "gate" in result.stdout
    assert "status" in result.stdout


def test_intake_create_calls_engine(monkeypatch):
    monkeypatch.setenv("F4L_ENGINE_URL", "https://engine.test")
    monkeypatch.setenv("F4L_WEBHOOK_SECRET", "testsecret")
    with respx.mock(base_url="https://engine.test") as mock:
        mock.post("/webhooks/grist").mock(
            return_value=httpx.Response(200, json={"ok": True, "intake_id": "ix-1"})
        )
        r = runner.invoke(app, ["intake", "create", "--title", "kxkm v1", "--type", "A"])
        assert r.exit_code == 0, r.stdout
        assert "ix-1" in r.stdout


def test_gate_advance_calls_engine(monkeypatch):
    monkeypatch.setenv("F4L_ENGINE_URL", "https://engine.test")
    monkeypatch.setenv("F4L_BEARER_TOKEN", "tok")
    with respx.mock(base_url="https://engine.test") as mock:
        mock.post("/gate/advance").mock(
            return_value=httpx.Response(
                200,
                json={"ok": True, "input": {"gate": "G-spec", "verdict": "pass"}},
            )
        )
        r = runner.invoke(
            app, ["gate", "advance", "kxkm-v1", "G-spec", "--verdict", "pass"]
        )
        assert r.exit_code == 0, r.stdout
        assert "G-spec" in r.stdout
        assert "pass" in r.stdout


def test_gate_advance_rejects_unknown_gate():
    r = runner.invoke(app, ["gate", "advance", "x", "G-nope"])
    assert r.exit_code != 0
    combined = (r.stdout or "") + (r.stderr or "") + (r.output or "")
    assert "gate must be one of" in combined or r.exit_code == 2
