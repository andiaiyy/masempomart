import type { NextConfig } from "next";

// The admin app (folder admin/) serves the API under /api. Locally: `npm run dev` there, on port 8000.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,

  // The browser calls /api on this site; Next.js forwards it to the admin, so there is no CORS
  // and the admin sees the shopper's IP in X-Forwarded-For (its rate limits count per shopper).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
