import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "B2B Matching – Partnerportal für Netzwerke",
    short_name: "B2B Matching",
    description: "Das geschlossene Partnerportal für starke Netzwerke und bessere Zusammenarbeit.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fffaf0",
    theme_color: "#123b3a",
    categories: ["business", "productivity"],
    lang: "de-DE",
    icons: [
      { src: "/icons/b2b-matching-symbol-brand.png", sizes: "1565x1341", type: "image/png", purpose: "any" },
      { src: "/icons/b2b-matching-symbol-brand.png", sizes: "1565x1341", type: "image/png", purpose: "maskable" }
    ]
  };
}
