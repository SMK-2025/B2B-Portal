"use client";
import { useEffect, useState } from "react";
import { portalRequest } from "../lib/portal-api";
import {
  LaunchPromotionNotice,
  type LaunchPromotion,
} from "./launch-promotion-notice";
type Offer = {
  launchPromotion?: LaunchPromotion | null;
  monthlyNetCents: number;
  annualNetCents: number;
  vatCents: number;
  grossCents: number;
  months: number;
  vatPercent: number;
  centrallyFunded: boolean;
  billing?: {
    freeUntil?: string | null;
    paidFrom?: string | null;
    paidThrough?: string | null;
    autoRenew?: boolean;
  };
};
const money = (c: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    c / 100,
  );
const date = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("de-DE");
export function LeverkusenOffer({
  requestHref,
  networkSlug = "unternehmernetzwerkleverkusen",
  formal = false,
}: {
  requestHref: string;
  networkSlug?: string;
  formal?: boolean;
}) {
  const [offer, setOffer] = useState<Offer | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let current = true;
    void portalRequest<Offer>(
      `/networks/participation/quote/${encodeURIComponent(networkSlug)}`,
    )
      .then((o) => {
        if (current) setOffer(o);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [networkSlug]);
  return (
    <aside className="levOffer" aria-label="Aktuelle Teilnahmebedingungen">
      <span className="levEyebrow">
        {formal ? "IHRE NETZWERKTEILNAHME" : "DEINE NETZWERKTEILNAHME"}
      </span>
      <h3>
        Alle Verbindungen.
        <br />
        Ein zentraler Zugang.
      </h3>
      <div aria-live="polite">
        {offer ? (
          offer.centrallyFunded ? (
            <p className="levOfferPrice">
              Für Mitglieder
              <br />
              <strong>zentral finanziert.</strong>
            </p>
          ) : (
            <>
              <LaunchPromotionNotice
                promotion={offer.launchPromotion}
                monthlyNetCents={offer.monthlyNetCents}
                formal={formal}
              />
              <p className="levOfferPrice">
                <strong>{money(offer.monthlyNetCents)}</strong>
                <span>netto pro Monat · zzgl. {offer.vatPercent} % MwSt.</span>
              </p>
              <dl>
                <div>
                  <dt>Laufzeit</dt>
                  <dd>{offer.months} Monate</dd>
                </div>
                <div>
                  <dt>{offer.months} Monate netto</dt>
                  <dd>{money(offer.annualNetCents)}</dd>
                </div>
                <div>
                  <dt>{offer.vatPercent} % MwSt.</dt>
                  <dd>{money(offer.vatCents)}</dd>
                </div>
                <div className="levOfferTotal">
                  <dt>Gesamtbetrag</dt>
                  <dd>{money(offer.grossCents)}</dd>
                </div>
              </dl>
              {offer.billing?.freeUntil && (
                <p>Kostenlos bis {date(offer.billing.freeUntil)}.</p>
              )}
              {offer.billing?.paidFrom && offer.billing?.paidThrough && (
                <p>
                  Entgeltlicher Zeitraum: {date(offer.billing.paidFrom)} bis{" "}
                  {date(offer.billing.paidThrough)}.
                </p>
              )}
            </>
          )
        ) : (
          <p>
            {error
              ? formal
                ? "Die aktuellen Konditionen sehen Sie im Anmeldeprozess."
                : "Die aktuellen Konditionen siehst du im Anmeldeprozess. Hier werden bewusst keine möglicherweise veralteten Preise angezeigt."
              : "Aktuelle Konditionen werden aus dem Netzwerk geladen …"}
          </p>
        )}
      </div>
      <ul>
        <li>Eigene Unternehmensseite</li>
        <li>Mitgliederverzeichnis & Vernetzung</li>
        <li>Mitglieder-Chat, Angebote & Gesuche</li>
        <li>Schwarzes Brett & Veranstaltungen</li>
      </ul>
      <a className="levPrimary" href={requestHref}>
        Teilnahme anfragen <span aria-hidden="true">↗</span>
      </a>
      <small>
        {formal
          ? "Die Anfrage allein löst noch keine Rechnung aus. Nach Freigabe bestätigen Sie die Buchung mit Ihren Rechnungsangaben. Maßgeblich sind die dann angezeigten Konditionen."
          : "Die Anfrage allein löst noch keine Rechnung aus. Nach Freigabe bestätigst du die Buchung mit deinen Rechnungsangaben. Maßgeblich sind die dann angezeigten Konditionen."}
      </small>
    </aside>
  );
}
