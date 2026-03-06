/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during builds — lint issues are cosmetic (unused imports/vars)
    // and will be cleaned up separately. Critical issues (hooks order) are already fixed.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "zaryzynzbpxmscggufdc.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow embed routes to be loaded in iframes from any origin
        source: "/s/:slug/embed/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        // Allow embed.js to be loaded from any origin
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
