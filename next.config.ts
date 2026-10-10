import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.HEAT_RUNTIME === "node" ? { output: "standalone" as const } : {}),
  /* config options here */
};

export default nextConfig;
