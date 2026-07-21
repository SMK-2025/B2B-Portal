import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  return [
    ["", "weekly", 1], ["/unternehmen", "monthly", .9], ["/dienstleister", "monthly", .9], ["/netzwerke", "monthly", .9],
    ["/so-funktionierts", "monthly", .8], ["/sicherheit", "monthly", .8], ["/registrieren", "monthly", .8],
    ["/impressum", "yearly", .3], ["/agb", "yearly", .3], ["/datenschutz/unternehmen", "yearly", .3],
    ["/datenschutz/dienstleister", "yearly", .3], ["/cookies", "yearly", .3], ["/barrierefreiheit", "yearly", .3]
  ].map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency, priority })) as MetadataRoute.Sitemap;
}
