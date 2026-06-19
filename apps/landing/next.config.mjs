import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: new URL("../../.env", import.meta.url).pathname });

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Trace workspace packages from the monorepo root (required on Vercel).
  outputFileTracingRoot: rootDir,
  transpilePackages: ["@qa/store"],
};

export default nextConfig;
