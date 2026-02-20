import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure @tanstack/react-query is bundled once (fixes "No QueryClient set" with Turbopack)
  transpilePackages: ["@tanstack/react-query"],

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