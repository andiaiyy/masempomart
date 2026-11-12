import type { NextConfig } from "next";

// Laravel API + Filament (folder admin/). Locally: `php artisan serve` on port 8000.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,

  // The browser calls /api on this site; Next.js forwards it to Laravel, so there is no CORS
  // and Laravel sees the shopper's IP in X-Forwarded-For (see TRUSTED_PROXIES in admin/.env).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
