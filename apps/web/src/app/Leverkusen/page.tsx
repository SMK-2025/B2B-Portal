import { CityLanding } from "../components/city-landing";
import type { Metadata } from "next";

const title = "Unternehmernetzwerk Leverkusen | Unternehmen finden & vernetzen";
const description =
  "Unternehmen in Leverkusen kennenlernen, Leistungen entdecken und Geschäftskontakte aufbauen. Ihr digitales B2B-Netzwerk mit Unternehmensprofil, Chat und lokalen Treffen.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/Leverkusen" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "B2B Matching",
    title,
    description,
    url: "/Leverkusen",
    images: [
      {
        url: "/images/leverkusen-network-blue-hour-v2.webp",
        width: 2172,
        height: 724,
        alt: "KI-generierte Bildmontage: Unternehmer im Gespräch vor der Leverkusener Stadtkulisse mit Wasserturm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/leverkusen-network-blue-hour-v2.webp"],
  },
};

export default function Page() {
  return (
    <CityLanding
      city="Leverkusen"
      slug="unternehmernetzwerkleverkusen"
      route="/Leverkusen"
      image="/images/leverkusen-network-blue-hour-v2.webp"
      primary="#0723f2"
      districts={[
        "Opladen",
        "Wiesdorf",
        "Schlebusch",
        "Bürrig",
        "Küppersteg",
        "Rheindorf",
        "Hitdorf",
        "Manfort",
        "Lützenkirchen",
        "Quettingen",
        "Steinbüchel",
        "Alkenrath",
        "Bergisch Neukirchen",
      ]}
    />
  );
}
