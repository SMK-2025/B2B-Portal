"use client";
import { useEffect, useRef, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
type Row = {
  name: string;
  email: string;
  role: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  profile: string;
};
const roles: Record<string, string> = {
  network_admin: "Initiator",
  member: "Partner",
  moderator: "Moderator",
};
const states: Record<string, string> = {
  active: "Aktiv",
  pending: "Aufnahme offen",
  inactive: "Inaktiv",
  suspended: "Gesperrt",
  rejected: "Abgelehnt",
  invited: "Eingeladen",
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("de-DE") : "–";
export function AdminNetworkUsers({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const modal = dialog.current;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") modal?.close();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  async function open() {
    dialog.current?.showModal();
    setLoading(true);
    setError("");
    setRows([]);
    try {
      const result = await portalRequest<{ users: Row[] }>(
        `/networks/admin/${id}/users`,
        { token: getPortalSession() || "" },
      );
      setRows(result.users);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nutzer konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <button type="button" className="portalSecondary" onClick={open}>
        Nutzerübersicht
      </button>
      <dialog
        ref={dialog}
        className="adminUsersDialog"
        aria-label={`Nutzerübersicht ${name}`}
      >
        <header>
          <div>
            <h2>Nutzerübersicht · {name}</h2>
            <p>
              Einladungen, registrierte Zugänge und Mitglieder dieses Netzwerks.
            </p>
          </div>
          <button
            type="button"
            className="portalSecondary"
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            Schließen
          </button>
        </header>
        {loading ? (
          <p role="status">Nutzer werden geladen …</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <p>
              {rows.length} Zugänge · Profil vollständig = Pflichtangaben
              ausgefüllt und veröffentlicht. Initiatoren benötigen kein
              Unternehmensprofil.
            </p>
            <div className="adminUsersTable">
              <table>
                <thead>
                  <tr>
                    {[
                      "Name",
                      "E-Mail-Adresse",
                      "Vertragslaufzeit",
                      "Status",
                      "Rolle",
                      "Unternehmensprofil",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.email}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>
                        {row.role === "network_admin"
                          ? "Kostenlos · keine Vertragslaufzeit"
                          : row.startsAt
                            ? `${date(row.startsAt)} – ${date(row.endsAt)}`
                            : "Noch keine Buchung"}
                      </td>
                      <td>{states[row.status] || row.status}</td>
                      <td>{roles[row.role] || row.role}</td>
                      <td>{row.profile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <p>Noch keine Nutzer oder offenen Einladungen vorhanden.</p>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
