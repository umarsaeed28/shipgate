import { z } from "zod";

/**
 * The four real categories the Triager classifies into. `needs_human` is the
 * explicit abstention required by invariant 5 and is part of the output type.
 */
export const FailureCategory = z.enum([
  "product-bug",
  "flaky",
  "env-infra",
  "test-needs-update",
  "needs_human",
]);
export type FailureCategory = z.infer<typeof FailureCategory>;

export const ClassificationDecidedBy = z.enum(["pre-classifier", "llm"]);
export type ClassificationDecidedBy = z.infer<typeof ClassificationDecidedBy>;

export const Classification = z.object({
  failureId: z.string(),
  category: FailureCategory,
  /** Calibrated confidence in [0, 1]. */
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  decidedBy: ClassificationDecidedBy,
  /** Suspected product bugs always surface to a human (invariant 5). */
  suspectedBug: z.boolean(),
  /** Root-cause clustering key (shared element/endpoint/error signature). */
  signatureKey: z.string().optional(),
});
export type Classification = z.infer<typeof Classification>;
