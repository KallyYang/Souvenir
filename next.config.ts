import type { NextConfig } from "next";

type RemotePattern = {
  protocol?: "http" | "https";
  hostname: string;
  pathname?: string;
  port?: string;
};

const publicBase = process.env.R2_PUBLIC_BASE_URL || "";
const patterns: RemotePattern[] = [
  { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
  { protocol: "https", hostname: "*.cloudflarestorage.com", pathname: "/**" },
];

try {
  if (publicBase) {
    const u = new URL(publicBase);
    patterns.unshift({
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      pathname: "/**",
    });
  }
} catch {
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: patterns,
  },
};

export default nextConfig;
