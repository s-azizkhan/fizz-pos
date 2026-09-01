import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.31.202'],
  experimental: {
    // Powers the directional route transitions in the dashboard shell.
    viewTransition: true,
    // Keep the RSC payload of dashboard pages (till menu, orders) in the client
    // router cache while tab-switching. A hard reload still refetches, and
    // Server Actions' revalidatePath still busts it after every mutation.
    // ponytail: global 5-min TTL; per-route cacheLife if one page needs fresher.
    staleTimes: { dynamic: 300, static: 300 },
  },
  async headers() {
    return [
      {
        // The worker must never be served stale, or a bad build sticks around.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
