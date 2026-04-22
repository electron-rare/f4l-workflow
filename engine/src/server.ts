import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "f4l-engine" }));

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 9100);
  serve({ fetch: app.fetch, port }, ({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`f4l-engine listening on :${port}`);
  });
}

export default app;
