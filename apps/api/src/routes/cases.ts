import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@shipgate/database";
import { TestRunStatus } from "@prisma/client";

export const casesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/cases", async () => {
    const cases = await prisma.testCase.findMany({
      include: { suite: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 500,
    });
    const runs = await prisma.testRun.findMany({
      where: { status: { in: [TestRunStatus.passed, TestRunStatus.failed] } },
      orderBy: { finishedAt: "desc" },
      include: { failureEvents: { select: { caseId: true } } },
      take: 80,
    });
    const failedCaseIds = new Set<string>();
    for (const r of runs) {
      if (r.status === TestRunStatus.failed) {
        for (const f of r.failureEvents) {
          if (f.caseId) failedCaseIds.add(f.caseId);
        }
      }
    }
    return cases.map((c) => {
      let lastResult: "passed" | "failed" | "skipped" | "unknown" = "unknown";
      if (c.status === "skipped") lastResult = "skipped";
      else if (failedCaseIds.has(c.id)) lastResult = "failed";
      else lastResult = "passed";
      return {
        id: c.id,
        name: c.name,
        suiteId: c.suiteId,
        suiteName: c.suite.name,
        priority: c.priority,
        status: c.status,
        lastResult,
      };
    });
  });
};
