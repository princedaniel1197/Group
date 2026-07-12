import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `sharp` is only used by the bulk-import scripts, never at runtime. Keep its
  // native binaries out of the serverless function bundle (otherwise it emits
  // "Couldn't load zlib" and bloats cold starts).
  outputFileTracingExcludes: {
    "*": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
};

export default nextConfig;
