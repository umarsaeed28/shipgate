import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@shipgate/database";
import { TestRunStatus } from "@prisma/client";

export const overviewRoutes: FastifyPluginAsync = async (app) => {
  app.get("/overview", async () => {
    const runs = await prisma.testRun.findMany({
      where: {
        status: { in: [TestRunStatus.passed, TestRunStatus.failed, TestRunStatus.error] },
      },
    });
    const total = runs.length || 1;
    const passed = runs.filter((r) => r.status === TestRunStatus.passed).length;
    const failed = runs.filter((r) => r.status === TestRunStatus.failed || r.status === TestRunStatus.error)
      .length;
    const passRate = passed / total;
    const failureRate = failed / total;
    const snapshots = await prisma.suiteHealthSnapshot.findMany({ orderBy: { capturedAt: "desc" } });
    const flaky = snapshots.length
      ? snapshots.reduce((a, s) => a + s.flakyRate, 0) / snapshots.length
      : 0.05;
    const activeRuns = await prisma.testRun.count({
      where: { status: { in: [TestRunStatus.queued, TestRunStatus.running] } },
    });
    const risk =
      failureRate > 0.25 || flaky > 0.08 ? "high" : failureRate > 0.12 || flaky > 0.05 ? "medium" : "low";
    const recent = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
    return {
      passRate,
      failureRate,
      flakyRate: flaky,
      activeRuns,
      releaseRisk: risk,
      recentActivity: recent.map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actor,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });
};
