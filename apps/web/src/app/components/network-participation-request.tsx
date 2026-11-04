"use client";
import { NetworkText } from "./network-text-editor";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { portalRequest } from "../lib/portal-api";
import { authorizedMailingToken } from "../lib/mailing-token";
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
export function NetworkParticipationRequest({ network }: { network: string }) {
  const local = network === "unternehmernetzwerkleverkusen";
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
        mailingToken: authorizedMailingToken(),
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
        <h1>
          <NetworkText id="ui.network-participation-request.4e69eef931053457">
            Danke für deine Teilnahmeanfrage.
          </NetworkText>
        </h1>
        <p>
          <NetworkText id="ui.network-participation-request.ab2699c4d79ce245">
            Falls noch nicht erfolgt, bestätige bitte deine E-Mail-Adresse über
            den zugesandten Link. Wir prüfen deine Zugehörigkeit und informieren
            dich über die Freigabe.
          </NetworkText>
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
        <NetworkText id="ui.network-participation-request.41b8e19043ca3331">
          Schritt{" "}
        </NetworkText>
        {step}
        <NetworkText id="ui.network-participation-request.5285b75ab3fa0ae4">
          von 3 ·
        </NetworkText>{" "}
        <NetworkText id="ui.network-participation-request.eaf72dd099f9ced8">
          {step === 1
            ? "Du und dein Unternehmen"
            : step === 2
              ? "Dein Zugang"
              : "Kosten & Bestätigung"}
        </NetworkText>
      </p>
      <progress
        value={step}
        max={3}
        aria-label="Fortschritt der Teilnahmeanfrage"
        style={{ width: "100%", accentColor: "var(--auth-primary, #5267d8)" }}
      />
      <h1>
        <NetworkText id="ui.network-participation-request.9aa52fab6f2a139d">
          {step === 1
            ? "Lernen wir uns kennen."
            : step === 2
              ? "Dein persönlicher Zugang."
              : "Alles auf einen Blick."}
        </NetworkText>
      </h1>
      <form className="formGrid participationWizard" onSubmit={submit}>
        {step === 1 && (
          <>
            <label>
              <NetworkText id="ui.network-participation-request.d2d77b6ffa7084f7">
                Vorname
              </NetworkText>
              <input
                {...field("firstName")}
                required
                minLength={2}
                maxLength={100}
                autoComplete="given-name"
              />
            </label>
            <label>
              <NetworkText id="ui.network-participation-request.b25358edd497f128">
                Nachname
              </NetworkText>
              <input
                {...field("lastName")}
                required
                minLength={2}
                maxLength={100}
                autoComplete="family-name"
              />
            </label>
            <label className="full">
              <NetworkText id="ui.network-participation-request.6eb0f94937ba38da">
                Unternehmen
              </NetworkText>
              <input
                {...field("company")}
                required
                minLength={2}
                maxLength={200}
                autoComplete="organization"
              />
            </label>
            <label className="full">
              <NetworkText id="ui.network-participation-request.0ad05980a9d1b011">
                {local ? "Firmensitz" : "Dein Bezug zum Business-Bereich"}
              </NetworkText>
              <select {...field("affiliation")} required>
                <option value="" disabled>
                  Bitte auswählen
                </option>
                {local ? (
                  <option>Unternehmenssitz in Leverkusen</option>
                ) : (
                  <>
                    <option>Hospitality-/VIP-Gast</option>
                    <option>Unternehmenspartner/Sponsor</option>
                    <option>Sonstiger Bezug</option>
                  </>
                )}
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
                <NetworkText id="ui.network-participation-request.b73244b9024bebc4">
                  Ich bestätige, dass meine Angaben korrekt sind. Mein Zugang
                  wird erst nach Prüfung freigeschaltet.
                </NetworkText>
              </span>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="full">
              <NetworkText id="ui.network-participation-request.3ad73fa86b5781ef">
                Geschäftliche E-Mail-Adresse
              </NetworkText>
              <input
                {...field("email")}
                type="email"
                required
                autoComplete="email"
              />
            </label>
            <label className="full">
              <NetworkText id="ui.network-participation-request.a36c101570cc4410">
                Passwort
              </NetworkText>
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
              <NetworkText id="ui.network-participation-request.d63a30244cc71284">
                Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und
                Sonderzeichen. Hast du bereits ein Konto, verwende dein
                bestehendes Passwort.
              </NetworkText>
            </p>
          </>
        )}
        {step === 3 && (
          <>
            {loading && (
              <p className="full" role="status">
                <NetworkText id="ui.network-participation-request.84d3e3c181a81e68">
                  Aktuelle Konditionen werden geladen …
                </NetworkText>
              </p>
            )}
            {!offer && !loading && (
              <button
                className="portalSecondary full"
                type="button"
                onClick={loadOffer}
              >
                <NetworkText id="ui.network-participation-request.b33d7d1271f09534">
                  Kosten erneut laden
                </NetworkText>
              </button>
            )}
            {offer && (
              <>
                <section
                  className="full participationCosts"
                  aria-label="Kostenübersicht"
                >
                  <h2>
                    <NetworkText id="ui.network-participation-request.3bcb8224fc622522">
                      Deine Portalnutzung
                    </NetworkText>
                  </h2>
                  {offer.centrallyFunded ? (
                    <p>
                      <NetworkText id="ui.network-participation-request.d9ded7717e76f81b">
                        Das Netzwerk übernimmt die Kosten. Für dich entstehen
                        keine Mitgliedsgebühren.
                      </NetworkText>
                    </p>
                  ) : (
                    <>
                      {offer.billing?.freeUntil && (
                        <p>
                          <NetworkText id="ui.network-participation-request.06b746897b686912">
                            Kostenlos bis
                          </NetworkText>{" "}
                          <strong>{date(offer.billing.freeUntil)}</strong>.
                        </p>
                      )}
                      <p>
                        {offer.billing?.paidFrom
                          ? `${date(offer.billing.paidFrom)} bis ${date(offer.billing.paidThrough)}`
                          : `Laufzeit: ${offer.months} Monate`}{" "}
                        <NetworkText id="ui.network-participation-request.c968dfb54522c7c8">
                          · alle Portal-Funktionen
                        </NetworkText>
                      </p>
                      <dl
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "10px",
                          margin: "16px 0",
                        }}
                      >
                        <dt>
                          <NetworkText id="ui.network-participation-request.0a35688784f13a3f">
                            Monatspreis netto
                          </NetworkText>
                        </dt>
                        <dd style={{ margin: 0 }}>
                          {money(offer.monthlyNetCents)}
                        </dd>
                        <dt>
                          {offer.months}
                          <NetworkText id="ui.network-participation-request.828d724ce63b4aee">
                            Monate netto
                          </NetworkText>
                        </dt>
                        <dd style={{ margin: 0 }}>
                          {money(offer.annualNetCents)}
                        </dd>
                        <dt>{offer.vatPercent} % MwSt.</dt>
                        <dd style={{ margin: 0 }}>{money(offer.vatCents)}</dd>
                        <dt>
                          <strong>
                            <NetworkText id="ui.network-participation-request.c80147682d6c7500">
                              Gesamtbetrag
                            </NetworkText>
                          </strong>
                        </dt>
                        <dd style={{ margin: 0 }}>
                          <strong>{money(offer.grossCents)}</strong>
                        </dd>
                      </dl>
                      {offer.schedule && (
                        <p>
                          Rechnungsversand: {date(offer.schedule.invoiceDate)}
                          <NetworkText id="ui.network-participation-request.3a67d62f7507529f">
                            · zahlbar bis{" "}
                          </NetworkText>
                          {date(offer.schedule.paymentDueDate)}.
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
                  <span>Ich akzeptiere die dargestellten Kostenbeiträge.</span>
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
                    <NetworkText id="ui.network-participation-request.769921a499fbbb06">
                      Ich habe die
                    </NetworkText>{" "}
                    <Link
                      href="/datenschutz/unternehmen"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Datenschutzhinweise
                    </Link>{" "}
                    <NetworkText id="ui.network-participation-request.ad451e0b070d7207">
                      gelesen und zur Kenntnis genommen.
                    </NetworkText>
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
            <NetworkText id="ui.network-participation-request.548611ce58f71a17">
              Zurück
            </NetworkText>
          </button>
        )}
        <button
          type="submit"
          className="primary full"
          disabled={busy || (step === 3 && (!offer || loading))}
        >
          <NetworkText id="ui.network-participation-request.adefdfe728e461d5">
            {busy
              ? "Anfrage wird gesendet …"
              : step === 3
                ? "Registrieren & Teilnahme anfragen"
                : "Weiter"}
          </NetworkText>
        </button>
      </form>
    </>
  );
}
