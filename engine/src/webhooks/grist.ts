import { Hono } from "hono";
import { normalizeIntake } from "../intake-normalizer.js";

export const gristWebhook = new Hono();

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
  try {
    const intake = normalizeIntake({ source: "grist", payload: rec });
    return c.json({ ok: true, intake_id: intake.intake_id });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});
