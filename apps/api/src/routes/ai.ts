import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ChatRequest } from "@shipgate/shared";

const chatBody = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  context: z
    .object({
      runId: z.string().optional(),
      suiteId: z.string().optional(),
    })
    .optional(),
});

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ChatRequest }>("/ai/chat", async (req) => {
    const body = chatBody.parse(req.body);
    const last = [...body.messages].reverse().find((m) => m.role === "user");
    const ctx =
      body.context?.runId || body.context?.suiteId
        ? ` (context: run=${body.context?.runId ?? "-"} suite=${body.context?.suiteId ?? "-"})`
        : "";
    const reply = last
      ? `Assistant: I can help triage failures, summarize runs, or draft scenarios.${ctx} You asked: "${last.content.slice(0, 200)}". This is a mock response for local MVP.`
      : "Assistant: Ask a question about your QA workspace.";
    return {
      message: {
        role: "assistant" as const,
        content: reply,
      },
    };
  });
};
