"use client";
import { NetworkText } from "./network-text-editor";
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
            <b>
              <NetworkText id="ui.portal.name">
                {brand.slug === "bayer04leverkusen"
                  ? "Das Netzwerkpartner-Portal"
                  : brand.name}
              </NetworkText>
            </b>
            <small>
              <NetworkText id="ui.portal.auth-subtitle">
                {brand.slug === "bayer04leverkusen"
                  ? "der Media Online Innovations Group"
                  : "Geschütztes Partnerportal"}
              </NetworkText>
            </small>
          </div>
        </Link>
        <em>
          <NetworkText id="ui.network-auth-brand.205e3f1b301d05a9">
            Sicherer Netzwerkzugang
          </NetworkText>
        </em>
      </header>
      <section>
        <aside>
          <span>
            <NetworkText id="ui.network-auth-brand.991237e087602f5f">
              {brand.slug === "bayer04leverkusen"
                ? "UNABHÄNGIG. INHABERGEFÜHRT. PERSÖNLICH."
                : kind === "login"
                  ? "WILLKOMMEN ZURÜCK"
                  : "PERSÖNLICHE EINLADUNG"}
            </NetworkText>
          </span>
          <h1>
            <NetworkText id="ui.auth.story-title">
              {brand.slug === "bayer04leverkusen"
                ? "Gemeinsam mehr erreichen. Persönlich verbunden."
                : kind === "login"
                  ? `Willkommen bei ${brand.name}.`
                  : `Ihr Zugang zu ${brand.name}.`}
            </NetworkText>
          </h1>
          <p>
            <NetworkText id="ui.network-auth-brand.55e0aed50678fa96">
              {brand.slug === "bayer04leverkusen"
                ? "Lerne Menschen und Unternehmen aus deinem Business-Netzwerk kennen, entdecke Angebote und Leistungen und komm direkt ins Gespräch – auch zwischen den gemeinsamen Treffen."
                : kind === "login"
                  ? "Informationen, Kontakte, Veranstaltungen und Zusammenarbeit in Ihrem geschlossenen Partnernetzwerk."
                  : "Richten Sie Ihren persönlichen Zugang ein. Ihre Daten und Unternehmensseite bleiben ausschließlich innerhalb dieses Netzwerks sichtbar."}
            </NetworkText>
          </p>
          <ul>
            <li>
              <NetworkText id="ui.network-auth-brand.18829b80e14f8eb8">
                Geschlossener, mandantengetrennter Bereich
              </NetworkText>
            </li>
            <li>
              <NetworkText id="ui.network-auth-brand.8bbb4e6a4aea6a68">
                Zugang ausschließlich für eingeladene Partner
              </NetworkText>
            </li>
            <li>
              <NetworkText id="ui.network-auth-brand.bc9e2d089b60d276">
                Branding und Inhalte durch die Netzwerkleitung
              </NetworkText>
            </li>
          </ul>
        </aside>
        <div>{children}</div>
      </section>
      <footer>
        <span>
          © {new Date().getFullYear()}
          <NetworkText id="ui.network-auth-brand.30249e90338cc672">
            Media Online Innovations Group
          </NetworkText>
        </span>
        <span>
          <NetworkText id="ui.network-auth-brand.e1c55cbbdf944382">
            Technisch bereitgestellt durch B2B Matching
          </NetworkText>
        </span>
      </footer>
    </main>
  );
}
