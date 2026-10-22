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
  orderId?: string;
  paymentStatus?: string;
  loginCount?: number;
  lastLoginAt?: string | null;
  loginTrackingStartedAt?: string | null;
};
const roles: Record<string, string> = {
  visitor: "Besucher · nur lesen",
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
  const [visitorAccess, setVisitorAccess] = useState<{
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);
  async function createVisitor() {
    const email = window.prompt(
      `Besucherzugang für ${name}: E-Mail-Adresse`,
      "b04-besucher@b2b-matching.de",
    );
    if (
      !email ||
      !window.confirm(
        `Nur lesenden Besucherzugang für ${email} im Netzwerk ${name} anlegen? Keine eigene Unternehmensseite, keine Schreibrechte, keine Buchung.`,
      )
    )
      return;
    setLoading(true);
    setError("");
    try {
      const result = await portalRequest<{
        email: string;
        password: string;
        loginUrl: string;
      }>(`/networks/admin/${id}/visitors`, {
        token: getPortalSession() || "",
        body: { email },
      });
      setVisitorAccess(result);
      await open();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Besucherzugang konnte nicht angelegt werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function copyPartner() {
    const email = window.prompt(
      "Bestehender Partnerzugang (E-Mail)",
      "mk@hey-five.de",
    );
    if (!email) return;
    const sourceSlug = window.prompt(
      "Quellnetzwerk (Kennung)",
      "bayer04leverkusen",
    );
    if (
      !sourceSlug ||
      !window.confirm(
        `${email}: Partnerseite aus ${sourceSlug} nach ${name} kopieren und veröffentlichen? Kostenloser Partnerzugang, keine Administratorrolle. Bestehende Daten werden nicht überschrieben.`,
      )
    )
      return;
    setLoading(true);
    setError("");
    try {
      await portalRequest(`/networks/admin/${id}/copy-partner`, {
        token: getPortalSession() || "",
        body: { email, sourceSlug },
      });
      await open();
      window.alert(
        "Partnerseite veröffentlicht. Der bestehende Zugang funktioniert jetzt auch in diesem Netzwerk – kostenlos und ohne neue Buchung.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kopieren fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }
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
  async function action(row: Row, action: string, role?: string) {
    const label =
      action === "role"
        ? `Rolle auf ${roles[role || ""] || role} ändern${role === "network_admin" ? " (kostenlos, ohne eigene Unternehmensseite; bestehende Buchung bleibt erhalten)" : ""}`
        : action === "suspend"
          ? "Zugang sperren (Vertrag bleibt bestehen)"
          : action === "activate"
            ? "Sperre aufheben"
            : action === "paid"
              ? "Zahlung als eingegangen markieren"
              : "Zahlung wieder als offen markieren";
    if (!window.confirm(`${name}\n${row.name} · ${row.email}\n\n${label}?`))
      return;
    setError("");
    setLoading(true);
    try {
      await portalRequest(`/networks/admin/${id}/users/action`, {
        token: getPortalSession() || "",
        body: { email: row.email, action, role, orderId: row.orderId },
      });
      await open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
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
        <button
          type="button"
          className="portalSecondary"
          disabled={loading}
          onClick={createVisitor}
        >
          Besucherzugang anlegen
        </button>
        <button
          type="button"
          className="portalSecondary"
          disabled={loading}
          onClick={copyPartner}
        >
          Partnerseite aus anderem Netzwerk übernehmen
        </button>
        {visitorAccess && (
          <section className="panelNote">
            <strong>
              Besucherzugang erstellt – Passwort jetzt sicher übernehmen
            </strong>
            <p>{visitorAccess.email}</p>
            <p>
              Passwort (nur in dieser Ansicht verfügbar):{" "}
              <code>{visitorAccess.password}</code>
            </p>
            <a href={visitorAccess.loginUrl}>Login öffnen</a>
            <button type="button" onClick={() => setVisitorAccess(null)}>
              Zugangsdaten ausblenden
            </button>
          </section>
        )}
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
            <p>
              Login-Daten beziehen sich auf erfolgreiche Anmeldungen am gesamten
              Portal, nicht auf Seitenaufrufe oder Aufenthaltsdauer. Erfassung
              ab Einführung der Funktion; frühere Anmeldungen sind nicht
              rückwirkend verfügbar. Bei gemeinsam genutzten Zugängen ist keine
              Zuordnung zu einzelnen Personen möglich.
            </p>
            <div className="adminUsersTable">
              <table>
                <thead>
                  <tr>
                    {[
                      "Name",
                      "E-Mail-Adresse",
                      "Letzter Login",
                      "Anmeldungen",
                      "Vertragslaufzeit",
                      "Status",
                      "Rolle",
                      "Unternehmensprofil",
                      "Aktionen",
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
                        {row.lastLoginAt
                          ? new Date(row.lastLoginAt).toLocaleString("de-DE", {
                              timeZone: "Europe/Berlin",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : row.loginCount === undefined
                            ? "–"
                            : "Noch kein Login erfasst"}
                      </td>
                      <td
                        title={
                          row.loginTrackingStartedAt
                            ? `Erfasst seit ${new Date(row.loginTrackingStartedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`
                            : undefined
                        }
                      >
                        {row.loginCount ?? "–"}
                      </td>
                      <td>
                        {row.role === "network_admin" || row.role === "visitor"
                          ? "Kostenlos · keine Vertragslaufzeit"
                          : row.startsAt
                            ? `${date(row.startsAt)} – ${date(row.endsAt)}`
                            : "Noch keine Buchung"}
                      </td>
                      <td>{states[row.status] || row.status}</td>
                      <td>{roles[row.role] || row.role}</td>
                      <td>{row.profile}</td>
                      <td>
                        {row.name !== "Noch nicht registriert" && (
                          <details className="adminUserMenu">
                            <summary aria-label={`Aktionen für ${row.email}`}>
                              ⋮
                            </summary>
                            <div>
                              {row.role !== "visitor" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      action(row, "role", "network_admin")
                                    }
                                  >
                                    Kostenloser Netzwerkadmin
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      action(row, "role", "moderator")
                                    }
                                  >
                                    Moderator
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      action(row, "role", "member")
                                    }
                                  >
                                    Partner (regulärer Preis)
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => action(row, "suspend")}
                              >
                                Zugang sperren
                              </button>
                              <button
                                type="button"
                                onClick={() => action(row, "activate")}
                              >
                                Sperre aufheben
                              </button>
                              {row.orderId && (
                                <>
                                  <small>
                                    Zahlung:{" "}
                                    {row.paymentStatus === "paid"
                                      ? "bezahlt"
                                      : "offen"}
                                  </small>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      action(
                                        row,
                                        row.paymentStatus === "paid"
                                          ? "unpaid"
                                          : "paid",
                                      )
                                    }
                                  >
                                    {row.paymentStatus === "paid"
                                      ? "Zahlung wieder offen"
                                      : "Zahlung eingegangen"}
                                  </button>
                                </>
                              )}
                            </div>
                          </details>
                        )}
                      </td>
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
