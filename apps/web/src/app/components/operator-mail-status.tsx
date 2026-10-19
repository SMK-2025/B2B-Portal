"use client";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
type Status = {
  recipient: string;
  pending: number;
  messages: Array<{
    id: string;
    subject: string;
    createdAt: string;
    sentAt: string | null;
    attempts: number;
    lastError: string | null;
  }>;
};
export function OperatorMailStatus() {
  const [data, setData] = useState<Status | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => {
      void portalRequest<Status>("/networks/admin/operator-mails", {
        token: getPortalSession() || "",
      })
        .then((value) => {
          if (active) {
            setData(value);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError("Versandstatus konnte nicht geladen werden.");
        });
    };
    load();
    const timer = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <section className="networkCard">
      <header>
        <h2>Betreiber-Benachrichtigungen</h2>
      </header>
      <div style={{ padding: 24, display: "grid", gap: 20 }}>
        <p>
          Einladungen, neue Registrierungen und abrechenbare Jahresbuchungen
          gehen an{" "}
          <b>{data?.recipient || "mk@media-online-innovations.group"}</b>. Neue
          Jahresbuchungen erscheinen weiterhin in der Rechnungsübersicht.
        </p>
        {error && <p role="alert">{error}</p>}
        {data && (
          <>
            <p>
              {data.pending} gespeicherte Meldung(en) warten auf Versand.
              Fehlgeschlagene Versuche werden automatisch wiederholt.
            </p>
            <details>
              <summary>Letzte Versandaufträge ansehen</summary>
              {data.messages.map((m) => (
                <p key={m.id}>
                  <b>{m.subject}</b>
                  <br />
                  {new Date(m.createdAt).toLocaleString("de-DE")} ·{" "}
                  {m.sentAt
                    ? "An Maildienst übergeben"
                    : m.lastError || "Versand ausstehend"}{" "}
                  · {m.attempts} Versuch(e)
                </p>
              ))}
            </details>
          </>
        )}
      </div>
    </section>
  );
}
