import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  return [
    ["", "weekly", 1], ["/loesungen/wirtschaftsnetzwerke", "monthly", .9], ["/loesungen/verbaende", "monthly", .9],
    ["/loesungen/sport-und-sponsorennetzwerke", "monthly", .9], ["/impressum", "yearly", .3], ["/agb", "yearly", .3],
    ["/datenschutz/unternehmen", "yearly", .3], ["/cookies", "yearly", .3], ["/barrierefreiheit", "yearly", .3]
  ].map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency, priority })) as MetadataRoute.Sitemap;
}
