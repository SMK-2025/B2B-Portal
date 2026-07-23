import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "B2B Matching – Bedarf trifft Kompetenz",
    short_name: "B2B Matching",
    description: "Das geschützte Netzwerk für passende B2B-Kooperationen.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f5f7",
    theme_color: "#102c42",
    categories: ["business", "productivity"],
    lang: "de-DE",
    icons: [
      { src: "/icons/b2b-matching-symbol.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/b2b-matching-symbol.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
