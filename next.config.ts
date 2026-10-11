import type { NextConfig } from "next";

// Sent with every page and API response
const securityHeaders = [
  // Nobody may show the site inside a frame (stops clickjacking on the admin buttons)
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links to other sites get only the origin, never a URL with a booking token
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Dynamic pages already visited are kept for 30 s in the browser, so going
    // back and forth (e.g. the client area's tabs) is instant. Server actions
    // and router.refresh() still update them.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
