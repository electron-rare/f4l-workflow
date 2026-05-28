import { describe, it, expect } from "vitest";
import { resolveWriteActor } from "../src/middleware/require-write.js";

describe("resolveWriteActor", () => {
  it("trusts X-Forwarded-User (gate-injected) and returns it as actor", () => {
    expect(
      resolveWriteActor({ xForwardedUser: "clement", authorization: "" }, "secret"),
    ).toBe("clement");
  });

  it("falls back to the static bearer for machine callers", () => {
    expect(
      resolveWriteActor({ authorization: "Bearer secret" }, "secret"),
    ).toBe("machine");
  });

  it("rejects when neither header authorizes", () => {
    expect(
      resolveWriteActor({ authorization: "Bearer wrong" }, "secret"),
    ).toBeNull();
  });

  it("rejects bearer when no token is configured", () => {
    expect(resolveWriteActor({ authorization: "Bearer x" }, "")).toBeNull();
  });

  it("ignores an empty X-Forwarded-User", () => {
    expect(resolveWriteActor({ xForwardedUser: "  " }, "secret")).toBeNull();
  });
});
