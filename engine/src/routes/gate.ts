import { Hono } from "hono";
import { z } from "zod";
import { transition, type DeliverableState } from "../state-machine.js";
import { GristClient } from "../grist-client.js";
import { counters } from "../metrics.js";

const AdvanceSchema = z.object({
  deliverable_id: z.string(),
  gate: z.enum(["G-spec", "G-impl", "G-ship", "G-ready", "G-release"]),
  verdict: z.enum(["pass", "fail", "skipped"]),
  reasons: z.string().optional().default(""),
  category: z.enum(["compliance", "test", "build"]).optional(),
});

function grist(): GristClient | null {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  if (!apiKey || !docId) return null;
  return new GristClient({ baseUrl, apiKey, docId });
}

async function findDeliverableBySlug(
  slug: string
): Promise<{ id: number; fields: any } | null> {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  const res = await fetch(
    `${baseUrl}/api/docs/${docId}/tables/Deliverables/records`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  return (data.records ?? []).find((r: any) => r.fields?.slug === slug) ?? null;
}

function eventForGate(
  gate: string,
  verdict: "pass" | "fail" | "skipped",
  category?: "compliance" | "test" | "build"
): { kind: any; category?: any } | null {
  if (verdict === "skipped") return null;
  if (gate === "G-spec")
    return { kind: verdict === "pass" ? "GateSpecPass" : "GateSpecFail" };
  if (gate === "G-impl")
    return verdict === "pass"
      ? { kind: "GateImplPass" }
      : { kind: "GateImplFail", category };
  if (gate === "G-ship")
    return { kind: verdict === "pass" ? "GateShipPass" : "GateShipFail" };
  return null;
}

export const gateRoute = new Hono();

gateRoute.post("/gate/advance", async (c) => {
  const auth = c.req.header("authorization");
  const expected = process.env.F4L_BEARER_TOKEN;
  if (!expected || auth !== `Bearer ${expected}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const parsed = AdvanceSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const { deliverable_id, gate, verdict, reasons, category } = parsed.data;

  const g = grist();
  if (!g) return c.json({ ok: true, input: parsed.data, note: "grist not wired" });

  const match = await findDeliverableBySlug(deliverable_id);
  if (!match) return c.json({ error: "deliverable not found" }, 404);

  const state = match.fields.current_state as DeliverableState;
  const evt = eventForGate(gate, verdict, category);
  const next = evt ? transition(state, evt as any) : state;

  // Record gate row
  try {
    await g.insertGate({
      gate_id: `gate-${deliverable_id}-${gate}-${Date.now()}`,
      deliverable_slug: deliverable_id,
      gate_name: gate,
      verdict,
      reasons: reasons ?? "",
      decided_by: "cli",
      decided_at: new Date().toISOString(),
      attempt: 1,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("gate insert failed:", (e as Error).message);
  }

  // Update state if it changed
  if (next !== state) {
    try {
      await g.updateDeliverableState(match.id, next);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("state update failed:", (e as Error).message);
    }
  }
  counters.gateTransitions.inc({ gate, verdict });

  return c.json({
    ok: true,
    deliverable_id,
    gate,
    verdict,
    previous_state: state,
    current_state: next,
  });
});
