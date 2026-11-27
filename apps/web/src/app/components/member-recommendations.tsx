"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import {partnerBranding} from '../lib/partner-branding';
import "../member-recommendations.css";
export type MemberRecommendation = {
  id: string;
  senderId: string;
  recipientId: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  description: string;
  createdAt: string;
  revision: number;
  amountNet?: number;
  publishRevenue?: boolean;
  milestones: Record<string, string>;
  history: { action: string; at: string; comment: string }[];
};
const labels: Record<string, string> = {
  sent: "Empfohlen",
  read: "Geöffnet",
  accepted: "Angenommen",
  thanked: "Bedankt",
  answered: "Beantwortet",
  contact: "Kontakt entstanden",
  declined: "Abgelehnt",
  deal: "Geschäft entstanden",
};
const stamp = (v?: string) =>
  v ? new Date(v).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : "–";
export function RecommendationButton({
  threadId,
  onEnsureThread,
  onUpdate,
}: {
  threadId?: string;
  onEnsureThread?: () => Promise<string>;
  onUpdate: (threadId: string) => void;
}) {
  const access = useNetworkAccess(),
    dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  if (access?.features?.recommendations === false || access?.readOnly)
    return null;
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!access || (!threadId && !onEnsureThread) || busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const id = threadId || (await onEnsureThread!());
      await portalRequest(
        `/networks/${access.networkId}/content/${id}/recommendations`,
        {
          token: getPortalSession() || "",
          body: {
            company: form.get("company"),
            contact: form.get("contact"),
            email: form.get("email"),
            phone: form.get("phone"),
            description: form.get("description"),
            sharingConfirmed: form.get("sharingConfirmed") === "on",
          },
        },
      );
      setOpen(false);
      onUpdate(id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Empfehlung konnte nicht gesendet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="recommendationTrigger"
        style={partnerBranding(access)}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!threadId && !onEnsureThread}
        title={
          !threadId && !onEnsureThread
            ? "Empfehlungen sind in einem offenen Einzelgespräch möglich."
            : undefined
        }
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6m-3-3h6"/></svg>
        Empfehlung
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="recommendationDialog"
          style={partnerBranding(access)}
          onCancel={() => setOpen(false)}
        >
          <form onSubmit={send}>
            <header>
              <h2>Kontakt empfehlen</h2>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <p>
              Die Empfehlung geht an Ihren Gesprächspartner. Die Netzwerkleitung
              kann diese Empfehlung und den Bearbeitungsverlauf einsehen, nicht
              Ihre übrigen Chatnachrichten. Im Netzwerk-Puls erscheinen nur die
              beteiligten Mitglieder.
            </p>
            <div className="recommendationFields">
              {[
                ["company", "Unternehmen", "text", 200],
                ["contact", "Ansprechpartner", "text", 200],
                ["email", "E-Mail-Adresse", "email", 254],
                ["phone", "Rufnummer", "tel", 80],
              ].map(([name, label, type, max]) => (
                <label key={name}>
                  {label}
                  <input
                    name={String(name)}
                    type={String(type)}
                    maxLength={Number(max)}
                    required
                  />
                </label>
              ))}
            </div>
            <label>
              Worum geht es?
              <textarea name="description" required maxLength={2000} rows={4} />
            </label>
            <label className="recommendationCheck">
              <input name="sharingConfirmed" type="checkbox" required />
              Ich darf diese Kontaktdaten an den Empfänger und die
              Netzwerkleitung weitergeben.
            </label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Wird gesendet …" : "Empfehlung senden"}
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
export function RecommendationCard({
  entry,
  threadId,
  onUpdate,
}: {
  entry: MemberRecommendation;
  threadId: string;
  onUpdate: () => void;
}) {
  const access = useNetworkAccess(),
    [expanded, setExpanded] = useState(false),
    [action, setAction] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const recipient = entry.recipientId === access?.currentUserId,
    canRespond =
      recipient &&
      !access?.readOnly &&
      access?.features?.recommendations !== false;
  async function respond(
    kind: string,
    comment = "",
    amountNet?: number,
    publishRevenue = false,
  ) {
    if (!access || busy) return;
    setBusy(true);
    setError("");
    try {
      await portalRequest(
        `/networks/${access.networkId}/content/${threadId}/recommendations/${entry.id}`,
        {
          token: getPortalSession() || "",
          body: {
            action: kind,
            revision: entry.revision,
            comment,
            amountNet,
            publishRevenue,
          },
        },
      );
      if (kind === "read") setExpanded(true);
      setAction("");
      onUpdate();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Rückmeldung konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recommendationCard">
      <strong>Empfehlung {recipient ? "für Sie" : "gesendet"}</strong>
      <p>{stamp(entry.createdAt)}</p>
      {!expanded && recipient ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            entry.milestones.read ? setExpanded(true) : void respond("read")
          }
        >
          Empfehlung öffnen
        </button>
      ) : (
        <>
          <h3>{entry.company}</h3>
          <p>
            {entry.contact}
            <br />
            <a href={`mailto:${entry.email}`}>{entry.email}</a>
            <br />
            <a href={`tel:${entry.phone.replace(/[^+0-9]/g, "")}`}>
              {entry.phone}
            </a>
          </p>
          <p className="recommendationDescription">{entry.description}</p>
        </>
      )}
      <ul>
        {entry.history
          .filter((h) => h.action !== "sent")
          .map((h) => (
            <li key={h.action}>
              {labels[h.action]} · {stamp(h.at)}
              {h.comment && <p>{h.comment}</p>}
            </li>
          ))}
      </ul>
      {expanded && canRespond && !entry.milestones.declined && (
        <div className="recommendationActions">
          {[
            "accepted",
            "thanked",
            "answered",
            "contact",
            "deal",
            "declined",
          ].map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={
                busy ||
                Boolean(entry.milestones[kind]) ||
                (kind === "deal" && !entry.milestones.contact) ||
                (kind === "declined" && Boolean(entry.milestones.contact))
              }
              onClick={() =>
                ["answered", "contact", "deal", "declined"].includes(kind)
                  ? setAction(kind)
                  : void respond(kind)
              }
            >
              {labels[kind]}
            </button>
          ))}
        </div>
      )}
      {action && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void respond(
              action,
              String(f.get("comment") || ""),
              action === "deal"
                ? Number(String(f.get("amount")).replace(",", "."))
                : undefined,
              f.get("publish") === "on",
            );
          }}
        >
          <h4>{labels[action]}</h4>
          <label>
            Ihre Rückmeldung
            <textarea name="comment" required maxLength={2000} rows={3} />
          </label>
          {action === "deal" && (
            <>
              <label>
                Gesamtumsatz netto (€)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.01"
                  required
                />
              </label>
              <label className="recommendationCheck">
                <input name="publish" type="checkbox" />
                Diesen Betrag zur Umsatzsumme im Netzwerk-Hero hinzufügen. Ohne
                Freigabe bleibt der Betrag intern.
              </label>
            </>
          )}
          <button type="submit" disabled={busy}>
            Rückmeldung speichern
          </button>
          <button type="button" onClick={() => setAction("")}>
            Abbrechen
          </button>
        </form>
      )}
      {entry.milestones.deal && (
        <p>
          Gemeldeter Umsatz:{" "}
          {entry.amountNet?.toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          })}{" "}
          netto ·{" "}
          {entry.publishRevenue
            ? "Zur Veröffentlichung freigegeben"
            : "Nicht veröffentlicht"}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
type Row = MemberRecommendation & {
  threadId: string;
  people: { userId: string; name: string; company: string }[];
};
export function RecommendationsOverview() {
  const access = useNetworkAccess(),
    [data, setRows] = useState<Row[]>([]),
    [loadedNetwork, setLoadedNetwork] = useState(""),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  useEffect(() => {
    setLoadedNetwork("");
    setRows([]);
    setError("");
    if (!access?.networkId || !access.isInitiator) return;
    let active = true;
    const load = () =>
      portalRequest<Row[]>(`/networks/${access.networkId}/recommendations`, {
        token: getPortalSession() || "",
      })
        .then((r) => {
          if (active) {
            setRows(r);
            setLoadedNetwork(access.networkId);
            setError("");
          }
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "Übersicht nicht verfügbar.",
            );
        });
    void load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [access?.networkId, access?.isInitiator]);
  if (!access?.isInitiator)
    return (
      <p>
        Diese Übersicht ist ausschließlich für die Netzwerkleitung verfügbar.
      </p>
    );
  const rows = loadedNetwork === access.networkId ? data : [];
  const name = (r: Row, id: string) => {
    const p = r.people.find((p) => p.userId === id);
    return p ? `${p.name} · ${p.company}` : "Ehemaliges Mitglied";
  };
  const grouped = Array.from(new Set(rows.map((r) => r.recipientId))).map(
    (id) => ({
      id,
      name: name(
        rows.find((r) => r.recipientId === id)!,
        id,
      ),
      received: rows.filter((r) => r.recipientId === id).length,
      unopened: rows.filter((r) => r.recipientId === id && !r.milestones.read)
        .length,
      noFeedback: rows.filter(
        (r) =>
          r.recipientId === id &&
          !Object.keys(r.milestones).some((k) => k !== "read"),
      ).length,
    }),
  );
  return (
    <section className="networkCard recommendationOverview">
      <h2>Empfehlungen im Überblick</h2>
      <p>
        Nur Empfehlungen und die vom Empfänger dokumentierten Rückmeldungen –
        keine übrigen Chatinhalte. „Geöffnet“ bedeutet, dass die Empfehlung im
        Portal geöffnet wurde; eine tatsächliche Kontaktaufnahme wird vom
        Empfänger selbst bestätigt.
      </p>
      <div className="recommendationSummary">
        {[
          ["Empfehlungen", rows.length],
          ["Geöffnet", rows.filter((r) => r.milestones.read).length],
          [
            "Kontakt entstanden",
            rows.filter((r) => r.milestones.contact).length,
          ],
          ["Geschäfte", rows.filter((r) => r.milestones.deal).length],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <h3>Rückmeldungen je Empfänger</h3>
      <div className="recommendationTable">
        <table>
          <thead>
            <tr>
              <th>Mitglied / Unternehmen</th>
              <th>Erhalten</th>
              <th>Noch nicht geöffnet</th>
              <th>Ohne Rückmeldung</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.received}</td>
                <td>{g.unopened}</td>
                <td>{g.noFeedback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label>
        Empfehlungen durchsuchen
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Unternehmen, Mitglied oder Kontakt"
        />
      </label>
      <div className="recommendationList">
        {rows
          .filter((r) =>
            `${r.company} ${r.contact} ${r.email} ${r.description} ${name(r, r.senderId)} ${name(r, r.recipientId)}`
              .toLocaleLowerCase("de")
              .includes(query.toLocaleLowerCase("de")),
          )
          .map((r) => (
            <details key={r.id}>
              <summary>
                {r.company} · {name(r, r.senderId)} an {name(r, r.recipientId)}{" "}
                · {stamp(r.createdAt)}
              </summary>
              <p>
                {r.contact} · {r.email} · {r.phone}
              </p>
              <p>{r.description}</p>
              <dl>
                {Object.entries(labels).map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {stamp(key === "sent" ? r.createdAt : r.milestones[key])}
                    </dd>
                  </div>
                ))}
              </dl>
              <ul>
                {r.history.map((h, i) => (
                  <li key={i}>
                    {labels[h.action]} · {stamp(h.at)} {h.comment}
                  </li>
                ))}
              </ul>
              {r.milestones.deal && (
                <p>
                  Netto-Umsatz:{" "}
                  {r.amountNet?.toLocaleString("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  })}{" "}
                  · {r.publishRevenue ? "Veröffentlicht" : "Intern"}
                </p>
              )}
            </details>
          ))}
      </div>
      {!rows.length && !error && <p>Noch keine Empfehlungen vorhanden.</p>}
    </section>
  );
}
