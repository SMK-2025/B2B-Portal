import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  return [
    ["", "weekly", 1], ["/loesungen", "monthly", .95], ["/funktionen", "monthly", .9], ["/so-funktionierts", "monthly", .8], ["/sicherheit", "monthly", .8],
    ["/loesungen/wirtschaftsnetzwerke", "monthly", .9], ["/loesungen/verbaende", "monthly", .9], ["/loesungen/sport-und-sponsorennetzwerke", "monthly", .9],
    ["/loesungen/franchise-und-verbundgruppen", "monthly", .9], ["/loesungen/standort-und-wirtschaftsfoerderung", "monthly", .9],
    ["/loesungen/businessclubs-und-empfehlungsnetzwerke", "monthly", .9], ["/loesungen/partnerprogramme-und-oekosysteme", "monthly", .9],
    ["/impressum", "yearly", .3], ["/agb", "yearly", .3],
    ["/datenschutz/unternehmen", "yearly", .3], ["/cookies", "yearly", .3], ["/barrierefreiheit", "yearly", .3]
  ].map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency, priority })) as MetadataRoute.Sitemap;
}
