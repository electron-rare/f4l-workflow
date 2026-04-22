export interface ForgejoConfig {
  baseUrl: string;
  token: string;
  org: string;
}

export class ForgejoClient {
  constructor(private cfg: ForgejoConfig) {}

  async dispatchWorkflow(
    repo: string,
    workflowFile: string,
    ref: string,
    inputs: Record<string, string>
  ): Promise<void> {
    const url = `${this.cfg.baseUrl}/api/v1/repos/${this.cfg.org}/${repo}/actions/workflows/${workflowFile}/dispatches`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `token ${this.cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs }),
    });
    if (!res.ok) {
      throw new Error(
        `forgejo dispatch ${workflowFile} on ${repo}: HTTP ${res.status}`
      );
    }
  }
}
