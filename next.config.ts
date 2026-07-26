import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Content-Security-Policy',
          // challenges.cloudflare.com is required by Turnstile: script-src for
          // the widget loader and frame-src for the challenge iframe. Without
          // both, the widget silently fails to render and every registration
          // is rejected for a missing token.
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss: ws:; media-src 'self' https:; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'self';",
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: process.cwd(),
  },

  // Allow cross-origin requests from development IP
  allowedDevOrigins: ["172.19.2.171"],

  // Ensure Server Actions work correctly in production
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Rewrite barrel imports to per-module paths to cut compile/bundle work
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
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
          ...securityHeaders,
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
    formats: ['image/avif', 'image/webp'],
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
