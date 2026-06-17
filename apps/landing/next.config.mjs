import { config } from "dotenv";
config({ path: new URL("../../.env", import.meta.url).pathname });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@qa/store"],
};

export default nextConfig;
