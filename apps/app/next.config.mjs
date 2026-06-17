import { config } from "dotenv";

// One source of truth for env: load the repo-root .env (does not override
// variables already present in the environment).
config({ path: new URL("../../.env", import.meta.url).pathname });

const basePath = process.env.APP_BASE_PATH ?? `/app-${process.env.CLIENT_SLUG ?? "acme"}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
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
