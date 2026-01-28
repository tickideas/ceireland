import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Allow cross-origin requests from development IP
  allowedDevOrigins: ["172.19.2.171"],

  // Ensure Server Actions work correctly in production
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Add cache-busting headers to prevent stale JS bundles
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'rhapsodyofrealities.b-cdn.net',
      },
      // Add other remote hosts here if your banners use them
    ],
  },
};

export default nextConfig;
