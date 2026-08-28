import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@vercel/kv"],
  webpack(config, context) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "isomorphic-ws": path.resolve(process.cwd(), "scripts/ws-shim.cjs"),
    };
    return config;
  },
};

export default nextConfig;