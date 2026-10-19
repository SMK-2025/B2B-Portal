"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
type Row = {
  id: string;
  networkName: string;
  invoiceCompany: string;
  invoiceContact: string;
  invoiceEmail: string;
  invoiceStreet: string;
  invoicePostalCode: string;
  invoiceCity: string;
  invoiceCountry: string;
  invoiceVatId?: string;
  purchaseOrderReference?: string | null;
  monthlyNetCents: number;
  annualNetCents: number;
  vatCents: number;
  grossCents: number;
  submittedAt: string;
  serviceStartsAt: string;
  serviceEndsAt: string;
  endingSoon: boolean;
  expired: boolean;
  paymentStatus: string;
  invoiceSentAt?: string | null;
  invoiceReference?: string | null;
  user: { firstName: string; lastName: string; email: string } | null;
};
type Network = {
  id: string;
  name: string;
  memberPrice: { monthlyNetCents: number };
};
const money = (n: number) =>
    (n / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }),
  date = (s: string) => new Date(s).toLocaleDateString("de-DE");
export function AdminMemberRegistrations() {
  const [rows, setRows] = useState<Row[]>([]),
    [networks, setNetworks] = useState<Network[]>([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const token = getPortalSession() || "";
      const [r, n] = await Promise.all([
        portalRequest<Row[]>("/networks/admin/member-registrations", { token }),
        portalRequest<Network[]>("/networks/admin", { token }),
      ]);
      setRows(r);
      setNetworks(n);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Daten konnten nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function changePrice(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    try {
      const value = new FormData(e.currentTarget).get("price"),
        cents = Math.round(Number(value) * 100);
      await portalRequest(`/networks/${id}/member-pricing`, {
        token: getPortalSession() || "",
        body: { monthlyNetCents: cents },
      });
      setNotice(
        "Preis für künftige Buchungen gespeichert. Bestehende Jahresbuchungen bleiben unverändert.",
      );
      await load();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Preis konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function invoice(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await portalRequest(`/networks/admin/member-registrations/${id}`, {
        token: getPortalSession() || "",
        body: {
          invoiceSent: !!f.get("sent"),
          invoiceReference: f.get("reference"),
          paid: !!f.get("paid"),
        },
      });
      setNotice(
        "Rechnungsstatus gespeichert. Es wurde keine E-Mail versendet.",
      );
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const visible = rows.filter(
    (r) =>
      (filter !== "ending" || r.endingSoon) &&
      (filter !== "unbilled" || !r.invoiceSentAt) &&
      `${r.networkName} ${r.invoiceCompany} ${r.invoiceEmail} ${r.user?.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function csv() {
    const cell = (v: unknown) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@-]/, "'$&")
          .replace(/"/g, '""') +
        '"',
      values = [
        [
          "Buchungsnummer",
          "Netzwerk",
          "Firma",
          "Kontakt",
          "Login-E-Mail",
          "Rechnungs-E-Mail",
          "Straße",
          "PLZ",
          "Ort",
          "Land",
          "USt-IdNr",
          "Bestellreferenz",
          "Beginn",
          "Ende (exklusiv)",
          "Monat netto",
          "Jahr netto",
          "MwSt",
          "Brutto",
          "Rechnung",
          "Zahlung",
        ],
        ...visible.map((r) => [
          r.id,
          r.networkName,
          r.invoiceCompany,
          r.invoiceContact,
          r.user?.email,
          r.invoiceEmail,
          r.invoiceStreet,
          r.invoicePostalCode,
          r.invoiceCity,
          r.invoiceCountry,
          r.invoiceVatId,
          r.purchaseOrderReference,
          r.serviceStartsAt,
          r.serviceEndsAt,
          (r.monthlyNetCents / 100).toFixed(2),
          (r.annualNetCents / 100).toFixed(2),
          (r.vatCents / 100).toFixed(2),
          (r.grossCents / 100).toFixed(2),
          r.invoiceReference,
          r.paymentStatus,
        ]),
      ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + values.map((r) => r.map(cell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mitgliedschaften-Rechnungsdaten.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="memberBillingWorkspace">
      <section className="networkCard">
        <header>
          <h2>Mitgliedspreise je Partnernetzwerk</h2>
        </header>
        <div className="memberBillingPriceGrid">
          {networks.map((n) => (
            <form key={n.id} onSubmit={(e) => void changePrice(e, n.id)}>
              <h3>{n.name}</h3>
              <label>
                Netto pro Monat (€)
                <input
                  name="price"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={n.memberPrice.monthlyNetCents / 100}
                />
              </label>
              <small>
                × 12 Monate im Voraus, zzgl. 19 % MwSt. Initiator kostenlos.
              </small>
              <button disabled={busy}>Preis speichern</button>
            </form>
          ))}
        </div>
      </section>
      <section className="networkCard">
        <header>
          <h2>Neue Anmeldungen & Mitgliedsjahre</h2>
          <button onClick={csv}>Rechnungsdaten als CSV</button>
        </header>
        <div className="memberBillingFilters">
          <input
            aria-label="Anmeldungen durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Netzwerk, Unternehmen oder E-Mail suchen"
          />
          <select
            aria-label="Anmeldungen filtern"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Alle Buchungen</option>
            <option value="unbilled">Rechnung noch nicht versendet</option>
            <option value="ending">
              Endet innerhalb von sechs Wochen / beendet
            </option>
          </select>
        </div>
        <div className="memberBillingRows">
          {visible.map((r) => (
            <article
              key={r.id}
              className={r.endingSoon ? "memberBillingEnding" : ""}
            >
              <h3>
                {r.invoiceCompany} · {r.networkName}
              </h3>
              {r.endingSoon && (
                <strong role="status">
                  {r.expired
                    ? "Mitgliedschaft beendet"
                    : "Mitgliedschaft endet – Verlängerung vorbereiten"}
                </strong>
              )}
              <p>
                <b>
                  {date(r.serviceStartsAt)} bis{" "}
                  {date(
                    new Date(Date.parse(r.serviceEndsAt) - 1).toISOString(),
                  )}
                </b>{" "}
                · zwölf Monate
                <br />
                {money(r.monthlyNetCents)} × 12 = {money(r.annualNetCents)}{" "}
                netto + {money(r.vatCents)} MwSt. ={" "}
                <b>{money(r.grossCents)} brutto im Voraus</b>
              </p>
              <p>
                Registriert: {new Date(r.submittedAt).toLocaleString("de-DE")}
                <br />
                Nutzer: {r.user?.firstName} {r.user?.lastName} · {r.user?.email}
              </p>
              <details>
                <summary>Alle Rechnungsdaten</summary>
                <p>
                  {r.invoiceCompany}
                  <br />
                  {r.invoiceContact}
                  <br />
                  {r.invoiceStreet}
                  <br />
                  {r.invoicePostalCode} {r.invoiceCity}
                  <br />
                  {r.invoiceCountry}
                  <br />
                  {r.invoiceEmail}
                  <br />
                  USt-IdNr.: {r.invoiceVatId || "–"}
                  <br />
                  Bestellreferenz: {r.purchaseOrderReference || "–"}
                  <br />
                  Buchungsnummer: {r.id}
                </p>
              </details>
              <p>
                Rechnung:{" "}
                {r.invoiceSentAt
                  ? `${r.invoiceReference} · versendet ${date(r.invoiceSentAt)}`
                  : "Noch manuell zu erstellen"}{" "}
                · Zahlung: {r.paymentStatus === "paid" ? "bezahlt" : "offen"}
              </p>
              <form onSubmit={(e) => void invoice(e, r.id)}>
                <input
                  name="reference"
                  aria-label="Rechnungsnummer"
                  placeholder="Rechnungsnummer"
                  defaultValue={r.invoiceReference || ""}
                />
                <label>
                  <input name="sent" type="checkbox" />
                  Manuell versendete Rechnung erfassen
                </label>
                <label>
                  <input name="paid" type="checkbox" />
                  Zahlung eingegangen
                </label>
                <button disabled={busy}>Status speichern</button>
              </form>
            </article>
          ))}
          {!visible.length && (
            <p>
              Noch keine passenden Jahresbuchungen. Bestehende Konten werden
              nicht rückwirkend berechnet.
            </p>
          )}
        </div>
      </section>
      {notice && (
        <p className="networkNotice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
