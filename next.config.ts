import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-tools badge so live demos look like production.
  devIndicators: false,
};

export default nextConfig;
