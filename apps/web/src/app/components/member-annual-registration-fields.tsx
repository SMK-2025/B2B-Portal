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
  memberPaymentModel?: "individual" | "network";
};
const money = (n: number) =>
  (n / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export function MemberAnnualRegistrationFields({
  invite,
  loading,
  summaryOnly = false,
  onContinue,
  priceOnly = false,
  hidePrice = false,
  onPaymentModel,
}: {
  invite: string;
  loading: boolean;
  summaryOnly?: boolean;
  onContinue?: () => void;
  priceOnly?: boolean;
  hidePrice?: boolean;
  onPaymentModel?: (model: "individual" | "network") => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState("");
  function load() {
    setError("");
    setQuote(null);
    portalRequest<Quote>("/networks/invitations/quote", { body: { invite } })
      .then((value) => {
        setQuote(value);
        onPaymentModel?.(value.memberPaymentModel || "individual");
      })
      .catch((e) => setError(e.message));
  }
  useEffect(load, [invite]);
  if (!quote)
    return (
      <div className="full">
        <p role="status">{error || "Einladung wird geprüft …"}</p>
        {error && (
          <button type="button" onClick={load}>
            Einladung erneut prüfen
          </button>
        )}
      </div>
    );
  if (quote.initiator)
    return (
      <div>
        <p>
          Initiatoren verwalten das Partnernetzwerk kostenlos. Bitte melden Sie
          sich mit Ihrem persönlichen Zugang an oder erstellen Sie ihn jetzt.
        </p>
        {onContinue && (
          <button type="button" className="primary wide" onClick={onContinue}>
            Weiter zum Zugang
          </button>
        )}
      </div>
    );
  if (quote.memberPaymentModel === "network") {
    if (priceOnly)
      return (
        <div>
          <h2>Dein Unternehmen im Netzwerk</h2>
          <p>
            Lerne andere Partner kennen, präsentiere dein Unternehmen und komme
            direkt ins Gespräch.
          </p>
        </div>
      );
    if (summaryOnly)
      return (
        <div className="full">
          <p>
            Deine persönliche Einladung zu {quote.networkName}. Erstelle deinen
            Zugang und werde Teil unseres Business-Netzwerks.
          </p>
          {onContinue && (
            <button type="button" className="primary wide" onClick={onContinue}>
              Weiter · Zugang erstellen
            </button>
          )}
        </div>
      );
    return (
      <>
        <label className="full memberAnnualConsent">
          <input type="checkbox" name="termsAccepted" required />
          <span>
            Ich akzeptiere die{" "}
            <Link href="/agb" target="_blank">
              Nutzungsbedingungen
            </Link>
            .
          </span>
        </label>
        <button className="primary full" disabled={loading}>
          {loading ? "Zugang wird eingerichtet …" : "Registrierung abschließen"}
        </button>
      </>
    );
  }
  if (summaryOnly)
    return (
      <div className="full registrationPriceStep">
        <p className="registrationPortalPurpose">
          Dein Zugang zum unabhängigen Business- und Partnerportal im Umfeld von{" "}
          {quote.networkName}.
        </p>
        <dl className="registrationPriceList">
          <div>
            <dt>Portalnutzung · alle Funktionen</dt>
            <dd>{money(quote.monthlyNetCents)} netto / Monat</dd>
          </div>
          <div>
            <dt>12 Monate netto</dt>
            <dd>{money(quote.annualNetCents)}</dd>
          </div>
          <div>
            <dt>19 % MwSt.</dt>
            <dd>{money(quote.vatCents)}</dd>
          </div>
          <div className="registrationPriceTotal">
            <dt>Jahresbetrag im Voraus</dt>
            <dd>{money(quote.grossCents)}</dd>
          </div>
        </dl>
        <p className="registrationPriceTerms">
          Separate Rechnung · keine Online-Abbuchung · keine automatische
          Verlängerung
        </p>
        {onContinue && (
          <form
            className="formGrid"
            onSubmit={(event) => {
              event.preventDefault();
              onContinue();
            }}
          >
            <label className="full legalConsent">
              <input type="checkbox" required name="priceUnderstood" />
              <span>
                Ich bestätige die Preisangaben verbindlich und möchte am
                Online-Netzwerken teilnehmen.
              </span>
            </label>
            <small className="full">
              Bereitgestellt von der Media Online Innovations Group. Die
              Jahresbuchung schließt du nach der E-Mail-Bestätigung mit deinen
              Rechnungsdaten ab.
            </small>
            <button className="primary full" type="submit">
              Weiter · Zugang erstellen
            </button>
          </form>
        )}
      </div>
    );
  const price = (
    <div className="full pricingClarity">
      <h2>Deine Portalnutzung für {quote.networkName}</h2>
      <p>Alle Funktionen für deinen persönlichen Partnerzugang.</p>
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
        Zwölf Monate ab Buchung, sofortiger Zugang. Die Jahresrechnung erhältst
        du separat. Keine Online-Abbuchung, keine automatische Verlängerung.
      </p>
    </div>
  );
  if (priceOnly) return price;
  return (
    <>
      {!hidePrice && price}
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
