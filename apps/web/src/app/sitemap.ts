import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2bmatching.de";
  return [
    ["", "weekly", 1], ["/unternehmen", "monthly", .9], ["/dienstleister", "monthly", .9],
    ["/so-funktionierts", "monthly", .8], ["/sicherheit", "monthly", .8], ["/registrieren", "monthly", .8]
  ].map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency, priority })) as MetadataRoute.Sitemap;
}
