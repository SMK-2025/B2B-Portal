"use client";
import { useEffect, useState } from "react";
import { portalRequest } from "../lib/portal-api";
type Offer = {
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
export function LeverkusenOffer({ requestHref }: { requestHref: string }) {
  const [offer, setOffer] = useState<Offer | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let current = true;
    void portalRequest<Offer>(
      "/networks/participation/quote/unternehmernetzwerkleverkusen",
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
  }, []);
  return (
    <aside className="levOffer" aria-label="Aktuelle Teilnahmebedingungen">
      <span className="levEyebrow">DEINE NETZWERKTEILNAHME</span>
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
              ? "Die aktuellen Konditionen siehst du im Anmeldeprozess. Hier werden bewusst keine möglicherweise veralteten Preise angezeigt."
              : "Aktuelle Konditionen werden aus dem Netzwerk geladen …"}
          </p>
        )}
      </div>
      <ul>
        <li>Eigene Unternehmensseite</li>
        <li>Mitgliederverzeichnis & Vernetzung</li>
        <li>PartnerChat, Angebote & Gesuche</li>
        <li>Schwarzes Brett & Veranstaltungen</li>
      </ul>
      <a className="levPrimary" href={requestHref}>
        Teilnahme anfragen <span aria-hidden="true">↗</span>
      </a>
      <small>
        Die Anfrage allein löst noch keine Rechnung aus. Nach Freigabe
        bestätigst du die Buchung mit deinen Rechnungsangaben. Maßgeblich sind
        die dann angezeigten Konditionen.
      </small>
    </aside>
  );
}
