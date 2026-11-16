import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'application est entièrement dynamique (état JSON mutable, rôles).
  // Le mode cache components exige une validation d'instant navigation
  // qui retire les pages clientes du rendu.
  cacheComponents: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
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
