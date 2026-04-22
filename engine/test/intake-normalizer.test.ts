import { describe, it, expect } from "vitest";
import { normalizeIntake } from "../src/intake-normalizer.js";

describe("normalizeIntake", () => {
  it("normalizes a grist payload", () => {
    const r = normalizeIntake({
      source: "grist",
      payload: { title: "new thing", deliverable_type: "A", details: "..." },
    });
    expect(r.source).toBe("grist");
    expect(r.deliverable_type).toBe("A");
    expect(r.title).toBe("new thing");
    expect(r.normalized_payload.goal).toBe("...");
  });

  it("normalizes a forgejo issue payload with label", () => {
    const r = normalizeIntake({
      source: "forgejo",
      payload: {
        issue: {
          title: "[A] kxkm-v1 parallelator",
          body: "battery manager",
          labels: [{ name: "type:A" }],
        },
      },
    });
    expect(r.source).toBe("forgejo");
    expect(r.deliverable_type).toBe("A");
    expect(r.title).toBe("[A] kxkm-v1 parallelator");
  });

  it("normalizes a mascarade chat payload", () => {
    const r = normalizeIntake({
      source: "mascarade",
      payload: { topic: "idea", message: "lets prototype X" },
    });
    expect(r.source).toBe("mascarade");
    expect(r.deliverable_type).toBe(null);
    expect(r.title).toBe("idea");
  });

  it("rejects unknown source", () => {
    expect(() =>
      normalizeIntake({ source: "twitter" as any, payload: {} })
    ).toThrow(/unknown intake source/);
  });
});
