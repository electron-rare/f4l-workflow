import { describe, it, expect, beforeEach, afterEach } from "vitest";
import app from "../src/server.js";

describe("POST /gate/advance", () => {
  const originalToken = process.env.F4L_BEARER_TOKEN;

  beforeEach(() => {
    process.env.F4L_BEARER_TOKEN = "testtoken"; // pragma: allowlist secret
  });

  afterEach(() => {
    process.env.F4L_BEARER_TOKEN = originalToken;
  });

  it("rejects without auth", async () => {
    const r = await app.request("/gate/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliverable_id: "x",
        gate: "G-spec",
        verdict: "pass",
      }),
    });
    expect(r.status).toBe(401);
  });

  it("rejects invalid gate name", async () => {
    const r = await app.request("/gate/advance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer testtoken", // pragma: allowlist secret
      },
      body: JSON.stringify({
        deliverable_id: "x",
        gate: "G-nope",
        verdict: "pass",
      }),
    });
    expect(r.status).toBe(400);
  });

  it("accepts a valid G-spec pass advance", async () => {
    const r = await app.request("/gate/advance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer testtoken", // pragma: allowlist secret
      },
      body: JSON.stringify({
        deliverable_id: "kxkm-v1",
        gate: "G-spec",
        verdict: "pass",
      }),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.input.gate).toBe("G-spec");
  });
});

describe("GET /health and /metrics", () => {
  it("/health returns ok", async () => {
    const r = await app.request("/health");
    expect(r.status).toBe(200);
    const body = (await r.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.service).toBe("f4l-engine");
  });

  it("/metrics returns prometheus text", async () => {
    const r = await app.request("/metrics");
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toMatch(/f4l_deliverables_total|process_cpu/);
  });
});
