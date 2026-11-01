"use client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { portalRequest } from "../lib/portal-api";

export type NetworkBrand = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  websiteUrl: string | null;
};
export function useNetworkBrand(slug: string) {
  const [brand, setBrand] = useState<NetworkBrand | null>(null);
  useEffect(() => {
    let active = true;
    setBrand(null);
    if (!slug) return;
    portalRequest<NetworkBrand>(
      `/networks/branding/${encodeURIComponent(slug)}`,
    )
      .then((value) => {
        if (active) setBrand(value);
      })
      .catch(() => {
        if (active) setBrand(null);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  return brand;
}
export function NetworkAuthFrame({
  brand,
  children,
  kind,
}: {
  brand: NetworkBrand;
  children: ReactNode;
  kind: "login" | "register";
}) {
  const style = {
    "--auth-primary": brand.primaryColor,
    "--auth-secondary": brand.secondaryColor,
  } as CSSProperties;
  return (
    <main className="networkAuthPortal" style={style}>
      <header>
        <Link
          href={`/anmelden?network=${encodeURIComponent(brand.slug)}` as never}
        >
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={`${brand.name} Logo`} />
          ) : (
            <span>{brand.name.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
            <b>{brand.slug === "bayer04leverkusen" ? "Das Netzwerkpartner-Portal" : brand.name}</b>
            <small>{brand.slug === "bayer04leverkusen" ? "der Media Online Innovations Group" : "Geschütztes Partnerportal"}</small>
          </div>
        </Link>
        <em>Sicherer Netzwerkzugang</em>
      </header>
      <section>
        <aside>
          <span>
            {brand.slug === "bayer04leverkusen" ? "UNABHÄNGIG. INHABERGEFÜHRT. PERSÖNLICH." : kind === "login" ? "WILLKOMMEN ZURÜCK" : "PERSÖNLICHE EINLADUNG"}
          </span>
          <h1>
            {brand.slug === "bayer04leverkusen" ? "Gemeinsam mehr erreichen. Persönlich verbunden." : kind === "login"
              ? `Willkommen bei ${brand.name}.`
              : `Ihr Zugang zu ${brand.name}.`}
          </h1>
          <p>
            {brand.slug === "bayer04leverkusen" ? "Lerne Menschen und Unternehmen aus deinem Business-Netzwerk kennen, entdecke Angebote und Leistungen und komm direkt ins Gespräch – auch zwischen den gemeinsamen Treffen." : kind === "login"
              ? "Informationen, Kontakte, Veranstaltungen und Zusammenarbeit in Ihrem geschlossenen Partnernetzwerk."
              : "Richten Sie Ihren persönlichen Zugang ein. Ihre Daten und Unternehmensseite bleiben ausschließlich innerhalb dieses Netzwerks sichtbar."}
          </p>
          <ul>
            <li>Geschlossener, mandantengetrennter Bereich</li>
            <li>Zugang ausschließlich für eingeladene Partner</li>
            <li>Branding und Inhalte durch die Netzwerkleitung</li>
          </ul>
        </aside>
        <div>{children}</div>
      </section>
      <footer>
        <span>
          © {new Date().getFullYear()} Media Online Innovations Group
        </span>
        <span>Technisch bereitgestellt durch B2B Matching</span>
      </footer>
    </main>
  );
}
