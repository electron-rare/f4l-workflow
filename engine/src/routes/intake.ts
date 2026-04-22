import { Hono } from "hono";
import { z } from "zod";
import { normalizeIntake } from "../intake-normalizer.js";
import { GristClient } from "../grist-client.js";
import { transition } from "../state-machine.js";
import { counters } from "../metrics.js";

const IntakeSchema = z.object({
  title: z.string().min(1),
  deliverable_type: z.enum(["A", "B"]).default("A"),
  details: z.string().optional().default(""),
  compliance_profile: z
    .enum(["prototype", "iot_wifi_eu"])
    .optional()
    .default("prototype"),
});

function grist(): GristClient | null {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  if (!apiKey || !docId) return null;
  return new GristClient({ baseUrl, apiKey, docId });
}

export const intakeRoute = new Hono();

intakeRoute.post("/api/intake", async (c) => {
  const auth = c.req.header("authorization");
  const expected = process.env.F4L_BEARER_TOKEN;
  if (!expected || auth !== `Bearer ${expected}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const parsed = IntakeSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const { title, deliverable_type, details, compliance_profile } = parsed.data;

  const intake = normalizeIntake({
    source: "grist",
    payload: { title, deliverable_type, details },
  });

  const g = grist();
  let deliverable_id: number | null = null;
  let slug: string | null = null;

  if (g) {
    try {
      await g.insertIntake({
        intake_id: intake.intake_id,
        source: "cockpit",
        title: intake.title,
        raw_payload: JSON.stringify(intake.raw_payload),
        normalized_payload: JSON.stringify(intake.normalized_payload),
        deliverable_type,
        status: "accepted",
        created_at: intake.created_at,
        created_by: "cockpit",
      });
      slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now()}`;
      const r = await g.createDeliverable({
        deliverable_id: slug,
        slug,
        type: deliverable_type,
        title,
        current_state: "intake",
        owner: "cockpit",
        compliance_profile,
        created_at: intake.created_at,
        last_transition_at: intake.created_at,
      });
      deliverable_id = r.id;
      counters.deliverables.inc({ type: deliverable_type, state: "intake" });
      if (deliverable_type === "A") {
        const next = transition("intake", { kind: "SpecDraftCompleted" });
        await g.updateDeliverableState(deliverable_id, next);
        counters.gateTransitions.inc({ gate: "G-spec", verdict: "pending" });
      }
    } catch (e) {
      return c.json({ error: (e as Error).message }, 502);
    }
  }

  return c.json({
    ok: true,
    intake_id: intake.intake_id,
    deliverable_id,
    slug,
  });
});
