import { prisma } from "@qa/store";

/**
 * Agent 3 dashboard queries over the history store. READ-ONLY: these only read
 * rows; Agent 3 never mutates state. Each returns plain rows that the chat
 * endpoint may quote — answers are grounded strictly in returned rows.
 */

const day = (d: Date) => d.toISOString().slice(0, 10);

export interface PassRatePoint {
  date: string;
  passed: number;
  failed: number;
  passRate: number;
}

export async function passRateOverTime(): Promise<PassRatePoint[]> {
  const runs = await prisma.run.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { startedAt: "asc" },
  });
  const byDay = new Map<string, { passed: number; failed: number }>();
  for (const r of runs) {
    const s = (r.summary ?? {}) as { passed?: number; failed?: number };
    const k = day(r.startedAt);
    const acc = byDay.get(k) ?? { passed: 0, failed: 0 };
    acc.passed += s.passed ?? 0;
    acc.failed += s.failed ?? 0;
    byDay.set(k, acc);
  }
  return [...byDay.entries()].map(([date, v]) => {
    const total = v.passed + v.failed;
    return {
      date,
      passed: v.passed,
      failed: v.failed,
      passRate: total ? Math.round((v.passed / total) * 100) : 0,
    };
  });
}

export interface FlakeRate {
  classified: number;
  flaky: number;
  rate: number;
}

export async function flakeRate(): Promise<FlakeRate> {
  const classified = await prisma.classification.count();
  const flaky = await prisma.classification.count({ where: { class: "flaky" } });
  return {
    classified,
    flaky,
    rate: classified ? Math.round((flaky / classified) * 100) : 0,
  };
}

export interface CoveragePoint {
  date: string;
  automatedCumulative: number;
}

export async function coverageGrowth(): Promise<CoveragePoint[]> {
  const automated = await prisma.scenario.findMany({
    where: { status: "automated" },
    orderBy: { updatedAt: "asc" },
  });
  const byDay = new Map<string, number>();
  for (const s of automated) {
    const k = day(s.updatedAt);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  let cum = 0;
  return [...byDay.entries()].map(([date, n]) => {
    cum += n;
    return { date, automatedCumulative: cum };
  });
}

export interface TopFailingTest {
  testId: string | null;
  title: string;
  failures: number;
}

export async function topFailingTests(): Promise<TopFailingTest[]> {
  const grouped = await prisma.failure.groupBy({
    by: ["testId"],
    _count: { _all: true },
    orderBy: { _count: { testId: "desc" } },
    take: 10,
  });
  const out: TopFailingTest[] = [];
  for (const g of grouped) {
    let title = "(no linked test)";
    if (g.testId) {
      const test = await prisma.test.findUnique({
        where: { id: g.testId },
        include: { scenario: true },
      });
      title = test?.scenario?.title ?? test?.filePath ?? g.testId;
    }
    out.push({ testId: g.testId, title, failures: g._count._all });
  }
  return out;
}
