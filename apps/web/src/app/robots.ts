import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2bmatching.de";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/", "/api/"] }, sitemap: `${base}/sitemap.xml`, host: base };
}
