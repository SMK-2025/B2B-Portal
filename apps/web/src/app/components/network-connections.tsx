"use client";
import { NetworkText } from "./network-text-editor";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
type Connection = {
  id: string;
  senderId: string;
  recipientId: string;
  status: "pending" | "accepted" | "declined";
  peerName: string;
};
function useConnections() {
  const access = useNetworkAccess();
  const [items, setItems] = useState<Connection[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const base = `/networks/${access?.networkId}/connections`;
  async function load() {
    if (!access?.networkId) return;
    try {
      setItems(
        await portalRequest<Connection[]>(base, {
          token: getPortalSession() || "",
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Vernetzungen nicht verfügbar.",
      );
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener("network-connections-updated", refresh);
    return () =>
      window.removeEventListener("network-connections-updated", refresh);
  }, [access?.networkId]);
  async function act(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await portalRequest(base + path, {
        token: getPortalSession() || "",
        body,
      });
      await load();
      window.dispatchEvent(new Event("network-connections-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return { access, items, error, busy, act };
}
export function NetworkConnectionButton({
  userId,
  label = "Vernetzung anfragen",
}: {
  userId: string;
  label?: string;
}) {
  const { access, items, error, busy, act } = useConnections();
  if (
    !access ||
    access.readOnly ||
    access.role === "platform_admin" ||
    userId === access.currentUserId
  )
    return null;
  const current = items.find((i) =>
    [i.senderId, i.recipientId].includes(userId),
  );
  return (
    <div className="networkConnectionControl">
      <button
        type="button"
        className="networkSecondary"
        disabled={busy || Boolean(current)}
        onClick={() => void act("", { recipientId: userId })}
      >
        {current?.status === "accepted"
          ? "✓ Vernetzt"
          : current?.status === "declined"
            ? "Anfrage abgeschlossen"
            : current
              ? current.senderId === access.currentUserId
                ? "Anfrage gesendet"
                : "Anfrage erhalten"
              : label}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
export function NetworkConnectionInbox() {
  const { access, items, error, busy, act } = useConnections();
  if (!access || access.readOnly || access.role === "platform_admin")
    return null;
  const received = items.filter(
    (i) => i.recipientId === access.currentUserId && i.status === "pending",
  );
  return (
    <section
      className="networkConnectionInbox"
      aria-label="Vernetzungsanfragen"
    >
      <h3>
        <NetworkText id="ui.network-connections.3cebba1c8bdabe06">
          Vernetzungsanfragen
        </NetworkText>
      </h3>
      {received.length ? (
        received.map((i) => (
          <div key={i.id}>
            <strong>{i.peerName}</strong>
            <p>
              <NetworkText id="ui.network-connections.b89d4aa4cf9392ad">
                Interessiert sich für deine Leistungen und möchte sich mit dir
                vernetzen.
              </NetworkText>
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void act(`/${i.id}/decision`, { status: "accepted" })
              }
            >
              <NetworkText id="ui.network-connections.3d9ac3f1c8e75b99">
                Annehmen
              </NetworkText>
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void act(`/${i.id}/decision`, { status: "declined" })
              }
            >
              <NetworkText id="ui.network-connections.7be75ced71620109">
                Ablehnen
              </NetworkText>
            </button>
          </div>
        ))
      ) : (
        <p>
          <NetworkText id="ui.network-connections.d44ed7e38aed3a19">
            Keine offenen Anfragen.
          </NetworkText>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
