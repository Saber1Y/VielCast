import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@vercel/kv"],
};

export default nextConfig;
