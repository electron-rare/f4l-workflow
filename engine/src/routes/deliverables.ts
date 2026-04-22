import { Hono } from "hono";
import { GristClient } from "../grist-client.js";

export const deliverablesRoute = new Hono();

function client(): GristClient {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  if (!apiKey || !docId) {
    throw new Error("GRIST_API_KEY and GRIST_DOC_ID must be set");
  }
  return new GristClient({ baseUrl, apiKey, docId });
}

async function gristGetAll(path: string): Promise<any> {
  const baseUrl = process.env.GRIST_BASE_URL ?? "https://grist.saillant.cc";
  const apiKey = process.env.GRIST_API_KEY ?? "";
  const docId = process.env.GRIST_DOC_ID ?? "";
  const res = await fetch(`${baseUrl}/api/docs/${docId}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`grist ${path}: HTTP ${res.status}`);
  return res.json();
}

function requireAuth(c: any): Response | null {
  const auth = c.req.header("authorization");
  const expected = process.env.F4L_BEARER_TOKEN;
  if (!expected || auth !== `Bearer ${expected}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return null;
}

deliverablesRoute.get("/deliverables", async (c) => {
  const denied = requireAuth(c);
  if (denied) return denied;
  try {
    const data = await gristGetAll("/tables/Deliverables/records");
    const rows = (data.records ?? []).map((r: any) => ({
      id: r.id,
      ...r.fields,
    }));
    return c.json(rows);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502);
  }
});

deliverablesRoute.get("/deliverables/:slug", async (c) => {
  const denied = requireAuth(c);
  if (denied) return denied;
  const slug = c.req.param("slug");
  try {
    const allDeliverables = await gristGetAll(
      "/tables/Deliverables/records"
    );
    const match = (allDeliverables.records ?? []).find(
      (r: any) => r.fields?.slug === slug
    );
    if (!match) return c.json({ error: "not found" }, 404);
    const deliverable = { id: match.id, ...match.fields };
    const allGates = await gristGetAll("/tables/Gates/records");
    const gates = (allGates.records ?? [])
      .filter((r: any) => r.fields?.deliverable_slug === slug)
      .map((r: any) => ({ id: r.id, ...r.fields }));
    return c.json({ deliverable, gates });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502);
  }
});
