import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface JenkinsAdapterConfig {
  baseUrl: string;
  jobName: string;
  artifactsDir?: string;
}

export interface RawJenkinsBuild {
  number: number;
  result: string;
  timestamp: number;
  duration: number;
  url: string;
  artifacts: { fileName: string; relativePath: string }[];
}

export class JenkinsAdapter {
  constructor(private config: JenkinsAdapterConfig) {}

  async getLatestBuild(): Promise<RawJenkinsBuild | null> {
    const builds = await this.loadBuildsFromDisk();
    if (builds.length === 0) return null;
    return builds.reduce((latest, b) => (b.number > latest.number ? b : latest));
  }

  async getBuild(buildNumber: number): Promise<RawJenkinsBuild | null> {
    const builds = await this.loadBuildsFromDisk();
    return builds.find(b => b.number === buildNumber) ?? null;
  }

  async getBuildsSince(buildNumber: number): Promise<RawJenkinsBuild[]> {
    const builds = await this.loadBuildsFromDisk();
    return builds
      .filter(b => b.number > buildNumber)
      .sort((a, b) => a.number - b.number);
  }

  async getArtifacts(buildNumber: number): Promise<string[]> {
    const build = await this.getBuild(buildNumber);
    if (!build) return [];
    return build.artifacts.map(a => a.relativePath);
  }

  private async loadBuildsFromDisk(): Promise<RawJenkinsBuild[]> {
    const dir = this.config.artifactsDir;
    if (!dir) return this.createDemoBuild();

    try {
      const entries = await readdir(dir);
      const jsonFiles = entries.filter((f: string) => f.endsWith('.json') && f.startsWith('build-'));
      const builds: RawJenkinsBuild[] = [];

      for (const file of jsonFiles) {
        const content = await readFile(join(dir, file), 'utf-8');
        const parsed = JSON.parse(content) as RawJenkinsBuild;
        builds.push(parsed);
      }

      return builds;
    } catch {
      return this.createDemoBuild();
    }
  }

  private createDemoBuild(): RawJenkinsBuild[] {
    return [
      {
        number: 1,
        result: 'FAILURE',
        timestamp: Date.now() - 3600_000,
        duration: 120_000,
        url: `${this.config.baseUrl}/job/${this.config.jobName}/1/`,
        artifacts: [
          { fileName: 'allure-results.zip', relativePath: 'allure-results/allure-results.zip' },
        ],
      },
    ];
  }
}
