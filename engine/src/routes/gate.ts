import { Hono } from "hono";
import { z } from "zod";

const AdvanceSchema = z.object({
  deliverable_id: z.string(),
  gate: z.enum(["G-spec", "G-impl", "G-ship", "G-ready", "G-release"]),
  verdict: z.enum(["pass", "fail", "skipped"]),
  reasons: z.string().optional().default(""),
  category: z.enum(["compliance", "test", "build"]).optional(),
});

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
  return c.json({ ok: true, input: parsed.data });
});
