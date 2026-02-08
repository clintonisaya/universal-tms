import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixes the API proxy so it works on both Local (Laptop) and Docker (Server)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "production"
            ? "http://backend:8000/api/:path*" // In Docker, we talk to the 'backend' container directly
            : "http://localhost:8000/api/:path*", // Locally, we talk to localhost
      },
    ];
  },
};

export default nextConfig;