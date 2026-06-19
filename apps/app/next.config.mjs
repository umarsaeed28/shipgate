import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// One source of truth for env: load the repo-root .env (does not override
// variables already present in the environment).
config({ path: new URL("../../.env", import.meta.url).pathname });

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const basePath =
  process.env.APP_BASE_PATH !== undefined
    ? process.env.APP_BASE_PATH
    : `/app-${process.env.CLIENT_SLUG ?? "acme"}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  // Trace workspace packages from the monorepo root (required on Vercel).
  outputFileTracingRoot: rootDir,
  // Workspace packages are shipped as TypeScript source.
  transpilePackages: [
    "@qa/auth",
    "@qa/config",
    "@qa/store",
    "@qa/crypto",
    "@qa/queue",
    "@qa/trend-analyzer",
  ],
  env: {
    APP_BASE_PATH: basePath,
  },
};

export default nextConfig;
