import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import "./network-brand-overrides.css";
import { PwaRegister } from "./pwa-register";
import { CookieConsent } from "./components/cookie-consent";
import { AccessibilityRuntime } from "./components/accessibility-runtime";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Partnerportal für Netzwerke – Mitglieder verbinden | B2B Matching", template: "%s | B2B Matching" },
  description: "Das geschlossene Partnerportal für Wirtschaftsnetzwerke, Verbände, Sportvereine und Partnerprogramme: Mitglieder verbinden, Kommunikation fördern und Kooperationen erleichtern.",
  keywords: ["Partnerportal", "Netzwerk Plattform", "Mitgliederportal", "Unternehmensnetzwerk Software", "Verbandssoftware", "Sponsoren Netzwerk", "White Label Community Plattform", "B2B Netzwerk digitalisieren"],
  authors: [{ name: "B2B Matching" }], creator: "B2B Matching", publisher: "B2B Matching",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "de_DE", url: siteUrl, siteName: "B2B Matching", title: "Das Partnerportal für starke Netzwerke", description: "Geschlossene, individuell gebrandete Partnerportale für bessere Kommunikation, kürzere Kennenlernphasen und mehr Zusammenarbeit." },
  twitter: { card: "summary_large_image", title: "Das Partnerportal für starke Netzwerke", description: "Mitglieder verbinden, Kommunikation fördern und Kooperationen erleichtern." },
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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbfaf7" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de"><body><a className="skipLink" href="#main-content">Zum Hauptinhalt springen</a><PwaRegister/><AccessibilityRuntime/><div id="main-content" tabIndex={-1}>{children}</div><CookieConsent/></body></html>;
}
