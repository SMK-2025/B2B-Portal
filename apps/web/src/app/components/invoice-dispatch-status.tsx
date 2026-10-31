"use client";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
type Row = {
  id: string;
  number: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error: string | null;
};
export function InvoiceDispatchStatus() {
  const [rows, setRows] = useState<Row[]>([]),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      setRows(
        await portalRequest<Row[]>("/networks/admin/invoice-status", {
          token: getPortalSession() || "",
        }),
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Rechnungsstatus nicht verfügbar.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function download(row: Row) {
    try {
      const pdf = await portalRequest<{ number: string; base64: string }>(
        `/networks/admin/invoice-status/${row.id}/pdf`,
        { token: getPortalSession() || "" },
      );
      const blob = new Blob(
        [Uint8Array.from(atob(pdf.base64), (x) => x.charCodeAt(0))],
        { type: "application/pdf" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.number + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "PDF konnte nicht geladen werden.",
      );
    }
  }
  return (
    <section className="networkCard">
      <header>
        <h2>Automatische Rechnungen & Versandarchiv</h2>
        <button type="button" onClick={() => void load()}>
          Aktualisieren
        </button>
      </header>
      <div style={{ padding: 20 }}>
        <p>
          BCC jeder Rechnung: mk@media-online-innovations.group. Bei unklarem
          Versandstatus zuerst den Mailanbieter prüfen – kein automatischer
          Doppelversand. Versand ausschließlich als validierte
          ZUGFeRD-E-Rechnung mit PDF-Darstellung und eingebetteten
          Rechnungsdaten.
        </p>
        {notice && <p role="status">{notice}</p>}
        {!rows.length ? (
          <p>
            Noch keine automatischen Rechnungen erstellt. Vor dem geplanten
            Rechnungsdatum erfolgt kein Versand.
          </p>
        ) : (
          rows.map((row) => (
            <article key={row.id}>
              <strong>{row.number}</strong>
              <p>
                {row.status === "sent"
                  ? "Versand vom Mailanbieter angenommen"
                  : row.status === "ready"
                    ? "Vorbereitet"
                    : row.status === "sending"
                      ? "Versand läuft oder muss nach Unterbrechung geprüft werden"
                      : "Versand prüfen"}
                {row.sent_at &&
                  ` · ${new Date(row.sent_at).toLocaleString("de-DE")}`}
              </p>
              {row.error && <p>{row.error}</p>}
              <button type="button" onClick={() => void download(row)}>
                Rechnungs-PDF herunterladen
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
