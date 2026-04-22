import { Hono } from "hono";
import { normalizeIntake } from "../intake-normalizer.js";
import { GristClient } from "../grist-client.js";
import { LifeCoreClient } from "../life-core-client.js";
import { transition } from "../state-machine.js";
import { counters } from "../metrics.js";

export const gristWebhook = new Hono();

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

gristWebhook.post("/webhooks/grist", async (c) => {
  const secret = c.req.header("x-grist-secret");
  if (!secret || secret !== process.env.F4L_WEBHOOK_SECRET) {
    return c.json({ error: "invalid secret" }, 401);
  }
  const body = await c.req.json();
  const rec = body?.records?.[0]?.fields ?? body;
  if (!rec || typeof rec !== "object") {
    return c.json({ error: "empty body" }, 400);
  }

  let intake;
  try {
    intake = normalizeIntake({ source: "grist", payload: rec });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }

  const g = grist();
  const lc = lifeCore();

  // Persist intake + create deliverable if type is set.
  let deliverable_id: number | null = null;
  if (g) {
    try {
      await g.insertIntake({
        intake_id: intake.intake_id,
        source: intake.source,
        title: intake.title,
        raw_payload: JSON.stringify(intake.raw_payload),
        normalized_payload: JSON.stringify(intake.normalized_payload),
        deliverable_type: intake.deliverable_type ?? "",
        status: intake.status,
        created_at: intake.created_at,
        created_by: intake.created_by,
      });
      if (intake.deliverable_type) {
        const slug = `${intake.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
        const r = await g.createDeliverable({
          deliverable_id: slug,
          slug,
          type: intake.deliverable_type,
          title: intake.title,
          current_state: "intake",
          owner: intake.created_by,
          compliance_profile: "prototype",
          created_at: intake.created_at,
          last_transition_at: intake.created_at,
        });
        deliverable_id = r.id;
        counters.deliverables.inc({
          type: intake.deliverable_type,
          state: "intake",
        });
      }
    } catch (e) {
      // Grist write failed; log and continue — the webhook still accepts the event.
      // eslint-disable-next-line no-console
      console.error("grist write failed:", (e as Error).message);
    }
  }

  // Auto-advance from intake to spec whenever a type-A deliverable is created,
  // even if life-core isn't wired. If life-core is available, the spec agent
  // will have written a draft spec in git; otherwise the draft step is left
  // for the human or a future re-dispatch.
  if (deliverable_id && g && intake.deliverable_type === "A") {
    if (lc) {
      try {
        const result = await lc.runAgent("spec", {
          intake: {
            title: intake.title,
            normalized_payload: intake.normalized_payload,
          },
          compliance_profile: "prototype",
        });
        counters.agentInvocations.inc({
          role: "spec",
          status: result.result.ok ? "pass" : "fail",
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("life-core spec agent failed:", (e as Error).message);
      }
    }
    try {
      const next = transition("intake", { kind: "SpecDraftCompleted" });
      await g.updateDeliverableState(deliverable_id, next);
      counters.gateTransitions.inc({ gate: "G-spec", verdict: "pending" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("state update to spec failed:", (e as Error).message);
    }
  }

  return c.json({ ok: true, intake_id: intake.intake_id, deliverable_id });
});
