import { z } from "zod";

export const IntakeRecord = z.object({
  intake_id: z.string(),
  source: z.enum(["grist", "forgejo", "email", "mascarade"]),
  title: z.string(),
  raw_payload: z.record(z.string(), z.any()),
  normalized_payload: z.record(z.string(), z.any()),
  deliverable_type: z.enum(["A", "B"]).nullable(),
  status: z.enum(["new", "accepted", "rejected"]).default("new"),
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  created_by: z.string().default("automation"),
});
export type IntakeRecord = z.infer<typeof IntakeRecord>;

const detectTypeFromLabels = (
  labels: Array<{ name: string }> = []
): "A" | "B" | null =>
  labels.find((l) => l.name === "type:A")
    ? "A"
    : labels.find((l) => l.name === "type:B")
      ? "B"
      : null;

export function normalizeIntake(args: {
  source: string;
  payload: Record<string, any>;
}): IntakeRecord {
  const { source, payload } = args;
  const intake_id = `ix-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  switch (source) {
    case "grist":
      return IntakeRecord.parse({
        intake_id,
        source,
        title: payload.title ?? "(untitled)",
        raw_payload: payload,
        normalized_payload: {
          goal: payload.details ?? "",
          constraints: [],
        },
        deliverable_type: payload.deliverable_type ?? null,
      });
    case "forgejo":
      return IntakeRecord.parse({
        intake_id,
        source,
        title: payload.issue?.title ?? "(untitled)",
        raw_payload: payload,
        normalized_payload: {
          goal: payload.issue?.body ?? "",
          constraints: [],
        },
        deliverable_type: detectTypeFromLabels(payload.issue?.labels),
      });
    case "mascarade":
      return IntakeRecord.parse({
        intake_id,
        source,
        title: payload.topic ?? "(untitled)",
        raw_payload: payload,
        normalized_payload: {
          goal: payload.message ?? "",
          constraints: [],
        },
        deliverable_type: null,
      });
    default:
      throw new Error(`unknown intake source: ${source}`);
  }
}
