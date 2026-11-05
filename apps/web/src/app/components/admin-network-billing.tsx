"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { LaunchPromotionSettings } from "./launch-promotion-settings";
export type BillingInvoice = {
  id: string;
  order_id: string;
  number: string;
  downloadable: boolean;
};
type Billing = {
  launchPromotion?: {enabled:boolean;limit:number;freeMonths:number}|null;
  launchCounter?: {used:number}|null;
  memberPaymentModel: "individual" | "network";
  monthlyNetCents: number;
  months: number;
  billing: null | {
    freeUntil: string | null;
    paidFrom: string | null;
    paidThrough: string | null;
    autoRenew: boolean;
    automaticInvoices: boolean;
    renewalMonths: number;
  };
  schedule: null | { invoiceDate: string; paymentDueDate: string };
  invoices: BillingInvoice[];
  orders: {
    id: string;
    kind?: string;
    invoiceCompany: string;
    invoiceEmail: string;
    monthlyNetCents: number;
    minimumTermMonths: number;
    paymentStatus?: string;
    paidAt?: string;
    serviceStartsAt?: string;
    serviceEndsAt?: string;
    billingPolicy?: { invoiceDate: string; paymentDueDate: string };
  }[];
};
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })
    : "–";
const money = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
export function InvoiceDownload({ invoice }: { invoice: BillingInvoice }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<{url:string;name:string} | null>(null);
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const pdf = await portalRequest<{ number: string; base64: string }>(
        `/networks/admin/invoice-status/${invoice.id}/pdf`,
        { token: getPortalSession() || "" },
      );
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(pdf.base64), (c) => c.charCodeAt(0))], {
          type: "application/pdf",
        }),
      );
      setFile({url,name:pdf.number+".pdf"});
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.number + ".pdf";
      document.body.appendChild(a);
      try { a.click(); } finally { a.remove(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rechnung nicht verfügbar.");
    } finally {
      setBusy(false);
    }
  }
  if (!invoice.downloadable) return <span>{invoice.number} · PDF noch nicht verfügbar</span>;
  if (file) return <span role="group" aria-label={invoice.number}>
    <a href={file.url} target="_blank" rel="noopener noreferrer">PDF ansehen</a>{" · "}
    <a href={file.url} download={file.name}>Erneut herunterladen</a>
  </span>;
  return (
    <span>
      <button
        type="button"
        className="portalSecondary"
        disabled={busy || !invoice.downloadable}
        onClick={download}
        title={`Rechnung ${invoice.number} herunterladen`}
      >
        <span aria-hidden="true">▤</span> {busy ? "PDF wird geladen …" : "PDF herunterladen"} · {invoice.number}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
export function AdminNetworkBilling({
  id,
  name,
  onSaved,
}: {
  id: string;
  name: string;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Billing | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    setData(
      await portalRequest<Billing>(`/networks/admin/${id}/billing`, {
        token: getPortalSession() || "",
      }),
    );
  }
  async function open() {
    dialog.current?.showModal();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Zahlungsdetails nicht verfügbar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await portalRequest(`/networks/${id}/member-pricing`, {
        token: getPortalSession() || "",
        body: {
          monthlyNetCents: Math.round(Number(f.get("price")) * 100),
          memberPaymentModel: f.get("model"),
          launchPromotion: {enabled:f.get("launchEnabled")==="on",limit:Number(f.get("launchLimit")),freeMonths:Number(f.get("launchMonths"))},
          billing: {
            months: Number(f.get("months")),
            freeUntil: f.get("freeUntil"),
            paidFrom: f.get("paidFrom"),
            paidThrough: f.get("paidThrough"),
            autoRenew: f.get("autoRenew") === "on",
            automaticInvoices: f.get("automaticInvoices") === "on",
            renewalMonths: 12,
          },
        },
      });
      await load();
      onSaved();
      setNotice(
        "Zahlungsdetails gespeichert. Bestehende Buchungen und Rechnungen bleiben unverändert.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function paid(order: Billing["orders"][number]) {
    if (
      !window.confirm(
        `${order.invoiceCompany}: Zahlung ${order.paymentStatus === "paid" ? "wieder als offen" : "als eingegangen"} markieren?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await portalRequest(`/networks/${id}/orders/${order.id}/payment`, {
        token: getPortalSession() || "",
        body: { status: order.paymentStatus === "paid" ? "open" : "paid" },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className="portalSecondary" onClick={open}>
        Zahlungsdetails
      </button>
      <dialog
        ref={dialog}
        className="adminUsersDialog adminBillingDialog"
        aria-label={`Zahlungsdetails ${name}`}
      >
        <header style={{flexWrap:"wrap",gap:12}}>
          <h2 style={{flex:"1 1 200px",minWidth:0,overflowWrap:"anywhere"}}>Zahlungsdetails · {name}</h2>
          <button
            type="button"
            className="portalSecondary"
            onClick={() => dialog.current?.close()}
          >
            Schließen
          </button>
        </header>
        {busy && <p role="status">Wird verarbeitet …</p>}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {data && (
          <>
            <form className="formGrid" onSubmit={save}>
              <label>
                Wer bezahlt?
                <select name="model" defaultValue={data.memberPaymentModel}>
                  <option value="individual">Mitglieder zahlen selbst</option>
                  <option value="network">Netzwerk zahlt zentral</option>
                </select>
              </label>
              <label>
                Monatspreis je Mitglied (netto, €)
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={data.monthlyNetCents / 100}
                />
              </label>
              <label>
                Laufzeit in Monaten
                <input
                  name="months"
                  type="number"
                  min="1"
                  max="36"
                  required
                  defaultValue={data.months}
                />
              </label>
              <label>
                Kostenlos bis (optional)
                <input
                  name="freeUntil"
                  type="date"
                  defaultValue={data.billing?.freeUntil || ""}
                />
              </label>
              <label>
                Kostenpflichtig ab (optional)
                <input
                  name="paidFrom"
                  type="date"
                  defaultValue={data.billing?.paidFrom || ""}
                />
              </label>
              <label>
                Kostenpflichtig bis (optional)
                <input
                  name="paidThrough"
                  type="date"
                  defaultValue={data.billing?.paidThrough || ""}
                />
              </label>
              <label className="legalConsent full">
                <input
                  name="autoRenew"
                  type="checkbox"
                  defaultChecked={data.billing?.autoRenew}
                />
                <span>Automatische Verlängerung um zwölf Monate</span>
              </label>
              <label className="legalConsent full">
                <input
                  name="automaticInvoices"
                  type="checkbox"
                  defaultChecked={data.billing?.automaticInvoices}
                />
                <span>
                  Automatischer Rechnungsversand für individuelle
                  Mitgliederbuchungen
                </span>
              </label>
              <LaunchPromotionSettings value={data.launchPromotion} used={data.launchCounter?.used || 0}/>
              <p className="full">
                Aktuell gespeichert: {data.months} ×{" "}
                {money(data.monthlyNetCents)} ={" "}
                {money(data.months * data.monthlyNetCents)} netto pro Mitglied.{" "}
                {data.schedule &&
                  `Rechnungsversand ${date(data.schedule.invoiceDate)} · zahlbar bis ${date(data.schedule.paymentDueDate)}.`}
              </p>
              <p className="full">
                Änderungen gelten für neue Buchungen. Bereits bestätigte
                Laufzeiten und Rechnungen werden nicht nachträglich
                überschrieben. Bei zentraler Zahlung sehen Mitglieder keine
                Zahlungsaufforderung; bestehende Einzelbuchungen bleiben
                erhalten.
              </p>
              <button className="portalPrimary full" disabled={busy}>
                Zahlungsdetails speichern
              </button>
            </form>
            <h3>Bestehende Buchungen & Rechnungen</h3>
            <div className="adminUsersTable" style={{maxWidth:"100%",minWidth:0,overflowX:"auto"}}>
              <table>
                <thead>
                  <tr>
                    <th>Rechnungsempfänger</th>
                    <th>Abrechnung</th>
                    <th>Laufzeit</th>
                    <th>Zahlung</th>
                    <th>Rechnung</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.invoiceCompany}
                        <br />
                        {o.invoiceEmail}
                      </td>
                      <td>
                        {o.kind === "member_annual" ? "Mitglied" : "Netzwerk"}
                        <br />
                        {o.minimumTermMonths} Monate ·{" "}
                        {money(o.monthlyNetCents)} netto/Monat
                      </td>
                      <td>
                        {date(o.serviceStartsAt)} – {date(o.serviceEndsAt)}
                        {o.billingPolicy && (
                          <>
                            <br />
                            Rechnung: {date(o.billingPolicy.invoiceDate)}
                            <br />
                            Fällig: {date(o.billingPolicy.paymentDueDate)}
                          </>
                        )}
                      </td>
                      <td>
                        {o.paymentStatus === "paid"
                          ? `Gezahlt · ${date(o.paidAt)}`
                          : o.paymentStatus === "overdue"
                            ? "Überfällig"
                            : "Offen"}
                      </td>
                      <td>
                        {data.invoices
                          .filter((i) => i.order_id === o.id)
                          .map((i) => (
                            <InvoiceDownload key={i.id} invoice={i} />
                          ))}
                        {!data.invoices.some((i) => i.order_id === o.id) &&
                          "Noch keine Rechnung erstellt"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="portalSecondary"
                          disabled={busy}
                          onClick={() => paid(o)}
                        >
                          {o.paymentStatus === "paid"
                            ? "Zahlung wieder offen"
                            : "Als gezahlt markieren"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.orders.length && (
              <p>
                Noch keine Buchungen oder Rechnungen für dieses Netzwerk
                vorhanden.
              </p>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
