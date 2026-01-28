import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // Allow cross-origin requests from development IP
  allowedDevOrigins: ["172.19.2.171"],

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
