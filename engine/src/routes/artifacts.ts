import { Hono } from "hono";
import JSZip from "jszip";

/**
 * Artifacts API — surfaces the evidence-pack.yml outputs stored as Forgejo
 * Actions artifacts, plus the run metadata (link back to the Forgejo run UI).
 *
 * Strategy: the engine proxies the Forgejo REST API + unzips the artifact on
 * demand so the cockpit can list files and stream single-file content without
 * downloading the whole zip.
 *
 * Expected Forgejo repo: `factory-4-life/f4l-workflow` (where evidence-pack.yml
 * lives). Override with FORGEJO_ARTIFACT_REPO if you move the workflow.
 */

const FORGEJO_BASE =
  process.env.FORGEJO_BASE_URL ?? "https://git.saillant.cc";
const FORGEJO_ORG = process.env.FORGEJO_ORG ?? "factory-4-life";
const FORGEJO_REPO = process.env.FORGEJO_ARTIFACT_REPO ?? "f4l-workflow";
const FORGEJO_WORKFLOW = "evidence-pack.yml";

interface ForgejoRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
  display_title?: string;
  event?: string;
  head_branch?: string;
  head_sha?: string;
  run_number?: number;
}

interface ForgejoArtifact {
  id: number;
  name: string;
  size_in_bytes?: number;
  archive_download_url?: string;
  expired?: boolean;
}

async function forgejoFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.FORGEJO_TOKEN ?? "";
  return fetch(`${FORGEJO_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `token ${token}`,
    },
  });
}

async function listRunsForSlug(slug: string): Promise<ForgejoRun[]> {
  const url = `/api/v1/repos/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/workflows/${FORGEJO_WORKFLOW}/runs?limit=20`;
  const r = await forgejoFetch(url);
  if (!r.ok) return [];
  const data = (await r.json()) as { workflow_runs?: ForgejoRun[] };
  const runs = data.workflow_runs ?? [];
  return runs.filter(
    (run) =>
      (run.display_title ?? "").includes(slug) ||
      (run.name ?? "").includes(slug)
  );
}

async function listArtifacts(runId: number): Promise<ForgejoArtifact[]> {
  const url = `/api/v1/repos/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/runs/${runId}/artifacts`;
  const r = await forgejoFetch(url);
  if (!r.ok) return [];
  const data = (await r.json()) as { artifacts?: ForgejoArtifact[] };
  return data.artifacts ?? [];
}

async function downloadArtifactZip(artifactId: number): Promise<ArrayBuffer | null> {
  const url = `/api/v1/repos/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/artifacts/${artifactId}/zip`;
  const r = await forgejoFetch(url);
  if (!r.ok) return null;
  return r.arrayBuffer();
}

function contentTypeFor(path: string): string {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    json: "application/json; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    yml: "text/yaml; charset=utf-8",
    yaml: "text/yaml; charset=utf-8",
    log: "text/plain; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    pdf: "application/pdf",
    zip: "application/zip",
    bin: "application/octet-stream",
    elf: "application/octet-stream",
    kicad_sch: "text/plain; charset=utf-8",
    kicad_pcb: "text/plain; charset=utf-8",
    kicad_pro: "application/json; charset=utf-8",
    net: "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}

export const artifactsRoute = new Hono();

artifactsRoute.get("/deliverables/:slug/runs", async (c) => {
  const slug = c.req.param("slug");
  try {
    const runs = await listRunsForSlug(slug);
    return c.json(
      runs.map((r) => ({
        id: r.id,
        name: r.display_title ?? r.name,
        status: r.status,
        conclusion: r.conclusion ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        head_sha: r.head_sha,
        html_url:
          r.html_url ??
          `${FORGEJO_BASE}/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/runs/${r.id}`,
      }))
    );
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502);
  }
});

artifactsRoute.get("/deliverables/:slug/artifacts", async (c) => {
  const slug = c.req.param("slug");
  try {
    const runs = await listRunsForSlug(slug);
    if (runs.length === 0) return c.json({ runs: [], files: [] });

    // Pick the most recent successful run, else most recent.
    const run =
      runs.find((r) => r.conclusion === "success") ?? runs[0];
    if (!run) return c.json({ runs: [], files: [] });

    const artifacts = await listArtifacts(run.id);
    if (artifacts.length === 0) {
      return c.json({
        run: {
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          html_url:
            run.html_url ??
            `${FORGEJO_BASE}/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/runs/${run.id}`,
        },
        artifacts: [],
        files: [],
      });
    }

    // For each artifact, download + inspect zip, return file list.
    const files: Array<{
      artifact_id: number;
      artifact_name: string;
      path: string;
      size: number;
      content_type: string;
    }> = [];
    for (const art of artifacts) {
      if (art.expired) continue;
      const zipBuf = await downloadArtifactZip(art.id);
      if (!zipBuf) continue;
      const zip = await JSZip.loadAsync(zipBuf);
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const bin = await entry.async("uint8array");
        files.push({
          artifact_id: art.id,
          artifact_name: art.name,
          path,
          size: bin.byteLength,
          content_type: contentTypeFor(path),
        });
      }
    }
    return c.json({
      run: {
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        html_url:
          run.html_url ??
          `${FORGEJO_BASE}/${FORGEJO_ORG}/${FORGEJO_REPO}/actions/runs/${run.id}`,
      },
      artifacts: artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size_in_bytes ?? 0,
      })),
      files,
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502);
  }
});

artifactsRoute.get("/deliverables/:slug/artifact-file", async (c) => {
  const slug = c.req.param("slug");
  const artifactIdStr = c.req.query("artifact_id");
  const path = c.req.query("path");
  if (!artifactIdStr || !path) {
    return c.json({ error: "artifact_id and path query params required" }, 400);
  }
  const artifactId = Number(artifactIdStr);
  try {
    // Verify slug is in runs to keep this endpoint scoped.
    const runs = await listRunsForSlug(slug);
    if (runs.length === 0) return c.json({ error: "no runs for slug" }, 404);

    const zipBuf = await downloadArtifactZip(artifactId);
    if (!zipBuf) return c.json({ error: "artifact not found" }, 404);

    const zip = await JSZip.loadAsync(zipBuf);
    const entry = zip.file(path);
    if (!entry) return c.json({ error: "file not in artifact" }, 404);
    const bin = await entry.async("nodebuffer");
    return new Response(bin as unknown as BodyInit, {
      headers: {
        "Content-Type": contentTypeFor(path),
        "Content-Length": String(bin.byteLength),
        "Content-Disposition": `inline; filename="${path.split("/").pop() ?? "file"}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502);
  }
});
