export interface LifeCoreConfig {
  baseUrl: string;
}

export interface AgentResult {
  ok: boolean;
  output: string;
  reasons: string[];
}

export class LifeCoreClient {
  constructor(private cfg: LifeCoreConfig) {}

  async runAgent(
    role: "spec" | "qa",
    payload: Record<string, any>
  ): Promise<{ job_id: string; result: AgentResult }> {
    const url = `${this.cfg.baseUrl}/agents/${role}/run`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`life-core /agents/${role}/run: HTTP ${res.status}`);
    }
    return res.json() as Promise<{ job_id: string; result: AgentResult }>;
  }
}
