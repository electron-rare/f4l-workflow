import { describe, it, expect } from "vitest";
import type { AgentRole } from "./life-core-client.js";

describe("AgentRole type", () => {
  it("accepts spec, impl, qa", () => {
    const a: AgentRole = "spec";
    const b: AgentRole = "impl";
    const c: AgentRole = "qa";
    expect([a, b, c]).toEqual(["spec", "impl", "qa"]);
  });
});
