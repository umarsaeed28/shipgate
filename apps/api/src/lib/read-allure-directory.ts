import fs from "node:fs";
import path from "node:path";

/** Shape of CodeceptJS / Allure *-result.json files we care about */
export interface AllureResultJson {
  uuid: string;
  name: string;
  fullName: string;
  status: string;
  statusDetails?: { message?: string; trace?: string };
  labels?: { name: string; value: string }[];
}

export function hasAllureResultFiles(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) return false;
    const files = fs.readdirSync(dir);
    return files.some((f) => f.endsWith("-result.json"));
  } catch {
    return false;
  }
}

export function readAllureResultFiles(dir: string): AllureResultJson[] {
  const out: AllureResultJson[] = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith("-result.json")) continue;
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const parsed = JSON.parse(raw) as AllureResultJson;
      out.push(parsed);
    }
  } catch {
    return [];
  }
  return out;
}

export function suiteNameFromAllure(r: AllureResultJson): string {
  const suite = r.labels?.find((l) => l.name === "suite" || l.name === "parentSuite");
  if (suite?.value) return suite.value;
  const parts = (r.fullName || r.name).split(/[\s.]/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : "Suite";
}
