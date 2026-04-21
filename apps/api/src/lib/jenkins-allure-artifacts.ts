import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function jenkinsAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const user = process.env.JENKINS_USER;
  const token = process.env.JENKINS_TOKEN;
  if (user && token) {
    headers.Authorization = "Basic " + Buffer.from(`${user}:${token}`, "utf-8").toString("base64");
  }
  return headers;
}

interface ArtifactEntry {
  relativePath: string;
  fileName?: string;
}

/**
 * Download Allure *-result.json files from a Jenkins build into a temp directory.
 * Requires the pipeline to archive `tests/e2e/allure-results/**` (see Jenkinsfile).
 */
export async function downloadAllureResultsFromJenkinsBuild(
  jenkinsBuildUrl: string,
  buildId: string,
): Promise<string | null> {
  const base = jenkinsBuildUrl.endsWith("/") ? jenkinsBuildUrl : `${jenkinsBuildUrl}/`;
  const apiUrl = `${base}api/json?tree=artifacts[relativePath,fileName]`;

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 30_000);

  try {
    const res = await fetch(apiUrl, { headers: jenkinsAuthHeaders(), signal: ac.signal });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { artifacts?: ArtifactEntry[] };
    const artifacts = data.artifacts ?? [];
    const resultFiles = artifacts.filter(
      (a) =>
        a.relativePath.endsWith("-result.json") &&
        (a.relativePath.includes("allure-results") || a.relativePath.includes("allure_results")),
    );
    if (resultFiles.length === 0) {
      return null;
    }

    const tmp = path.join(os.tmpdir(), `shipgate-allure-${buildId}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });

    for (const art of resultFiles) {
      const enc = art.relativePath
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");
      const downloadUrl = `${base}artifact/${enc}`;
      const fRes = await fetch(downloadUrl, { headers: jenkinsAuthHeaders() });
      if (!fRes.ok) continue;
      const buf = Buffer.from(await fRes.arrayBuffer());
      const dest = path.join(tmp, path.basename(art.relativePath));
      fs.writeFileSync(dest, buf);
    }

    const downloaded = fs.readdirSync(tmp).filter((f) => f.endsWith("-result.json"));
    if (downloaded.length === 0) {
      fs.rmSync(tmp, { recursive: true, force: true });
      return null;
    }
    return tmp;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export function removeTempAllureDir(dir: string | null): void {
  if (!dir) return;
  try {
    if (dir.startsWith(os.tmpdir()) && dir.includes("shipgate-allure")) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    /* ignore */
  }
}
