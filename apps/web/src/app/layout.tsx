import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import "./network-brand-overrides.css";
import "./public-brand.css";
import "./public-card-system.css";
import { PwaRegister } from "./pwa-register";
import { CookieConsent } from "./components/cookie-consent";
import { AccessibilityRuntime } from "./components/accessibility-runtime";
import { PublicCardArtwork } from "./components/public-card-artwork";
import { shareImage } from "./components/public-metadata";
import { PublicNavigation } from "./components/public-navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Partnerportal für Netzwerke – B2B Matching", template: "%s | B2B Matching" },
  description: "Das geschlossene White-Label Partnerportal für Wirtschaftsnetzwerke, Verbände, Sportvereine, Verbundgruppen, Standortinitiativen und Partnerprogramme.",
  keywords: ["Partnerportal", "Netzwerk Plattform", "Mitgliederportal", "Unternehmensnetzwerk Software", "Verbandssoftware", "Sponsoren Netzwerk", "Franchise Portal", "Wirtschaftsförderung Netzwerk", "Business Club Software", "Partnerprogramm Plattform", "White Label Community Plattform", "B2B Netzwerk digitalisieren"],
  authors: [{ name: "B2B Matching" }], creator: "B2B Matching", publisher: "B2B Matching",
  openGraph: { type: "website", locale: "de_DE", url: siteUrl, siteName: "B2B Matching", title: "Partnerportal für Netzwerke", description: "Geschlossene, individuell gebrandete Partnerportale für bessere Kommunikation, kürzere Kennenlernphasen und mehr Zusammenarbeit.", images:[shareImage] },
  twitter: { card: "summary_large_image", title: "Partnerportal für Netzwerke", description: "Mitglieder verbinden, Kommunikation fördern und Kooperationen erleichtern.",images:["/markenbild"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  category: "business"
  ,manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/b2b-matching-symbol-brand.png", type: "image/png" }],
    shortcut: "/icons/b2b-matching-symbol-brand.png",
    apple: "/icons/b2b-matching-symbol-brand.png"
  },
  appleWebApp: { capable: true, title: "B2B Matching", statusBarStyle: "black-translucent" },
  applicationName: "B2B Matching"
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7473ed" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de"><body><a className="skipLink" href="#main-content">Zum Hauptinhalt springen</a><PwaRegister/><AccessibilityRuntime/><div id="main-content" tabIndex={-1}>{children}</div><PublicCardArtwork/><PublicNavigation/><CookieConsent/></body></html>;
}
