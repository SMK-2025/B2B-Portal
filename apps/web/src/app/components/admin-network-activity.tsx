"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { AdminNetworkUsers } from "./admin-network-users";

type Activity = {
  items: {
    id: string;
    title: string;
    createdAt: string;
    kind: string;
    pending: boolean;
    unread: boolean;
    area: string;
  }[];
  pendingCount: number;
  unreadCount: number;
  asOf: string;
};
export function AdminNetworkActivity({
  id,
  name,
  slug,
  summary,
  onChanged,
}: {
  id: string;
  name: string;
  slug: string;
  summary?: { pendingCount: number; unreadCount: number };
  onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setData(null);
  }, [id]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(
        await portalRequest<Activity>(`/networks/admin/${id}/activity`, {
          token: getPortalSession() || "",
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Hinweise konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function seen() {
    if (!data) return;
    setLoading(true);
    setError("");
    try {
      setData(
        await portalRequest<Activity>(`/networks/admin/${id}/activity/seen`, {
          token: getPortalSession() || "",
          body: { asOf: data.asOf },
        }),
      );
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Der Lesestatus konnte nicht gespeichert werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  const count = summary?.unreadCount ?? data?.unreadCount ?? 0;
  return (
    <>
      <button
        type="button"
        className={`adminNetworkBell${count ? " hasUpdates" : ""}`}
        aria-label={`Hinweise für ${name}${count ? `: ${count} neue oder offene Hinweise` : ""}`}
        onClick={() => {
          dialog.current?.showModal();
          void load();
        }}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {!!count && <span>{count > 99 ? "99+" : count}</span>}
      </button>
      <dialog
        ref={dialog}
        className="adminNetworkActivityDialog"
        aria-label={`Netzwerk-Hinweise ${name}`}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <header>
          <div>
            <small>NETZWERKAKTIVITÄT</small>
            <h2>{name}</h2>
          </div>
          <button
            type="button"
            aria-label="Hinweise schließen"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <div className="adminNetworkActivityTools">
          <button type="button" disabled={loading} onClick={() => void load()}>
            Aktualisieren
          </button>
          <button
            type="button"
            disabled={loading || !data}
            onClick={() => void seen()}
          >
            Als gesehen markieren
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {loading && <p role="status">Hinweise werden geladen …</p>}
        {!!data?.pendingCount && (
          <p className="adminNetworkActivityWarning">
            {data.pendingCount}{" "}
            {data.pendingCount === 1
              ? "Aufnahme erfordert"
              : "Aufnahmen erfordern"}{" "}
            deine Prüfung. Diese Hinweise bleiben bis zur Entscheidung sichtbar.
          </p>
        )}
        <div className="adminNetworkActivityItems">
          {data?.items.map((item) => (
            <article
              key={item.id}
              className={item.pending ? "pending" : item.unread ? "unread" : ""}
            >
              <span className="adminNetworkActivityIcon" aria-hidden="true">
                {item.kind === "request"
                  ? "!"
                  : item.kind === "event"
                    ? "▦"
                    : item.kind === "member"
                      ? "+"
                      : "≡"}
              </span>
              <div>
                <strong>{item.title}</strong>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                {item.pending ? (
                  <small>Prüfung in der Nutzerübersicht</small>
                ) : (
                  item.area !== "users" && (
                    <Link
                      href={
                        `/portal/netzwerk/${slug}/${item.area}${item.kind === "event" ? `?event=${encodeURIComponent(item.id.replace("content:", ""))}` : ""}` as never
                      }
                    >
                      Im Netzwerk ansehen →
                    </Link>
                  )
                )}
              </div>
            </article>
          ))}
          {data && !data.items.length && (
            <p>In diesem Netzwerk liegen noch keine Hinweise vor.</p>
          )}
        </div>
        <footer>
          <AdminNetworkUsers id={id} name={name} />
          <p>Nur zur Information. Private Chats werden hier nicht angezeigt.</p>
        </footer>
      </dialog>
    </>
  );
}
