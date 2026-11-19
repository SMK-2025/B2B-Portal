"use client";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  contributionRegistrationHref,
  readContributionSelection,
  saveContributionSelection,
  selectedContributionText,
} from "../lib/contribution-selection";
import Link from "next/link";
import { parseMonthlyContribution } from "../lib/member-contribution";
import "./city-contribution-presentation.css";
import {trackMembershipStart} from "./marketing-analytics";

const money = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export function CityContributionPresentation({
  networkName,
  networkSlug,
  prefix = "",
  preview = false,
}: {
  networkName?: string;
  networkSlug?: string;
  prefix?: string;
  preview?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("9,90"),
    id = useId();
  useEffect(() => {
    if (!networkSlug) return;
    const saved = readContributionSelection(networkSlug);
    if (saved !== null) setValue(selectedContributionText(saved));
  }, [networkSlug]);
  const cents = parseMonthlyContribution(value, 990),
    net = cents === null ? null : cents * 12,
    vat = net === null ? null : Math.round(net * 0.19);
  return (
    <section
      className="cm-section cm-contribution"
      id={networkSlug ? "mitgliedschaft" : undefined}
      aria-labelledby={id + "-heading"}
    >
      <div>
        <p className="cm-eyebrow">
          Ihr Beitrag für {networkName || "Ihr Stadtnetzwerk"}
        </p>
        <h2 id={id + "-heading"}>
          Ab 9,90 €.
          <br />
          <em>Alle Funktionen. Ihr Beitrag.</em>
        </h2>
        <p>
          Der Basic-Beitrag beträgt mindestens{" "}
          <strong>9,90 € netto pro Monat</strong> bei zwölf Monaten Laufzeit.
          Sie können freiwillig einen höheren Monatsbeitrag wählen.
        </p>
        <p>
          <strong>Der Zugang bleibt für alle gleich:</strong> Alle Mitglieder
          erhalten die im Netzwerk aktivierten Funktionen. Ein höherer Beitrag
          ist kein zusätzliches Funktionspaket und kauft keine bessere
          persönliche Platzierung.
        </p>
        <h3>Mehr Beitrag. Mehr Möglichkeiten für Ihr Netzwerk.</h3>
        <p>
          Freiwillige Mehrbeiträge schaffen zusätzliches Budget für
          B2B-Kampagnen und die Mitgliedergewinnung{" "}
          <strong>genau dieses Stadtnetzwerks</strong>. Netzwerke mit mehr
          zusätzlichem Budget können bei der Bewerbung stärker berücksichtigt
          werden und ihre Reichweite gezielter ausbauen.
        </p>
        <p>
          Das Ziel: mehr Unternehmen auf das Netzwerk aufmerksam machen und neue
          Kontakte ermöglichen. Eine bestimmte Mitgliederzahl, Kontakte oder
          Aufträge sind nicht garantiert.
        </p>
      </div>
      <aside
        className="cm-contribution-calculator"
        aria-label="Monatsbeitrag und Jahresbetrag berechnen"
      >
        <p className="cm-eyebrow">Was ist Ihnen Ihr Netzwerk wert?</p>
        <label htmlFor={id}>
          Ihr monatlicher Beitrag (netto, €)
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={cents === null}
            aria-describedby={id + "-help"}
            maxLength={10}
          />
        </label>
        <p
          id={id + "-help"}
          className={cents === null ? "cm-contribution-error" : "cm-secondary"}
        >
          {cents === null
            ? "Bitte mindestens 9,90 € mit höchstens zwei Nachkommastellen eingeben."
            : "Frei wählbar ab 9,90 € – ohne vorgegebene Preisstufen."}
        </p>
        <dl aria-live="polite">
          <div>
            <dt>12 Monate netto</dt>
            <dd>{net === null ? "—" : money(net)}</dd>
          </div>
          <div>
            <dt>19 % Umsatzsteuer</dt>
            <dd>{vat === null ? "—" : money(vat)}</dd>
          </div>
          <div className="cm-contribution-total">
            <dt>Gesamtbetrag</dt>
            <dd>{net === null || vat === null ? "—" : money(net + vat)}</dd>
          </div>
        </dl>
        <p>
          Abrechnung für zwölf Monate im Voraus. Kostenlose Startmonate sind im
          neuen Modell zunächst auf 0 gesetzt.
        </p>
        {preview ? (
          <p className="cm-contribution-preview">
            <strong>Beitragsvorschau – keine Buchung.</strong> Das neue Modell
            ist noch nicht veröffentlicht. Nach Veröffentlichung gilt es automatisch
            als Standard für Stadtnetzwerke, bis Sie es ändern. Ihr gewählter Beitrag
            wird zur Registrierung und Buchung übernommen.
          </p>
        ) : null}
        {networkSlug ? (
          <button
            type="button"
            className="cm-button"
            disabled={cents === null}
            onClick={() => {
              const href = contributionRegistrationHref(
                networkSlug,
                value,
                preview,
              );
              if (!href || cents === null) return;
              saveContributionSelection(networkSlug, cents);
              trackMembershipStart(networkSlug);
              router.push(href as never);
            }}
          >
            Jetzt Mitglied werden
          </button>
        ) : (
          <Link className="cm-button" href={`${prefix}/netzwerke` as never}>
            Stadtnetzwerk auswählen
          </Link>
        )}
      </aside>
    </section>
  );
}
