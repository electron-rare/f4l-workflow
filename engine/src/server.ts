import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { gristWebhook } from "./webhooks/grist.js";
import { forgejoWebhook } from "./webhooks/forgejo.js";
import { gateRoute } from "./routes/gate.js";
import { registry } from "./metrics.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "f4l-engine" }));

app.get("/metrics", async (c) => {
  const body = await registry.metrics();
  return c.text(body, 200, { "Content-Type": registry.contentType });
});

app.route("/", gristWebhook);
app.route("/", forgejoWebhook);
app.route("/", gateRoute);

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 9100);
  serve({ fetch: app.fetch, port }, ({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`f4l-engine listening on :${port}`);
  });
}

export default app;
