import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.HEAT_RUNTIME === "node" ? {
    output: "standalone" as const, basePath: process.env.HEAT_BASE_PATH || "",
  } : {}),
  /* config options here */
};

export default nextConfig;
