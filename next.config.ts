import type { NextConfig } from "next";

const ONE_DAY = 60 * 60 * 24;

const nextConfig: NextConfig = {
  // Hide the floating dev-tools badge so live demos look like production.
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    // Reuse recently visited pages in the browser, so moving between pages feels instant.
    staleTimes: { dynamic: 30, static: 300 },
  },
  async headers() {
    // Brand images and the syllabus PDF rarely change; let browsers and Cloudflare keep them.
    const cached = [{ key: "Cache-Control", value: `public, max-age=${ONE_DAY}` }];
    return [
      { source: "/brand/:path*", headers: cached },
      { source: "/syllabus/:path*", headers: cached },
    ];
  },
};

export default nextConfig;
