import { describe, it, expect } from "vitest";
import { transition } from "../src/state-machine.js";

describe("state machine type A", () => {
  it("moves from intake to spec on SpecDraftCompleted", () => {
    expect(transition("intake", { kind: "SpecDraftCompleted" })).toBe("spec");
  });

  it("moves from spec to impl on GateSpecPass", () => {
    expect(transition("spec", { kind: "GateSpecPass" })).toBe("impl");
  });

  it("stays in spec on GateSpecFail", () => {
    expect(transition("spec", { kind: "GateSpecFail" })).toBe("spec");
  });

  it("moves from impl to ship on GateImplPass", () => {
    expect(transition("impl", { kind: "GateImplPass" })).toBe("ship");
  });

  it("moves to blocked-by-fix on compliance fork", () => {
    expect(
      transition("impl", { kind: "GateImplFail", category: "compliance" })
    ).toBe("blocked-by-fix");
  });

  it("stays in impl on non-compliance impl fail", () => {
    expect(
      transition("impl", { kind: "GateImplFail", category: "test" })
    ).toBe("impl");
  });

  it("moves from ship to done on GateShipPass", () => {
    expect(transition("ship", { kind: "GateShipPass" })).toBe("done");
  });

  it("aborts on GateShipFail", () => {
    expect(transition("ship", { kind: "GateShipFail" })).toBe("aborted");
  });

  it("returns from blocked-by-fix to impl on FixResolved", () => {
    expect(transition("blocked-by-fix", { kind: "FixResolved" })).toBe("impl");
  });

  it("ignores unknown events for terminal states", () => {
    expect(transition("done", { kind: "GateImplPass" })).toBe("done");
    expect(transition("aborted", { kind: "FixResolved" })).toBe("aborted");
  });
});
