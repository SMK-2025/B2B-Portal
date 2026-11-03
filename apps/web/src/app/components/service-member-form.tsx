"use client";
import { useState, useEffect, type FormEvent } from "react";
import { portalRequest, getPortalSession } from "../lib/portal-api";
type Quote = {
  memberPaymentModel: string;
  cooperationFree: boolean;
  months: number;
  monthlyNetCents: number;
  grossCents: number;
  billing: null | {
    version: string;
    freeUntil: string | null;
    paidFrom: string | null;
    paidThrough: string | null;
    autoRenew: boolean;
    renewalMonths: number;
  };
};
const money = (v: number) =>
  (v / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export function ServiceMemberForm({
  id,
  name,
  done,
  cancel,
}: {
  id: string;
  name: string;
  done: () => void;
  cancel: () => void;
}) {
  const [q, setQ] = useState<Quote | null>(null),
    [complimentary, setComplimentary] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    portalRequest<Quote>(`/networks/admin/${id}/billing`, {
      token: getPortalSession() || "",
    })
      .then(setQ)
      .catch((e) => setError(e.message));
  }, [id]);
  const central = q?.memberPaymentModel === "network" || !!q?.cooperationFree;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    try {
      await portalRequest(`/networks/admin/${id}/service-members`, {
        token: getPortalSession() || "",
        body: {
          ...Object.fromEntries(new FormData(e.currentTarget)),
          central,
          complimentaryAccess: complimentary,
          confirmed: true,
          acceptedMonthlyNetCents: q.monthlyNetCents,
          acceptedBillingVersion: q.billing?.version || null,
        },
      });
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label key={key}>
      {label}
      <input name={key} type={type} required={required} />
    </label>
  );
  return (
    <section className="networkCard" style={{ padding: 20 }}>
      <h3>Mitglied im Auftrag einrichten · {name}</h3>
      <p>
        Es wird kein bestehendes Konto übernommen. Bei der Anlage werden weder
        Zugangsmail noch Rechnung versendet.
      </p>
      {q && (
        <form className="formGrid" onSubmit={submit}>
          {field("firstName", "Vorname")}
          {field("lastName", "Nachname")}
          {field("email", "Neue Login-E-Mail", "email")}
          {field("legalName", "Unternehmen / Rechnungsempfänger")}
          {field("websiteUrl", "Firmenhomepage (optional)", "url", false)}
          {field("reference", "Auftragsnachweis (z. B. E-Mail vom …)")}
          <label className="full">
            Abrechnung für dieses Mitglied
            <select value={complimentary ? "free" : "standard"} onChange={e => setComplimentary(e.target.value === "free")}>
              <option value="standard">{central ? "Netzwerkkonditionen · keine persönliche Rechnung" : "Kostenpflichtig nach Netzwerkkonditionen"}</option>
              <option value="free">Kostenloser Mitgliedszugang</option>
            </select>
          </label>
          {!central && !complimentary && (
            <>
              {field("invoiceEmail", "Rechnungs-E-Mail", "email")}
              {field("invoiceStreet", "Straße und Hausnummer")}
              {field("invoicePostalCode", "Postleitzahl")}
              {field("invoiceCity", "Ort")}
              {field("invoiceCountry", "Land")}
            </>
          )}
          <p className="full">
            {complimentary ? "Beitragsfrei: 0,00 €. Keine Rechnung für die Netzwerknutzung und keine kostenpflichtige Verlängerung." : central
              ? "Keine persönliche Rechnung."
              : `Netzwerknutzung: ${q.months} × ${money(q.monthlyNetCents)} netto, Gesamtpreis ${money(q.grossCents)} inkl. MwSt.`}{" "}
            {!central && !complimentary &&
              q.billing?.paidFrom &&
              `Leistungszeitraum: ${q.billing.paidFrom} bis ${q.billing.paidThrough}.`}{" "}
            {!central && !complimentary &&
              q.billing?.freeUntil &&
              `Kostenfrei bis ${q.billing.freeUntil}.`}{" "}
            {!central && !complimentary &&
              q.billing?.autoRenew &&
              `Verlängerung: ${q.billing.renewalMonths} Monate nach den Netzwerkkonditionen.`}
          </p>
          <label className="legalConsent full">
            <input required type="checkbox" />
            Ich bestätige als Betreiber den vorliegenden Auftrag zu den angezeigten Konditionen.
          </label>
          <button className="portalPrimary" disabled={busy}>
            Ohne E-Mail anlegen
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="portalSecondary"
        disabled={busy}
        onClick={cancel}
      >
        Abbrechen
      </button>
    </section>
  );
}
