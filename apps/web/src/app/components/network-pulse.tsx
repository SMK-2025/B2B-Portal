"use client";
import "../network-pulse.css";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { ProfileDialog, type Member } from "./network-members-workspace";
export type ChatPulseState = {
  amountNet?: number;
  revision: number;
  stage: string;
  publicText: string;
  approvals: string[];
  hiddenBy: string[];
  history: { stage: string; comment: string; at: string }[];
};
const labels: Record<string, string> = {
  chat: "Im gemeinsamen Chat",
  offer: "Angebot",
  negotiation: "Verhandlungen",
  accepted: "Kooperation vereinbart",
  declined: "Angebot abgelehnt",
};
export function ChatCooperation({
  networkId,
  thread,
  onUpdate,
}: {
  networkId: string;
  thread: {
    id: string;
    currentUserId?: string;
    data: { networkPulse?: ChatPulseState; directChat?: boolean };
  };
  onUpdate: () => void;
}) {
  const access = useNetworkAccess();
  const [open, setOpen] = useState(false),
    [stage, setStage] = useState("offer"),
    [comment, setComment] = useState(""),
    [publicText, setPublicText] = useState(""),
    [amount, setAmount] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const s = thread.data.networkPulse;
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await portalRequest(`/networks/${networkId}/content/${thread.id}/pulse`, {
        token: getPortalSession() || "",
        body: { ...body, revision: s?.revision || 0 },
      });
      onUpdate();
      setOpen(false);
      setComment("");
      setPublicText("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Status konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!thread.data.directChat || access?.readOnly) return null;
  return (
    <section className="chatCooperation">
      <div className="pulseHeading">
        <div>
          <small>ZUSAMMENARBEIT</small>
          <strong>{labels[s?.stage || "chat"]}</strong>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Status & Freigabe
        </button>
      </div>
      {open && (
        <div className="pulseEditor">
          <p>
            Nachrichten und Kommentare bleiben vertraulich. Eine Beschreibung
            sehen andere Mitglieder erst nach eurer gemeinsamen Freigabe.
          </p>
          <label className="pulseCheck">
            <input
              type="checkbox"
              checked={Boolean(
                s && !s.hiddenBy.includes(thread.currentUserId || ""),
              )}
              disabled={busy}
              onChange={(e) =>
                void act({ action: "visibility", visible: e.target.checked })
              }
            />
            Allgemeinen Chat-Status im Netzwerk-Puls anzeigen. Jeder
            Gesprächspartner kann die Anzeige ausblenden.
          </label>
          {Boolean(s?.hiddenBy.length) && (
            <p>Die Anzeige im Netzwerk ist derzeit ausgeblendet.</p>
          )}
          {s?.amountNet !== undefined && <p>Interner Auftragswert: {s.amountNet.toLocaleString('de-DE',{style:'currency',currency:'EUR'})} netto. Nicht im Netzwerk sichtbar.</p>}
          <div className="pulseActions">
            {["offer", "negotiation", "accepted", "declined"].map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={stage === key}
                onClick={() => setStage(key)}
              >
                {labels[key]}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act({
                action: "status",
                stage,
                comment,
                publicText,
                ...(amount ? { amountNet: Number(amount) } : {}),
              });
            }}
          >
            <label>
              Interner Kommentar zum Status
              <textarea
                required
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Was hat sich geändert? Nur für euch beide sichtbar."
              />
            </label>
            {stage !== "declined" && (
              <label>
                {stage === "accepted"
                  ? "Gemeinsame Beschreibung der Kooperation"
                  : "Beschreibung zur optionalen Veröffentlichung"}
                <textarea
                  required={stage === "accepted"}
                  maxLength={1000}
                  value={publicText}
                  onChange={(e) => setPublicText(e.target.value)}
                  placeholder="Welche Leistung oder Zusammenarbeit möchtet ihr vorstellen?"
                />
              </label>
            )}
            <p>
              {stage === "accepted"
                ? "Die Gegenseite bestätigt den Text. Danach erscheint „Kooperation vereinbart“ auch am schwarzen Brett."
                : "Ohne gemeinsam bestätigte Beschreibung sieht das Netzwerk nur „Im gemeinsamen Chat“. Ablehnungen werden nicht veröffentlicht."}
            </p>
            {stage === "accepted" && (
              <label>
                Auftragswert netto in € (optional, nur intern)
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            )}
            <button disabled={busy} type="submit">
              Status speichern
            </button>
          </form>
          {s?.publicText &&
            !s.approvals.includes(thread.currentUserId || "") && (
              <div className="pulseProposal">
                <strong>Vorschlag zur gemeinsamen Veröffentlichung</strong>
                <p>
                  {labels[s.stage]}: {s.publicText}
                </p>
                <button
                  disabled={busy}
                  onClick={() => void act({ action: "confirm" })}
                >
                  Text & Veröffentlichung bestätigen
                </button>
              </div>
            )}
          {s?.publicText &&
            s.approvals.length === 1 &&
            s.approvals.includes(thread.currentUserId || "") && (
              <p>Bestätigung des Gesprächspartners steht noch aus.</p>
            )}
          {s?.history?.length ? (
            <details>
              <summary>Interner Statusverlauf</summary>
              {s.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <p key={i}>
                    <strong>{labels[h.stage]}</strong> ·{" "}
                    {new Date(h.at).toLocaleDateString("de-DE")}
                    <br />
                    {h.comment}
                  </p>
                ))}
            </details>
          ) : null}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
type Entry = {
  id: string;
  stage: string;
  text: string;
  at: string;
  partners: {
    name: string;
    company: string;
    logoUrl: string | null;
    membershipId?: string;
  }[];
};
export function NetworkPulse() {
  const [profile, setProfile] = useState<Member | null>(null);
  async function openProfile(id?: string) {
    if (!id || !access?.networkId) return;
    try {
      const member = await portalRequest<Member>(
        `/networks/${access.networkId}/memberships/${encodeURIComponent(id)}`,
        { token: getPortalSession() || "" },
      );
      if (member.organization?.networkProfile?.status === "published")
        setProfile(member);
      else setError("Dieses Unternehmen hat noch keine veröffentlichte Seite.");
    } catch {
      setError("Die Unternehmensseite ist derzeit nicht verfügbar.");
    }
  }
  const access = useNetworkAccess(),
    [days, setDays] = useState(30),
    [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!access?.networkId) return;
    let active = true;
    setEntries([]);
    setError("");
    async function load() {
      try {
        const data = await portalRequest<Entry[]>(
          `/networks/${access!.networkId}/pulse?days=${days}`,
          { token: getPortalSession() || "" },
        );
        if (active) setEntries(data);
      } catch {
        if (active) setError("Der Netzwerk-Puls ist gerade nicht verfügbar.");
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [access?.networkId, days]);
  return (
    <section className="networkPulse networkCard">
      <header className="pulseHeading">
        <div>
          <small>GEMEINSAM MEHR ERREICHEN</small>
          <h2>Netzwerk-Puls</h2>
          <p>
            Hier kommen Mitglieder ins Gespräch und bringen Zusammenarbeit auf
            den Weg.
          </p>
        </div>
        <label>
          Zeitraum
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} Tage
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="pulseTimeline">
        {error ? (
          <p role="status">{error}</p>
        ) : entries.length ? (
          entries.map((item) => (
            <article key={item.id}>
              <span className="pulseBadge">{labels[item.stage]}</span>
              <div className="pulsePartners">
                {item.partners.map((p, i) => (
                  <span key={i}>
                    <button
                      className="pulseProfileButton"
                      onClick={() => void openProfile(p.membershipId)}
                    >
                      {p.logoUrl && <img src={p.logoUrl} alt="" />}
                      <strong>{p.company || p.name}</strong>
                    </button>
                    {i === 0 && <b> × </b>}
                  </span>
                ))}
              </div>
              {item.text && <p>{item.text}</p>}
              <time dateTime={item.at}>
                {new Date(item.at).toLocaleDateString("de-DE")}
              </time>
            </article>
          ))
        ) : (
          <p>
            Noch keine freigegebenen Aktivitäten in diesem Zeitraum. Ein guter
            Kontakt beginnt mit einem Gespräch.
          </p>
        )}
      </div>
      <small>
        Nur Status und gemeinsam freigegebene Beschreibungen – keine
        Chat-Inhalte.
      </small>
      {profile && (
        <ProfileDialog member={profile} onClose={() => setProfile(null)} />
      )}
    </section>
  );
}
