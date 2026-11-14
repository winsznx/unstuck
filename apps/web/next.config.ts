import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@unstuck/core", "@unstuck/db", "@unstuck/integrations", "@unstuck/pipeline"],
  serverExternalPackages: ["postgres"],
  // The share cards read these with readFileSync, which file tracing can't follow on its own.
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./assets/fonts/*", "./app/icon.svg", "./app/tokens.css"],
    "/apple-icon*": ["./app/icon.svg", "./app/tokens.css"],
  },
  async redirects() {
    return [{ source: "/docs/introduction", destination: "/docs", permanent: true }];
  },
  async rewrites() {
    return [{ source: "/docs/:slug.md", destination: "/docs/md/:slug" }];
  },
};

export default nextConfig;
