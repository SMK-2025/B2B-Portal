import { CityLanding } from "../components/city-landing";
import type { Metadata } from "next";

const title = "Unternehmernetzwerk Köln | Unternehmen finden & vernetzen";
const description =
  "Unternehmen in Köln kennenlernen, Leistungen entdecken und Geschäftskontakte aufbauen. Ihr digitales B2B-Netzwerk mit Unternehmensprofil, Chat und lokalen Treffen.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/Koeln" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "B2B Matching",
    title,
    description,
    url: "/Koeln",
    images: [
      {
        url: "/images/koeln-network-blue-hour.webp",
        width: 2172,
        height: 724,
        alt: "KI-generierte Bildmontage: Unternehmer im Gespräch vor der Kölner Stadtkulisse mit Dom und Rhein",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/koeln-network-blue-hour.webp"],
  },
};

export default function Page() {
  return (
    <CityLanding
      city="Köln"
      slug="unternehmernetzwerkkoeln"
      route="/Koeln"
      image="/images/koeln-network-blue-hour.webp"
      primary="#c8102e"
      districts={[
        "Ehrenfeld",
        "Mülheim",
        "Innenstadt",
        "Rodenkirchen",
        "Lindenthal",
        "Nippes",
        "Chorweiler",
        "Porz",
        "Kalk",
      ]}
    />
  );
}
