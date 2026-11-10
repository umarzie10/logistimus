import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Self-contained server bundle for the production Docker image
  // (`.next/standalone/server.js`); `next start` keeps working locally.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // Legacy /super-admin URLs now live under /admin
      { source: "/super-admin/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/super-admin", destination: "/admin", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
