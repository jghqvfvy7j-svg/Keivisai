import type { MetadataRoute } from "next";

const BASE = "https://gymtrackpro.xyz";

// Public pages only. Private routes (/control, /home, /coach, ...) are never
// listed: a sitemap is a public document and should not advertise them.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
