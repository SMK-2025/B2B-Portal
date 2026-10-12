import type { Metadata } from "next";
export const shareImage = { url: "/markenbild", width: 1200, height: 630, alt: "B2B Matching – Partnerportal für Netzwerke mit dem Schmetterling als Markenicon" };
export function publicMetadata(title: string, description: string, canonical: string): Metadata {
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website", locale: "de_DE", siteName: "B2B Matching", images: [shareImage] }, twitter: { card: "summary_large_image", title, description, images: ["/markenbild"] } };
}
