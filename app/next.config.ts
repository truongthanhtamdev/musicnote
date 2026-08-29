import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone server for easy deployment
  // on a VPS/Docker (this app uses SQLite on local disk, so it needs a
  // persistent Node.js host rather than a stateless serverless platform).
  output: "standalone",
};

export default nextConfig;
