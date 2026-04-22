import { describe, it, expect, beforeEach, afterEach } from "vitest";
import app from "../src/server.js";

describe("POST /webhooks/grist", () => {
  const originalSecret = process.env.F4L_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.F4L_WEBHOOK_SECRET = "fixture-secret"; // pragma: allowlist secret
  });

  afterEach(() => {
    process.env.F4L_WEBHOOK_SECRET = originalSecret;
  });

  it("rejects without secret header", async () => {
    const res = await app.request("/webhooks/grist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("rejects with wrong secret", async () => {
    const res = await app.request("/webhooks/grist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Grist-Secret": "nope",
      },
      body: JSON.stringify({
        records: [{ fields: { title: "x", deliverable_type: "A" } }],
      }),
    });
    expect(res.status).toBe(401);
  });

  it("accepts with valid secret + returns intake_id", async () => {
    const res = await app.request("/webhooks/grist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Grist-Secret": "fixture-secret", // pragma: allowlist secret
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              title: "test",
              deliverable_type: "A",
              details: "for testing",
            },
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.intake_id).toMatch(/^ix-/);
  });
});
