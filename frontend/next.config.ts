import type { NextConfig } from "next";

// Suppress the "util._extend" deprecation warning (DEP0060) which comes from dependencies
if (typeof process !== "undefined" && process.emit) {
  const originalEmit = process.emit;
  // @ts-ignore
  process.emit = function (name, data: any, ...args) {
    if (
      name === "warning" &&
      typeof data === "object" &&
      data.name === "DeprecationWarning" &&
      data.message.includes("util._extend")
    ) {
      return false;
    }
    return originalEmit.apply(this, [name, data, ...args] as any);
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Ensure @tanstack/react-query is bundled once (fixes "No QueryClient set" with Turbopack)
  transpilePackages: ["@tanstack/react-query"],

  // Content-Security-Policy in report-only mode to avoid breaking existing functionality
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  // Fixes the API proxy so it works on both Local (Laptop) and Docker (Server)
  async rewrites() {
    const backendUrl =
      process.env.NODE_ENV === "production"
        ? "http://backend:8000"
        : "http://localhost:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;