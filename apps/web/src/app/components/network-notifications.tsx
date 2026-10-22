"use client";
import { NetworkConnectionInbox } from "./network-connections";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { NetworkThreadDialog } from "./network-exchange-workspace";
export function NetworkNotifications() {
  const access = useNetworkAccess(),
    [items, setItems] = useState<
      Array<{
        id: string;
        readAt: string | null;
        createdAt: string;
        data: { contentId?: string; connectionId?: string; title: string };
      }>
    >([]),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  async function load() {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    try {
      setItems(
        await portalRequest<typeof items>(
          "/networks/" + access.networkId + "/notifications",
          { token },
        ),
      );
    } catch {
      /* Existing shell handles expired sessions. */
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20000);
    return () => clearInterval(timer);
  }, [access?.networkId]);
  return (
    <>
      <button
        type="button"
        aria-label="Benachrichtigungen"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          void load();
        }}
      >
        ♧ {items.filter((i) => !i.readAt).length || ""}
      </button>
      {open && (
        <section
          className="networkNotificationPanel"
          aria-label="Benachrichtigungen"
        >
          <header>
            <b>Neu in Ihrem Partnerkreis</b>
            <button onClick={() => setOpen(false)} aria-label="Schließen">
              ×
            </button>
          </header>
          {items.map((i) => (
            <button
              key={i.id}
              className={!i.readAt ? "unread" : ""}
              onClick={() => {
                if (i.data.contentId) {
                  setSelected(i.data.contentId);
                  setOpen(false);
                }
              }}
            >
              <strong>{i.data.title}</strong>
              <small>{new Date(i.createdAt).toLocaleString("de-DE")}</small>
            </button>
          ))}
          {!items.length && <p>Noch keine neuen Hinweise.</p>}
          <NetworkConnectionInbox />
        </section>
      )}
      {selected && (
        <NetworkThreadDialog
          contentId={selected}
          onClose={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </>
  );
}
