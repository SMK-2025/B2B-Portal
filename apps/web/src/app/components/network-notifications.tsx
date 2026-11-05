"use client";
import { NetworkText } from "./network-text-editor";
import { NetworkConnectionInbox } from "./network-connections";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { NetworkThreadDialog } from "./network-exchange-workspace";
export function NetworkNotifications() {
  const router = useRouter();
  const access = useNetworkAccess(),
    [items, setItems] = useState<
      Array<{
        id: string;
        readAt: string | null;
        createdAt: string;
        data: {
          contentId?: string;
          welcomeMembershipId?: string;
          partnerMembershipId?: string;
          creditMonths?: number;
          connectionId?: string;
          title: string;
          event?: {
            title: string;
            description: string;
            startsAt: string | null;
            endsAt: string | null;
            status?: string;
            imageUrl: string | null;
          };
        };
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
        aria-label={`Benachrichtigungen${items.some((i) => !i.readAt) ? `: ${items.filter((i) => !i.readAt).length} ungelesen` : ""}`}
        title="Neuigkeiten und Vernetzungsanfragen"
        className="networkNewsTrigger"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          void load();
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {items.some((i) => !i.readAt) && (
          <span className="networkNotificationBadge">
            {items.filter((i) => !i.readAt).length}
          </span>
        )}
      </button>
      {open && (
        <section
          className="networkNotificationPanel"
          aria-label="Benachrichtigungen"
        >
          <header>
            <b>
              <NetworkText id="ui.network-notifications.e46d83a49849667d">
                Neuigkeiten im Netzwerk
              </NetworkText>
            </b>
            <button onClick={() => setOpen(false)} aria-label="Schließen">
              ×
            </button>
          </header>
          {items.map((i) => (
            <button
              key={i.id}
              className={`networkNewsItem ${!i.readAt ? "unread" : ""} ${i.data.event ? "networkNewsEvent" : ""}`}
              onClick={() => {
                if ((i.data.welcomeMembershipId || i.data.partnerMembershipId) && access) {
                  setOpen(false);
                  router.push(
                    `/portal/netzwerk/${access.slug}/mitglieder?profil=${encodeURIComponent(String(i.data.welcomeMembershipId || i.data.partnerMembershipId))}${i.data.partnerMembershipId ? "&rubrik=offers" : ""}` as never,
                  );
                  return;
                }
                if (i.data.creditMonths !== undefined) {
                  setOpen(false);
                  router.push("/portal/konto");
                  return;
                }
                if (i.data.contentId) {
                  if (i.data.event && access) {
                    setOpen(false);
                    router.push(
                      `/portal/netzwerk/${access.slug}/veranstaltungen?event=${encodeURIComponent(i.data.contentId)}` as never,
                    );
                    return;
                  }
                  setSelected(i.data.contentId);
                  setOpen(false);
                }
              }}
            >
              {i.data.event?.imageUrl && (
                <img src={i.data.event.imageUrl} alt="" />
              )}
              <span className="networkNewsCopy">
                <small>
                  <NetworkText id="ui.network-notifications.dfd2cd9b641075d5">
                    {i.data.event ? "VERANSTALTUNG" : "NEUIGKEIT"}
                  </NetworkText>
                </small>
                <strong>{i.data.event?.title || i.data.title}</strong>
                {i.data.event && <span>{i.data.event.description}</span>}
                <small>
                  {new Date(
                    i.data.event?.startsAt || i.createdAt,
                  ).toLocaleString("de-DE", {
                    timeZone: "Europe/Berlin",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </small>
                {i.data.event && (
                  <span className="networkNewsCta">
                    <NetworkText id="ui.network-notifications.c42a2f627fc7f18d">
                      Veranstaltung ansehen →
                    </NetworkText>
                  </span>
                )}
              </span>
            </button>
          ))}
          {!items.length && (
            <p>
              <NetworkText id="ui.network-notifications.76eaf7d6f1c54346">
                Noch keine neuen Hinweise.
              </NetworkText>
            </p>
          )}
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
