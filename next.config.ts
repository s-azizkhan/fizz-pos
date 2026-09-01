import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.31.202'],
  experimental: {
    // Powers the directional route transitions in the dashboard shell.
    viewTransition: true,
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
