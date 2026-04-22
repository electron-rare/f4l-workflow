import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const counters = {
  deliverables: new client.Counter({
    name: "f4l_deliverables_total",
    help: "Total deliverables created, labeled by type and state",
    labelNames: ["type", "state"] as const,
    registers: [registry],
  }),
  gateTransitions: new client.Counter({
    name: "f4l_gate_transitions_total",
    help: "Gate transitions, labeled by gate name and verdict",
    labelNames: ["gate", "verdict"] as const,
    registers: [registry],
  }),
  agentInvocations: new client.Counter({
    name: "f4l_agent_invocations_total",
    help: "Agent invocations by role and status",
    labelNames: ["role", "status"] as const,
    registers: [registry],
  }),
  evidencePacks: new client.Counter({
    name: "f4l_evidence_packs_total",
    help: "Evidence packs produced, labeled by deliverable slug",
    labelNames: ["slug"] as const,
    registers: [registry],
  }),
};

export const gauges = {
  active: new client.Gauge({
    name: "f4l_active_deliverables",
    help: "Number of deliverables not in a terminal state",
    registers: [registry],
  }),
  stuckAtGate: new client.Gauge({
    name: "f4l_stuck_at_gate_duration_seconds",
    help: "Seconds a deliverable has been stuck at a gate, labeled by gate",
    labelNames: ["gate"] as const,
    registers: [registry],
  }),
};
