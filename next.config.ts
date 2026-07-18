import type { NextConfig } from "next";

// Security headers applied to every response. These protect against common
// web attacks (clickjacking, MIME sniffing, protocol downgrade, referrer leaks).
const securityHeaders = [
  // Prevent the site from being embedded in an iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing a response away from the declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin as referrer to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS. Kept moderate (no preload/includeSubDomains) so a cert hiccup
  // doesn't hard-block users. Once the domain cert is stable you can raise this.
  { key: "Strict-Transport-Security", value: "max-age=86400" },
  // Lock down powerful browser features we don't use.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Belt and braces for the admin surface: tell every crawler and proxy to
        // neither index nor store it, no matter what the page metadata says.
        source: "/control/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/control",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        // API responses must never be cached by a shared proxy.
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
