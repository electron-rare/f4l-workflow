export interface GristConfig {
  baseUrl: string;
  apiKey: string;
  docId: string;
}

export class GristClient {
  constructor(private cfg: GristConfig) {}

  private async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(
      `${this.cfg.baseUrl}/api/docs/${this.cfg.docId}${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`grist ${path}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async patch<T>(path: string, body: any): Promise<T> {
    const res = await fetch(
      `${this.cfg.baseUrl}/api/docs/${this.cfg.docId}${path}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`grist ${path}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  async createDeliverable(
    fields: Record<string, any>
  ): Promise<{ id: number }> {
    const r = await this.post<{ records: { id: number }[] }>(
      "/tables/Deliverables/records",
      { records: [{ fields }] }
    );
    return r.records[0]!;
  }

  async updateDeliverableState(id: number, newState: string): Promise<void> {
    await this.patch("/tables/Deliverables/records", {
      records: [
        {
          id,
          fields: {
            current_state: newState,
            last_transition_at: new Date().toISOString(),
          },
        },
      ],
    });
  }

  async insertGate(fields: Record<string, any>): Promise<{ id: number }> {
    const r = await this.post<{ records: { id: number }[] }>(
      "/tables/Gates/records",
      { records: [{ fields }] }
    );
    return r.records[0]!;
  }

  async insertIntake(fields: Record<string, any>): Promise<{ id: number }> {
    const r = await this.post<{ records: { id: number }[] }>(
      "/tables/Intakes/records",
      { records: [{ fields }] }
    );
    return r.records[0]!;
  }
}
