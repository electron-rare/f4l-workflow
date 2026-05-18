import type { LifeCoreClient } from "../life-core-client.js";
import type { DeliverableState } from "../state-machine.js";

export interface DeliverableContext {
  slug: string;
  type: string;
  compliance_profile: string;
  upstream_artifacts?: Array<{
    deliverable_slug: string;
    artifact_ref: string;
    storage_path: string;
  }>;
  context?: Record<string, unknown>;
}

export type ImplVerdict = "GateImplPass" | "GateImplFail";

export async function onTransitionToImpl(
  lc: LifeCoreClient,
  deliverable: DeliverableContext
): Promise<ImplVerdict> {
  const payload = {
    deliverable_slug: deliverable.slug,
    deliverable_type: deliverable.type,
    outer_state: "impl" as const,
    compliance_profile: deliverable.compliance_profile,
    upstream_artifacts: deliverable.upstream_artifacts ?? [],
    context: deliverable.context ?? {},
    hitl_mode: "sync" as const,
  };
  const result = (await lc.runAgent("impl", payload)) as unknown as {
    ok: boolean;
    output: string;
    reasons: string[];
  };
  return result.ok ? "GateImplPass" : "GateImplFail";
}

/**
 * Fires the impl agent only on entry to the `impl` outer state, i.e. when the
 * previous state was not `impl` and the next state is `impl`. Returns the
 * verdict if dispatched, otherwise null. Safe to call on every transition.
 */
export async function maybeDispatchOnEnterImpl(
  prev: DeliverableState,
  next: DeliverableState,
  lc: LifeCoreClient,
  deliverable: DeliverableContext
): Promise<ImplVerdict | null> {
  if (next !== "impl") return null;
  if (prev === "impl") return null;
  return onTransitionToImpl(lc, deliverable);
}
