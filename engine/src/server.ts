import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { gristWebhook } from "./webhooks/grist.js";
import { forgejoWebhook } from "./webhooks/forgejo.js";
import { gateRoute } from "./routes/gate.js";
import { deliverablesRoute } from "./routes/deliverables.js";
import { registry } from "./metrics.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (o) =>
      o &&
      (o === "https://cockpit.saillant.cc" ||
        o.endsWith(".saillant.cc") ||
        o.startsWith("http://localhost"))
        ? o
        : "https://cockpit.saillant.cc",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "X-Grist-Secret",
      "X-Forgejo-Signature",
    ],
    credentials: true,
    maxAge: 600,
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "f4l-engine" }));

app.get("/metrics", async (c) => {
  const body = await registry.metrics();
  return c.text(body, 200, { "Content-Type": registry.contentType });
});

app.route("/", gristWebhook);
app.route("/", forgejoWebhook);
app.route("/", gateRoute);
app.route("/", deliverablesRoute);

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 9100);
  serve({ fetch: app.fetch, port }, ({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`f4l-engine listening on :${port}`);
  });
}

export default app;
