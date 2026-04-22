import { Hono } from "hono";
import { GristClient } from "../grist-client.js";
import { LifeCoreClient } from "../life-core-client.js";
import { transition } from "../state-machine.js";
import { counters } from "../metrics.js";

export const forgejoWebhook = new Hono();

function grist(): GristClient | null {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  if (!apiKey || !docId) return null;
  return new GristClient({ baseUrl, apiKey, docId });
}

function lifeCore(): LifeCoreClient | null {
  const baseUrl = process.env.LIFE_CORE_URL ?? "";
  if (!baseUrl) return null;
  return new LifeCoreClient({ baseUrl });
}

async function findDeliverableBySlug(
  g: GristClient,
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
  return (
    (data.records ?? []).find((r: any) => r.fields?.slug === slug) ?? null
  );
}

forgejoWebhook.post("/webhooks/forgejo", async (c) => {
  const secret = c.req.header("x-forgejo-signature");
  if (!secret || secret !== process.env.F4L_WEBHOOK_SECRET) {
    return c.json({ error: "bad secret" }, 401);
  }
  const body = await c.req.json();
  const { deliverable_id: slug, run_id, status } = body ?? {};
  if (!slug || !status) return c.json({ error: "missing fields" }, 400);

  const g = grist();
  const lc = lifeCore();
  if (!g) {
    return c.json(
      { ok: true, slug, run_id, status, note: "grist not wired" }
    );
  }

  const match = await findDeliverableBySlug(g, slug);
  if (!match) return c.json({ error: "deliverable not found" }, 404);

  const state = match.fields.current_state as string;
  let next = state;

  if (status === "success" && state === "impl") {
    // Ask qa agent if wired, else auto-advance.
    let qaPass = true;
    if (lc) {
      try {
        const qa = await lc.runAgent("qa", {
          deliverable_id: slug,
          gate: "G-impl",
          artefacts: { run_id, build_ok: true },
          compliance_profile: match.fields.compliance_profile ?? "prototype",
        });
        qaPass = qa.result.ok;
        counters.agentInvocations.inc({
          role: "qa",
          status: qaPass ? "pass" : "fail",
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("qa agent failed:", (e as Error).message);
      }
    }
    next = transition(state as any, {
      kind: qaPass ? "GateImplPass" : "GateImplFail",
    });
    counters.gateTransitions.inc({
      gate: "G-impl",
      verdict: qaPass ? "pass" : "fail",
    });
  } else if (status === "failure" && state === "impl") {
    next = transition(state as any, { kind: "GateImplFail" });
    counters.gateTransitions.inc({ gate: "G-impl", verdict: "fail" });
  }

  if (next !== state) {
    await g.updateDeliverableState(match.id, next);
  }
  return c.json({ ok: true, slug, previous_state: state, current_state: next });
});
