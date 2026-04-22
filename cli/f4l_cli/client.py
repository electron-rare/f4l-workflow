"""Thin HTTP client around the f4l-engine API."""

from __future__ import annotations

import os
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://engine.saillant.cc"


def engine_base_url() -> str:
    return os.environ.get("F4L_ENGINE_URL", DEFAULT_BASE_URL)


def bearer_token() -> str:
    token = os.environ.get("F4L_BEARER_TOKEN", "")
    if not token:
        raise RuntimeError(
            "F4L_BEARER_TOKEN not set. Export it or add it to your shell rc."
        )
    return token


def webhook_secret() -> str:
    return os.environ.get("F4L_WEBHOOK_SECRET", "")


def post_intake(payload: dict[str, Any]) -> dict[str, Any]:
    r = httpx.post(
        f"{engine_base_url()}/webhooks/grist",
        json={"records": [{"fields": payload}]},
        headers={"X-Grist-Secret": webhook_secret()},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def post_gate_advance(
    deliverable_id: str,
    gate: str,
    verdict: str,
    reasons: str = "",
) -> dict[str, Any]:
    r = httpx.post(
        f"{engine_base_url()}/gate/advance",
        json={
            "deliverable_id": deliverable_id,
            "gate": gate,
            "verdict": verdict,
            "reasons": reasons,
        },
        headers={"Authorization": f"Bearer {bearer_token()}"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def get_deliverable(slug: str) -> dict[str, Any]:
    r = httpx.get(
        f"{engine_base_url()}/deliverables/{slug}",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()
