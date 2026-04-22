import { Hono } from "hono";

export const forgejoWebhook = new Hono();

forgejoWebhook.post("/webhooks/forgejo", async (c) => {
  const secret = c.req.header("x-forgejo-signature");
  if (!secret || secret !== process.env.F4L_WEBHOOK_SECRET) {
    return c.json({ error: "bad secret" }, 401);
  }
  const body = await c.req.json();
  const { deliverable_id, run_id, status } = body ?? {};
  if (!deliverable_id || !status) {
    return c.json({ error: "missing fields" }, 400);
  }
  return c.json({ ok: true, deliverable_id, run_id, status });
});
