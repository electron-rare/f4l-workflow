const BASE =
  (import.meta.env.VITE_ENGINE_URL as string | undefined) ??
  "https://engine.saillant.cc";

export const getToken = (): string => localStorage.getItem("f4l_token") ?? "";
export const setToken = (t: string): void => {
  if (t) localStorage.setItem("f4l_token", t);
  else localStorage.removeItem("f4l_token");
};

const authHeader = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export interface Deliverable {
  id?: number;
  deliverable_id: string;
  slug: string;
  type: "A" | "B";
  title: string;
  current_state: string;
  compliance_profile: string;
  owner: string;
  last_transition_at?: string;
  created_at?: string;
}

export interface Gate {
  id?: number;
  gate_id: string;
  deliverable_slug: string;
  gate_name: string;
  verdict: string;
  reasons?: string;
  decided_by?: string;
  decided_at?: string;
  attempt?: number;
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

export async function createIntake(body: {
  title: string;
  deliverable_type: "A" | "B";
  details?: string;
  compliance_profile?: "prototype" | "iot_wifi_eu";
}): Promise<{ slug?: string; deliverable_id?: number; intake_id: string }> {
  const r = await fetch(`${BASE}/api/intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`HTTP ${r.status}: ${err}`);
  }
  return r.json();
}

export async function advanceGate(body: {
  deliverable_id: string;
  gate: string;
  verdict: "pass" | "fail" | "skipped";
  reasons?: string;
  category?: "compliance" | "test" | "build";
}): Promise<{ previous_state: string; current_state: string }> {
  const r = await fetch(`${BASE}/gate/advance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`HTTP ${r.status}: ${err}`);
  }
  return r.json();
}
