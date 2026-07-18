import type { MetadataRoute } from "next";

// Keep every private surface out of search engines. The admin panel, the API and
// the auth callback should never be crawled or indexed. This is not a security
// control on its own (the server still checks auth on every request), it just
// stops these URLs from showing up in search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/terms", "/privacy", "/support"],
        disallow: [
          "/control",
          "/api/",
          "/auth/",
          "/home",
          "/coach",
          "/nutrition",
          "/progress",
          "/profile",
          "/workouts",
          "/session",
          "/body",
        ],
      },
    ],
    sitemap: "https://gymtrackpro.xyz/sitemap.xml",
  };
}
