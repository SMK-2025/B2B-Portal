"use client";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { portalRequest } from "../lib/portal-api";
import "./network-participation-request.css";
type Offer = {
  version: string;
  monthlyNetCents: number;
  annualNetCents: number;
  vatCents: number;
  grossCents: number;
  months: number;
  vatPercent: number;
  centrallyFunded: boolean;
  billing: null | {
    freeUntil?: string;
    paidFrom?: string;
    paidThrough?: string;
    autoRenew?: boolean;
    renewalMonths?: number;
  };
  schedule: null | { invoiceDate: string; paymentDueDate: string };
  renewalDeadline: string | null;
};
const money = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
const date = (value?: string) =>
  value ? value.split("-").reverse().join(".") : "–";
export function NetworkParticipationRequest({network}:{network:string}) {
  const local = network === "unternehmernetzwerk-leverkusen";
  const [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null),
    [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    company: "",
    affiliation: "",
    email: "",
    password: "",
  });
  const [accurate, setAccurate] = useState(false);
  const [consents, setConsents] = useState({
    costsAccepted: false,
    termsAccepted: false,
    privacyAcknowledged: false,
  });
  async function loadOffer() {
    setLoading(true);
    setError("");
    setOffer(null);
    setConsents({
      costsAccepted: false,
      termsAccepted: false,
      privacyAcknowledged: false,
    });
    try {
      setOffer(
        await portalRequest<Offer>(
          `/networks/participation/quote/${encodeURIComponent(network)}`,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kosten konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (step === 3) void loadOffer();
  }, [step]);
  function field(name: keyof typeof fields) {
    return {
      value: fields[name],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFields((old) => ({ ...old, [name]: e.target.value })),
    };
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!offer) return;
    setBusy(true);
    try {
      await portalRequest("/networks/participation/request", {
        body: {
          ...fields,
          accurate,
          ...consents,
          network,
          offerVersion: offer.version,
          referral: new URLSearchParams(window.location.search).get("ref"),
        },
      });
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Die Anfrage konnte nicht gesendet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <section role="status">
        <h1>Danke für deine Teilnahmeanfrage.</h1>
        <p>
          Falls noch nicht erfolgt, bestätige bitte deine E-Mail-Adresse über
          den zugesandten Link. Wir prüfen deine Zugehörigkeit und informieren
          dich über die Freigabe.
        </p>
        <p>
          Deine Bestätigungen sind gespeichert. Bis zur Freigabe bleiben
          Netzwerkinhalte und Unternehmensanlage gesperrt. Danach schließt du
          die Buchung mit deinen Rechnungsangaben ab und richtest deine
          Unternehmensseite ein.
        </p>
      </section>
    );
  return (
    <>
      <p aria-live="polite">
        Schritt {step} von 3 ·{" "}
        {step === 1
          ? "Du und dein Unternehmen"
          : step === 2
            ? "Dein Zugang"
            : "Kosten & Bestätigung"}
      </p>
      <progress
        value={step}
        max={3}
        aria-label="Fortschritt der Teilnahmeanfrage"
        style={{ width: "100%", accentColor: "var(--auth-primary, #5267d8)" }}
      />
      <h1>
        {step === 1
          ? "Lernen wir uns kennen."
          : step === 2
            ? "Dein persönlicher Zugang."
            : "Alles auf einen Blick."}
      </h1>
      <form className="formGrid participationWizard" onSubmit={submit}>
        {step === 1 && (
          <>
            <label>
              Vorname
              <input
                {...field("firstName")}
                required
                minLength={2}
                maxLength={100}
                autoComplete="given-name"
              />
            </label>
            <label>
              Nachname
              <input
                {...field("lastName")}
                required
                minLength={2}
                maxLength={100}
                autoComplete="family-name"
              />
            </label>
            <label className="full">
              Unternehmen
              <input
                {...field("company")}
                required
                minLength={2}
                maxLength={200}
                autoComplete="organization"
              />
            </label>
            <label className="full">
              {local ? "Firmensitz" : "Dein Bezug zum Business-Bereich"}
              <select {...field("affiliation")} required>
                <option value="" disabled>
                  Bitte auswählen
                </option>
                {local ? <option>Unternehmenssitz in Leverkusen</option> : <><option>Hospitality-/VIP-Gast</option>
                <option>Unternehmenspartner/Sponsor</option>
                <option>Sonstiger Bezug</option></>}
              </select>
            </label>
            <label className="full legalConsent">
              <input
                type="checkbox"
                required
                checked={accurate}
                onChange={(e) => setAccurate(e.target.checked)}
              />
              <span>
                Ich bestätige, dass meine Angaben korrekt sind. Mein Zugang wird
                erst nach Prüfung freigeschaltet.
              </span>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="full">
              Geschäftliche E-Mail-Adresse
              <input
                {...field("email")}
                type="email"
                required
                autoComplete="email"
              />
            </label>
            <label className="full">
              Passwort
              <input
                {...field("password")}
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
              />
            </label>
            <p className="full">
              Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und
              Sonderzeichen. Hast du bereits ein Konto, verwende dein
              bestehendes Passwort.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            {loading && (
              <p className="full" role="status">
                Aktuelle Konditionen werden geladen …
              </p>
            )}
            {!offer && !loading && (
              <button
                className="portalSecondary full"
                type="button"
                onClick={loadOffer}
              >
                Kosten erneut laden
              </button>
            )}
            {offer && (
              <>
                <section
                  className="full participationCosts"
                  aria-label="Kostenübersicht"
                >
                  <h2>Deine Portalnutzung</h2>
                  {offer.centrallyFunded ? (
                    <p>
                      Das Netzwerk übernimmt die Kosten. Für dich entstehen
                      keine Mitgliedsgebühren.
                    </p>
                  ) : (
                    <>
                      {offer.billing?.freeUntil && (
                        <p>
                          Kostenlos bis{" "}
                          <strong>{date(offer.billing.freeUntil)}</strong>.
                        </p>
                      )}
                      <p>
                        {offer.billing?.paidFrom
                          ? `${date(offer.billing.paidFrom)} bis ${date(offer.billing.paidThrough)}`
                          : `Laufzeit: ${offer.months} Monate`}{" "}
                        · alle Portal-Funktionen
                      </p>
                      <dl
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "10px",
                          margin: "16px 0",
                        }}
                      >
                        <dt>Monatspreis netto</dt>
                        <dd style={{ margin: 0 }}>
                          {money(offer.monthlyNetCents)}
                        </dd>
                        <dt>{offer.months} Monate netto</dt>
                        <dd style={{ margin: 0 }}>
                          {money(offer.annualNetCents)}
                        </dd>
                        <dt>{offer.vatPercent} % MwSt.</dt>
                        <dd style={{ margin: 0 }}>{money(offer.vatCents)}</dd>
                        <dt>
                          <strong>Gesamtbetrag</strong>
                        </dt>
                        <dd style={{ margin: 0 }}>
                          <strong>{money(offer.grossCents)}</strong>
                        </dd>
                      </dl>
                      {offer.schedule && (
                        <p>
                          Rechnungsversand: {date(offer.schedule.invoiceDate)} ·
                          zahlbar bis {date(offer.schedule.paymentDueDate)}.
                        </p>
                      )}
                    </>
                  )}
                </section>
                <label className="full legalConsent">
                  <input
                    type="checkbox"
                    required
                    checked={consents.costsAccepted}
                    onChange={(e) =>
                      setConsents({
                        ...consents,
                        costsAccepted: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Ich akzeptiere die dargestellten Kostenbeiträge.
                  </span>
                </label>
                <label className="full legalConsent">
                  <input
                    type="checkbox"
                    required
                    checked={consents.termsAccepted}
                    onChange={(e) =>
                      setConsents({
                        ...consents,
                        termsAccepted: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Ich akzeptiere die{" "}
                    <Link href="/agb" target="_blank" rel="noopener noreferrer">
                      AGB
                    </Link>
                    .
                  </span>
                </label>
                <label className="full legalConsent">
                  <input
                    type="checkbox"
                    required
                    checked={consents.privacyAcknowledged}
                    onChange={(e) =>
                      setConsents({
                        ...consents,
                        privacyAcknowledged: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Ich habe die{" "}
                    <Link
                      href="/datenschutz/unternehmen"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Datenschutzhinweise
                    </Link>{" "}
                    gelesen und zur Kenntnis genommen.
                  </span>
                </label>
              </>
            )}
          </>
        )}
        {error && (
          <p className="error full" role="alert">
            {error}
          </p>
        )}
        {step > 1 && (
          <button
            type="button"
            className="portalSecondary"
            disabled={busy}
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Zurück
          </button>
        )}
        <button
          type="submit"
          className="primary full"
          disabled={busy || (step === 3 && (!offer || loading))}
        >
          {busy
            ? "Anfrage wird gesendet …"
            : step === 3
              ? "Registrieren & Teilnahme anfragen"
              : "Weiter"}
        </button>
      </form>
    </>
  );
}
