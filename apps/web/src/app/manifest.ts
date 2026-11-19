import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "B2B Matching – Unternehmernetzwerke",
    short_name: "B2B Matching",
    description: "Unternehmen entdecken, Geschäftskontakte knüpfen und im eigenen Netzwerk ins Gespräch kommen.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#536bdb",
    prefer_related_applications: false,
    categories: ["business", "productivity"],
    lang: "de-DE",
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
