import { describe, it, expect, vi } from "vitest";
import {
  onTransitionToImpl,
  maybeDispatchOnEnterImpl,
} from "./transition-impl.js";

describe("onTransitionToImpl", () => {
  it("calls lc.runAgent('impl', payload) with deliverable context", async () => {
    const runAgent = vi
      .fn()
      .mockResolvedValue({ ok: true, output: "/artifacts/x/v1", reasons: [] });
    const lc = { runAgent };
    const deliverable = {
      slug: "sensor-node-minimal-hardware",
      type: "hardware",
      compliance_profile: "prototype",
    };
    await onTransitionToImpl(lc as any, deliverable as any);
    expect(runAgent).toHaveBeenCalledWith(
      "impl",
      expect.objectContaining({
        deliverable_slug: "sensor-node-minimal-hardware",
        deliverable_type: "hardware",
        outer_state: "impl",
        compliance_profile: "prototype",
      })
    );
  });

  it("returns GateImplPass when lc.runAgent returns ok", async () => {
    const lc = {
      runAgent: vi
        .fn()
        .mockResolvedValue({ ok: true, output: "/x", reasons: [] }),
    };
    const verdict = await onTransitionToImpl(
      lc as any,
      {
        slug: "s",
        type: "hardware",
        compliance_profile: "prototype",
      } as any
    );
    expect(verdict).toBe("GateImplPass");
  });

  it("returns GateImplFail when lc.runAgent returns not ok", async () => {
    const lc = {
      runAgent: vi
        .fn()
        .mockResolvedValue({ ok: false, output: "", reasons: ["drc 3 errors"] }),
    };
    const verdict = await onTransitionToImpl(
      lc as any,
      {
        slug: "s",
        type: "hardware",
        compliance_profile: "prototype",
      } as any
    );
    expect(verdict).toBe("GateImplFail");
  });
});

describe("maybeDispatchOnEnterImpl", () => {
  const deliverable = {
    slug: "s",
    type: "hardware",
    compliance_profile: "prototype",
  };

  it("dispatches impl agent when transitioning spec -> impl", async () => {
    const runAgent = vi
      .fn()
      .mockResolvedValue({ ok: true, output: "/x", reasons: [] });
    const lc = { runAgent };
    const verdict = await maybeDispatchOnEnterImpl(
      "spec",
      "impl",
      lc as any,
      deliverable as any
    );
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(runAgent).toHaveBeenCalledWith("impl", expect.any(Object));
    expect(verdict).toBe("GateImplPass");
  });

  it("dispatches impl agent when transitioning blocked-by-fix -> impl", async () => {
    const runAgent = vi
      .fn()
      .mockResolvedValue({ ok: true, output: "/x", reasons: [] });
    const lc = { runAgent };
    const verdict = await maybeDispatchOnEnterImpl(
      "blocked-by-fix",
      "impl",
      lc as any,
      deliverable as any
    );
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(verdict).toBe("GateImplPass");
  });

  it("does not dispatch when next is not impl", async () => {
    const runAgent = vi.fn();
    const lc = { runAgent };
    const verdict = await maybeDispatchOnEnterImpl(
      "impl",
      "ship",
      lc as any,
      deliverable as any
    );
    expect(runAgent).not.toHaveBeenCalled();
    expect(verdict).toBeNull();
  });

  it("does not dispatch when already in impl (impl -> impl)", async () => {
    const runAgent = vi.fn();
    const lc = { runAgent };
    const verdict = await maybeDispatchOnEnterImpl(
      "impl",
      "impl",
      lc as any,
      deliverable as any
    );
    expect(runAgent).not.toHaveBeenCalled();
    expect(verdict).toBeNull();
  });
});
