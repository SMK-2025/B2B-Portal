"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { portalRequest } from "../lib/portal-api";
type Quote = {
  networkName: string;
  monthlyNetCents: number;
  annualNetCents: number;
  vatCents: number;
  grossCents: number;
  initiator: boolean;
};
const money = (n: number) =>
  (n / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export function MemberAnnualRegistrationFields({
  invite,
  loading,
}: {
  invite: string;
  loading: boolean;
}) {
  const [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState("");
  function load() {
    setError("");
    setQuote(null);
    portalRequest<Quote>("/networks/invitations/quote", { body: { invite } })
      .then(setQuote)
      .catch((e) => setError(e.message));
  }
  useEffect(load, [invite]);
  if (!quote)
    return (
      <div className="full">
        <p role="status">
          {error || "Verbindlicher Mitgliedspreis wird geladen …"}
        </p>
        {error && (
          <button type="button" onClick={load}>
            Preis erneut laden
          </button>
        )}
      </div>
    );
  if (quote.initiator)
    return (
      <p>
        Initiatoren verwalten das Partnernetzwerk kostenlos. Bitte melden Sie
        sich über Ihren Initiatorzugang an.
      </p>
    );
  return (
    <>
      <div className="full pricingClarity">
        <h2>Ihre Jahresmitgliedschaft bei {quote.networkName}</h2>
        <p>Alle Portal-Funktionen für Ihren persönlichen Partnerzugang.</p>
        <p>
          <b>{money(quote.monthlyNetCents)} netto pro Monat × 12 Monate</b>
        </p>
        <p>
          Jahresbeitrag netto: {money(quote.annualNetCents)}
          <br />
          19 % MwSt.: {money(quote.vatCents)}
          <br />
          <strong>Gesamtbetrag im Voraus: {money(quote.grossCents)}</strong>
        </p>
        <p>
          Laufzeit: zwölf Monate ab dieser Buchung. Ihr Zugang wird sofort
          freigeschaltet. Die Jahresrechnung wird anschließend manuell an Ihre
          Rechnungsadresse versendet; keine Online-Abbuchung. Keine automatische
          Verlängerung.
        </p>
      </div>
      <input
        type="hidden"
        name="acceptedMonthlyNetCents"
        value={quote.monthlyNetCents}
      />
      <h2 className="full">Rechnungsdaten</h2>
      <label className="full">
        Ansprechpartner für die Rechnung
        <input
          name="invoiceContact"
          required
          maxLength={160}
          autoComplete="name"
        />
      </label>
      <label className="full">
        Rechnungs-E-Mail
        <input
          name="invoiceEmail"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label className="full">
        Straße und Hausnummer
        <input
          name="invoiceStreet"
          required
          maxLength={200}
          autoComplete="street-address"
        />
      </label>
      <label>
        Postleitzahl
        <input
          name="invoicePostalCode"
          required
          maxLength={20}
          autoComplete="postal-code"
        />
      </label>
      <label>
        Ort
        <input
          name="invoiceCity"
          required
          maxLength={120}
          autoComplete="address-level2"
        />
      </label>
      <label className="full">
        Land
        <input
          name="invoiceCountry"
          required
          defaultValue="Deutschland"
          maxLength={100}
          autoComplete="country-name"
        />
      </label>
      <label className="full">
        USt-IdNr. (falls vorhanden)
        <input name="invoiceVatId" maxLength={50} />
      </label>
      <label className="full">
        Bestell- oder Rechnungsreferenz (optional)
        <input name="purchaseOrderReference" maxLength={120} />
      </label>
      <label className="full memberAnnualConsent">
        <input type="checkbox" name="authorityConfirmed" required />
        <span>
          Ich handle als Unternehmer und bin berechtigt, diese
          Jahresmitgliedschaft für das angegebene Unternehmen zu buchen.
        </span>
      </label>
      <label className="full memberAnnualConsent">
        <input type="checkbox" name="termsAccepted" required />
        <span>
          Ich akzeptiere die{" "}
          <Link href="/agb" target="_blank">
            Vertragsbedingungen
          </Link>{" "}
          sowie die oben dargestellte zwölfmonatige Laufzeit.
        </span>
      </label>
      <label className="full memberAnnualConsent">
        <input type="checkbox" name="paymentObligationAccepted" required />
        <span>
          Ich buche verbindlich für insgesamt {money(quote.grossCents)}{" "}
          inklusive 19 % MwSt. für zwölf Monate im Voraus. Die Zahlungspflicht
          besteht auch bei sofortiger Freischaltung.
        </span>
      </label>
      <button className="primary full" disabled={loading}>
        {loading
          ? "Jahresmitgliedschaft wird angelegt …"
          : "Zahlungspflichtige Jahresmitgliedschaft buchen"}
      </button>
    </>
  );
}
