const BASE =
  (import.meta.env.VITE_ENGINE_URL as string | undefined) ??
  "https://engine.saillant.cc";

const token = (): string => localStorage.getItem("f4l_token") ?? "";

const authHeader = (): Record<string, string> => {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export interface Deliverable {
  deliverable_id: string;
  slug: string;
  type: "A" | "B";
  title: string;
  current_state: string;
  compliance_profile: string;
  owner: string;
  last_transition_at?: string;
}

export interface Gate {
  gate_id: string;
  deliverable_id: string;
  gate_name: string;
  verdict: string;
  reasons?: string;
  decided_by?: string;
  decided_at?: string;
}

export async function listDeliverables(): Promise<Deliverable[]> {
  const r = await fetch(`${BASE}/deliverables`, { headers: authHeader() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function getDeliverable(slug: string): Promise<{
  deliverable: Deliverable;
  gates: Gate[];
}> {
  const r = await fetch(`${BASE}/deliverables/${slug}`, {
    headers: authHeader(),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
