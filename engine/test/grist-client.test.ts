import { describe, it, expect, vi, beforeEach } from "vitest";
import { GristClient } from "../src/grist-client.js";

describe("GristClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a deliverable row", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ records: [{ id: 42 }] }),
    }) as any;
    const g = new GristClient({
      baseUrl: "https://grist.test",
      apiKey: "k",
      docId: "d",
    });
    const res = await g.createDeliverable({
      deliverable_id: "x",
      slug: "x",
      type: "A",
      title: "t",
      current_state: "intake",
      owner: "auto",
      compliance_profile: "prototype",
    });
    expect(res.id).toBe(42);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://grist.test/api/docs/d/tables/Deliverables/records",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as any;
    const g = new GristClient({
      baseUrl: "https://grist.test",
      apiKey: "k",
      docId: "d",
    });
    await expect(
      g.createDeliverable({ deliverable_id: "x" })
    ).rejects.toThrow(/HTTP 500/);
  });

  it("inserts a gate row", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ records: [{ id: 7 }] }),
    }) as any;
    const g = new GristClient({
      baseUrl: "https://grist.test",
      apiKey: "k",
      docId: "d",
    });
    const r = await g.insertGate({ gate_id: "g-1", verdict: "pass" });
    expect(r.id).toBe(7);
  });
});
