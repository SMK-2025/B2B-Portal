"use client";
import { useEffect, useRef, useState } from "react";
import { ServiceMemberForm } from "./service-member-form";
import { NetworkProfileWorkspace } from "./network-profile-workspace";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { InvoiceDownload, type BillingInvoice } from "./admin-network-billing";
type Row = {
  service?: {
    sentAt: string | null;
    claimedAt: string | null;
    invoicedAt: string | null;
    individual: boolean;
    invoiceEmail?: string;
    months?: number;
    grossCents?: number;
  };
  userId?: string;
  admissionStatus?: string;
  company?: string;
  affiliation?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  profile: string;
  orderId?: string;
  orderIds?: string[];
  paidAt?: string | null;
  paymentStatus?: string;
  centrallyFunded?: boolean;
  complimentaryAccess?: boolean;
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
  const [creating, setCreating] = useState(false),
    [editor, setEditor] = useState(""),
    [serviceNotice, setServiceNotice] = useState("");
  async function serviceAction(row: Row, kind: "invoice" | "handover") {
    const resend =
      kind === "invoice" ? !!row.service?.invoicedAt : !!row.service?.sentAt;
    const details =
      kind === "invoice" && row.service
        ? `\n${row.company || row.name} · ${row.service.invoiceEmail}\n${row.service.months} Monate · ${((row.service.grossCents || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} inkl. MwSt.\n`
        : "";
    if (
      !window.confirm(
        `${name} · ${row.name} (${row.email})\n${details}${kind === "handover" ? (resend ? "Neuen Übergabelink senden und bisherigen Link ersetzen?" : "Einrichtung abschließen und Zugangsmail senden?") : resend ? "Dieselbe Rechnung erneut an die Rechnungsadresse senden?" : "Netzwerknutzung jetzt an die vereinbarte Rechnungsadresse fakturieren und versenden?"}`,
      )
    )
      return;
    setLoading(true);
    setServiceNotice("");
    try {
      await portalRequest(
        `/networks/admin/${id}/service-members/${row.userId}/${kind}`,
        { token: getPortalSession() || "", body: { resend } },
      );
      setServiceNotice(
        kind === "invoice"
          ? "Rechnungsversand bestätigt."
          : "Übergabemail versendet.",
      );
      await open();
    } catch (e) {
      setServiceNotice(
        e instanceof Error ? e.message : "Versand fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoiceError, setInvoiceError] = useState("");
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
      setInvoiceError("");
      setInvoices([]);
      try {
        const billing = await portalRequest<{ invoices: BillingInvoice[] }>(
          `/networks/admin/${id}/billing`,
          { token: getPortalSession() || "" },
        );
        setInvoices(billing.invoices);
      } catch {
        setInvoiceError(
          "Rechnungen konnten nicht geladen werden. Bitte die Nutzerübersicht erneut öffnen.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nutzer konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function action(row: Row, action: string, role?: string) {
    if (
      action === "deleteUser" &&
      window.prompt(
        `Zugang und persönliche Netzwerkdaten von ${row.name} aus „${name}“ endgültig löschen? Andere Netzwerkzugänge bleiben erhalten. Beim letzten Zugang wird auch das Konto gelöscht. Zur Bestätigung die E-Mail-Adresse eingeben:`,
      ) !== row.email
    )
      return;
    const label =
      action === "deleteUser"
        ? "Netzwerkzugang endgültig löschen"
        : action === "role"
          ? `Rolle auf ${roles[role || ""] || role} ändern${role === "network_admin" ? " (kostenlos, ohne eigene Unternehmensseite; bestehende Buchung bleibt erhalten)" : ""}`
          : action === "suspend"
            ? "Zugang sperren (Vertrag bleibt bestehen)"
            : action === "activate"
              ? "Sperre aufheben"
              : action === "paid"
                ? "Zahlung als eingegangen markieren"
                : "Zahlung wieder als offen markieren";
    if (
      !window.confirm(
        `${name}\n${row.name} · ${row.email}\n\n${action === "approveRequest" ? "Teilnahmeanfrage freigeben und Einladung senden" : action === "rejectRequest" ? "Teilnahmeanfrage ablehnen" : label}?`,
      )
    )
      return;
    setError("");
    setLoading(true);
    try {
      await portalRequest(`/networks/admin/${id}/users/action`, {
        token: getPortalSession() || "",
        body: {
          email: row.email,
          action,
          role,
          orderId: row.orderId,
          ...(action === "deleteUser"
            ? {
                confirmUserId: row.userId,
                confirmEmail: row.email,
                confirmNetwork: id,
              }
            : {}),
        },
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
          onClick={() => {
            setCreating(true);
            setEditor("");
          }}
        >
          Mitglied im Auftrag einrichten
        </button>
        {creating && (
          <ServiceMemberForm
            id={id}
            name={name}
            cancel={() => setCreating(false)}
            done={() => {
              setCreating(false);
              setServiceNotice(
                "Serviceauftrag angelegt. Es wurde keine E-Mail versendet.",
              );
              void open();
            }}
          />
        )}
        {serviceNotice && <p role="status">{serviceNotice}</p>}
        {editor && (
          <section>
            <button onClick={() => setEditor("")}>Editor schließen</button>
            <NetworkProfileWorkspace
              key={editor}
              service={{ networkId: id, userId: editor }}
            />
          </section>
        )}
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
                      "Aktionen",
                      "Name",
                      "E-Mail-Adresse",
                      "Letzter Login",
                      "Anmeldungen",
                      "Vertragslaufzeit",
                      "Status",
                      "Rolle",
                      "Unternehmensprofil",
                      "Zahlung",
                      "Rechnungen",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.email}>
                      <td>
                        {row.name !== "Noch nicht registriert" && (
                          <details className="adminUserMenu">
                            <summary aria-label={`Aktionen für ${row.email}`}>
                              ⋮
                            </summary>
                            <div>
                              {row.service && (
                                <>
                                  {!row.service.sentAt && (
                                    <button
                                      onClick={() => {
                                        setCreating(false);
                                        setEditor(row.userId!);
                                      }}
                                    >
                                      Partnerseite im Auftrag bearbeiten
                                    </button>
                                  )}
                                  {!row.service.claimedAt && (
                                    <button
                                      disabled={loading}
                                      onClick={() =>
                                        serviceAction(row, "handover")
                                      }
                                    >
                                      {row.service.sentAt
                                        ? "Übergabelink erneut senden"
                                        : "Einrichtung abschließen & Zugang senden"}
                                    </button>
                                  )}
                                  {row.service.individual && !row.service.invoicedAt && row.paymentStatus !== "paid" && (
                                    <button disabled={loading} onClick={async () => {
                                      if (!window.confirm(name + " · " + row.email + ": Diesen Zugang dauerhaft beitragsfrei stellen? Die offene Buchung wird aufgehoben.")) return;
                                      setLoading(true);
                                      try { await portalRequest(`/networks/admin/${id}/service-members/${row.userId}/complimentary`, {token:getPortalSession() || "", body:{}});
                                        await open(); setServiceNotice("Der Mitgliedszugang ist jetzt beitragsfrei.");
                                      } catch(e) { setServiceNotice(e instanceof Error ? e.message : "Änderung fehlgeschlagen."); }
                                      finally { setLoading(false); }
                                    }}>Mitglied beitragsfrei stellen</button>
                                  )}
                                  {row.service.individual && (
                                    <button
                                      disabled={loading || !row.service.sentAt}
                                      onClick={() =>
                                        serviceAction(row, "invoice")
                                      }
                                    >
                                      {row.service.invoicedAt
                                        ? "Rechnung erneut senden"
                                        : "Rechnung für Netzwerknutzung senden"}
                                    </button>
                                  )}
                                </>
                              )}
                              {row.admissionStatus === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      action(row, "approveRequest")
                                    }
                                  >
                                    Teilnahme freigeben
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => action(row, "rejectRequest")}
                                  >
                                    Anfrage ablehnen
                                  </button>
                                </>
                              )}
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
                            {row.userId && (
                              <button
                                type="button"
                                className="portalReject"
                                disabled={loading}
                                onClick={() => action(row, "deleteUser")}
                              >
                                Zugang und Daten löschen
                              </button>
                            )}
                          </details>
                        )}
                      </td>
                      <td>
                        {row.name}
                        {row.company && (
                          <>
                            <br />
                            {row.company}
                            <br />
                            {row.affiliation}
                          </>
                        )}
                      </td>
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
                          : row.complimentaryAccess ? "Kostenloser Mitgliedszugang" : row.centrallyFunded
                            ? "Zentrale Abrechnung mit Netzwerk"
                            : row.startsAt
                              ? `${date(row.startsAt)} – ${date(row.endsAt)}`
                              : "Noch keine Buchung"}
                      </td>
                      <td>
                        {states[row.status] || row.status}
                        {row.service?.sentAt && (
                          <>
                            <br />
                            Zugangsmail:{" "}
                            {new Date(row.service.sentAt).toLocaleString(
                              "de-DE",
                            )}
                          </>
                        )}
                        {row.service?.invoicedAt && (
                          <>
                            <br />
                            Rechnung versendet: {date(row.service.invoicedAt)}
                          </>
                        )}
                      </td>
                      <td>{roles[row.role] || row.role}</td>
                      <td>{row.profile}</td>
                      <td>
                        {row.paymentStatus === "paid" ? (
                          <strong style={{ color: "#166534" }}>
                            ✓ Gezahlt
                            {row.paidAt && (
                              <>
                                <br />
                                {date(row.paidAt)}
                              </>
                            )}
                          </strong>
                        ) : row.orderId ? (
                          row.paymentStatus === "overdue" ? (
                            "Überfällig"
                          ) : (
                            "Offen"
                          )
                        ) : row.complimentaryAccess ? "Beitragsfrei" : row.centrallyFunded ? (
                          "Netzwerk zahlt zentral"
                        ) : (
                          "Keine Buchung"
                        )}
                      </td>
                      <td>
                        {invoices
                          .filter((i) =>
                            (row.orderIds || [row.orderId]).includes(
                              i.order_id,
                            ),
                          )
                          .map((i) => (
                            <InvoiceDownload key={i.id} invoice={i} />
                          ))}
                        {!invoices.some((i) =>
                          (row.orderIds || [row.orderId]).includes(i.order_id),
                        ) &&
                          (invoiceError ||
                            (row.complimentaryAccess ? "Keine Rechnung erforderlich" : row.centrallyFunded
                              ? "Siehe Zahlungsdetails des Netzwerks"
                              : "Noch keine Rechnung erstellt"))}
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
