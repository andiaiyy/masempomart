import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // The embedded local database ships its own WebAssembly files; keep it out of the bundle
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
