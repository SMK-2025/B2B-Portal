"use client";
import { useEffect, useState } from "react";
import { portalRequest } from "../lib/portal-api";
import {
  LaunchPromotionNotice,
  type LaunchPromotion,
} from "./launch-promotion-notice";
export type CityMembershipOffer = {
  contribution?: {minimumMonthlyNetCents: number};
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
  initialOffer,
}: {
  requestHref: string;
  networkSlug?: string;
  formal?: boolean;
  initialOffer?: CityMembershipOffer | null;
}) {
  const [offer, setOffer] = useState<CityMembershipOffer | null>(initialOffer || null),
    [error, setError] = useState(false);
  useEffect(() => {
    if(initialOffer) {setOffer(initialOffer);return;}
    let current = true;
    void portalRequest<CityMembershipOffer>(
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
  }, [networkSlug,initialOffer]);
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
                <strong>{offer.contribution ? "Ab " : ""}{money(offer.monthlyNetCents)}</strong>
                <span>netto pro Monat · zzgl. {offer.vatPercent} % MwSt.</span>
              </p>
              {offer.contribution && <p>Was ist Ihnen Ihr Unternehmernetzwerk wert? Sie bestimmen Ihren Monatsbeitrag selbst – ab {money(offer.contribution.minimumMonthlyNetCents)} netto. Alle Mitglieder nutzen dieselben Funktionen. Mit einem höheren Beitrag unterstützen Sie zusätzliche B2B-Kampagnen für genau dieses Stadtnetzwerk. Eine bestimmte Zahl neuer Kontakte oder Aufträge können wir nicht versprechen.</p>}
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
                  <dt>{offer.contribution ? "Gesamtbetrag beim Mindestbeitrag" : "Gesamtbetrag"}</dt>
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
