import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import { PwaRegister } from "./pwa-register";
import { CookieConsent } from "./components/cookie-consent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "B2B Matching – Vertraulich passende Dienstleister finden", template: "%s | B2B Matching" },
  description: "Finden Sie qualitätsgeprüfte B2B-Dienstleister passend zu Ihrem Bedarf. Vertraulich, intelligent gematcht und von Ihnen kontrolliert.",
  keywords: ["B2B Dienstleister", "Dienstleister finden", "B2B Matching", "Unternehmensnetzwerk", "Dienstleister Deutschland", "Geschäftspartner finden", "vertrauliche Bedarfssuche"],
  authors: [{ name: "B2B Matching" }], creator: "B2B Matching", publisher: "B2B Matching",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "de_DE", url: siteUrl, siteName: "B2B Matching", title: "Bedarf trifft Kompetenz.", description: "Das geschützte Unternehmensnetzwerk für vertrauliche Bedarfe und qualitätsgeprüfte B2B-Dienstleister." },
  twitter: { card: "summary_large_image", title: "B2B Matching – Bedarf trifft Kompetenz", description: "Vertrauliche Bedarfssuche, qualitätsgeprüfte Anbieter und intelligentes Matching." },
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
  return <html lang="de"><body><a className="skipLink" href="#main-content">Zum Hauptinhalt springen</a><PwaRegister/><div id="main-content" tabIndex={-1}>{children}</div><CookieConsent/></body></html>;
}
