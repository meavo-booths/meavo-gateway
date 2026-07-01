import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@meavo/navigation"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
