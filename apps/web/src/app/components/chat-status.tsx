"use client";
import "../network-pulse.css";
import { useEffect, useRef, useState } from "react";
import { portalRequest, getPortalSession } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import type { ChatPulseState } from "./network-pulse";
const labels: Record<string, string> = {
  chat: "Im Gespräch",
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
    data: {
      directChat?: boolean;
      networkPulse?: ChatPulseState;
      messages?: { kind: string; userId: string }[];
    };
  } | null;
  onUpdate: () => void;
}) {
  const access = useNetworkAccess(),
    dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [stage, setStage] = useState("offer"),
    [comment, setComment] = useState(""),
    [privateOnly, setPrivateOnly] = useState(false),
    [amount, setAmount] = useState(""),
    [publishAmount, setPublishAmount] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const s = thread?.data.networkPulse;
  const ready = Boolean(
    thread?.data.directChat &&
    new Set(
      (thread.data.messages || [])
        .filter((m) => m.kind === "message")
        .map((m) => m.userId),
    ).size === 2,
  );
  const pending = Boolean(
    s?.publicText && !s.approvals.includes(thread?.currentUserId || ""),
  );
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function act(body: Record<string, unknown>) {
    if (!thread) return;
    setBusy(true);
    setError("");
    try {
      await portalRequest(`/networks/${networkId}/content/${thread.id}/pulse`, {
        token: getPortalSession() || "",
        body: { ...body, revision: s?.revision || 0 },
      });
      onUpdate();
      setOpen(false);
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
  if (thread && !thread.data.directChat) return null;
  return (
    <section className="chatCooperation">
      <label className="chatStatusLabel">
        Gesprächsstatus
        <select
          aria-label="Gesprächsstatus ändern"
          value={ready ? s?.stage || "chat" : ""}
          disabled={!ready || access?.readOnly || busy}
          onChange={(e) => {
            setStage(e.target.value);
            setComment("");
            setPrivateOnly(false);
            setAmount("");
            setPublishAmount(false);
            setError("");
            setOpen(true);
          }}
        >
          {!ready && (
            <option value="">
              {thread ? "Wartet auf Antwort" : "Noch kein Gespräch"}
            </option>
          )}
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {pending && (
        <button
          type="button"
          onClick={() => {
            setStage(s!.stage);
            setOpen(true);
          }}
        >
          Freigabe prüfen
        </button>
      )}
      <dialog
        ref={dialog}
        className="chatStatusDialog"
        onCancel={() => setOpen(false)}
      >
        <header>
          <div>
            <small>ZUSAMMENARBEIT</small>
            <h2>{labels[stage]}</h2>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act({
              action: "status",
              stage,
              comment,
              publish: !privateOnly,
              publicText: privateOnly || stage === "declined" ? "" : comment,
              ...(amount ? { amountNet: Number(amount) } : {}),
              publishAmount: !privateOnly && publishAmount,
            });
          }}
        >
          <label>
            Was hat sich geändert?
            <textarea
              required
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Beschreibe kurz den aktuellen Stand."
            />
          </label>
          <label className="pulseCheck">
            <input
              type="checkbox"
              checked={privateOnly}
              onChange={(e) => setPrivateOnly(e.target.checked)}
            />
            Nicht veröffentlichen
          </label>
          <p>
            {privateOnly || stage === "declined"
              ? "Diese Notiz sehen nur die beiden Gesprächspartner."
              : "Beide sehen die Notiz im Chat. Andere Mitglieder sehen sie erst nach gemeinsamer Freigabe."}
          </p>
          {pending && (
            <aside className="pulseProposal">
              <strong>Vorschlag des Gesprächspartners</strong>
              <p>{s?.publicText}</p>
              {s?.publishAmount && s.amountNet !== undefined && (
                <p>
                  Zur Veröffentlichung freigegebener Umsatz:{" "}
                  {s.amountNet.toLocaleString("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  })}{" "}
                  netto.
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void act({ action: "confirm" })}
              >
                Veröffentlichung bestätigen
              </button>
            </aside>
          )}
          {stage === "accepted" && (
            <>
              <label>
                Umsatz netto in € (optional)
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="pulseCheck">
                <input
                  type="checkbox"
                  checked={publishAmount}
                  disabled={privateOnly || !amount}
                  onChange={(e) => setPublishAmount(e.target.checked)}
                />
                Diesen Umsatz gemeinsam zur Veröffentlichung freigeben
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <footer>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </button>
            <button type="submit" disabled={busy}>
              {busy ? "Wird gespeichert …" : "Status speichern"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
