"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { networkUiCopy } from "../lib/network-ui-copy";

type CopyState = { texts: Record<string, string>; revision: number };
function validCopy(value: CopyState) {
  if (
    !value ||
    typeof value.texts !== "object" ||
    value.texts === null ||
    !Number.isInteger(value.revision)
  )
    throw new Error(
      "Die Textverwaltung ist noch nicht verfügbar. Bitte die Seite erneut laden.",
    );
  return value;
}
type Editor = CopyState & {
  enabled: boolean;
  save: (key: string, value: string | null) => Promise<void>;
};
const CopyContext = createContext<Editor | null>(null);

export function NetworkTextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [copy, setCopy] = useState<CopyState>({ texts: {}, revision: 0 });
  const [owner, setOwner] = useState<{ id: string; slug: string } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    setEnabled(false);
    setOwner(null);
    setCopy({ texts: {}, revision: 0 });
    setError("");
    revision.current = 0;
    const slug =
      pathname.match(/^\/portal\/netzwerk\/([^/]+)/)?.[1] ||
      new URLSearchParams(window.location.search).get("network");
    if (!slug) return;
    const token = getPortalSession();
    void (async () => {
      let state: CopyState = await portalRequest<CopyState>(
        `/networks/branding/${encodeURIComponent(slug)}/texts`,
      ).catch(() => ({ texts: {}, revision: 0 }));
      let identity: { id: string; slug: string } | null = null;
      if (token) {
        const session = await portalRequest<{ accountRole: string }>(
          "/auth/session/check",
          { token, body: {} },
        ).catch(() => null);
        if (session?.accountRole === "platform_admin") {
          const network = await portalRequest<{ id: string }>(
            `/networks/public/${encodeURIComponent(slug)}`,
            { token },
          ).catch(() => null);
          if (network) {
            state = validCopy(
              await portalRequest<CopyState>(
                `/networks/admin/${network.id}/texts`,
                { token },
              ),
            );
            identity = { id: network.id, slug };
          }
        }
      }
      if (active) {
        setCopy(validCopy(state));
        revision.current = state.revision;
        setOwner(identity);
        setEnabled(
          !!identity &&
            sessionStorage.getItem(`network-text-edit:${slug}`) === "yes",
        );
      }
    })().catch(() => {
      if (active) setError("Texte konnten nicht geladen werden.");
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  async function save(key: string, value: string | null) {
    if (!owner)
      throw new Error("Nur der Plattformbetreiber kann Texte bearbeiten.");
    const token = getPortalSession();
    if (!token) throw new Error("Bitte erneut anmelden.");
    const next = validCopy(
      await portalRequest<CopyState>(`/networks/admin/${owner.id}/texts`, {
        token,
        body: { key, value, revision: revision.current },
      }),
    );
    revision.current = next.revision;
    setCopy(next);
  }
  return (
    <CopyContext.Provider
      value={{ ...copy, enabled: enabled && !!owner, save }}
    >
      {children}
      {owner && (
        <aside
          className="networkTextToolbar"
          aria-label="Netzwerk-Texte bearbeiten"
        >
          <span>
            Nur dieses Netzwerk: <strong>{owner.slug}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(
                `network-text-edit:${owner.slug}`,
                enabled ? "no" : "yes",
              );
              setEnabled(!enabled);
            }}
          >
            {enabled ? "✓ Bearbeitung beenden" : "✎ Texte bearbeiten"}
          </button>
          <a
            href={`/registrieren?network=${encodeURIComponent(owner.slug)}&mode=login`}
          >
            Login & Registrierung
          </a>
          {error && <span role="alert">{error}</span>}
        </aside>
      )}
    </CopyContext.Provider>
  );
}

export function NetworkText({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const editor = useContext(CopyContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const value = networkUiCopy(id, editor?.texts, children);
  useEffect(() => {
    if (!editor?.enabled) setEditing(false);
  }, [editor?.enabled]);
  async function save(reset = false) {
    setBusy(true);
    setError("");
    try {
      await editor!.save(id, reset ? null : draft);
      setEditing(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!editor?.enabled) return <>{value}</>;
  return (
    <span
      className="networkEditableText"
      onClick={
        editing
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
    >
      {value}
      <span
        role="button"
        tabIndex={0}
        className="networkTextPencil"
        aria-label="Diesen Text bearbeiten"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setDraft(String(value));
            setEditing(true);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDraft(String(value));
          setEditing(true);
        }}
      >
        ✎
      </span>
      {editing &&
        createPortal(
          <span
            className="networkTextPopover"
            role="dialog"
            aria-modal="true"
            aria-label="Text bearbeiten"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Tab") {
                const controls = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "textarea, button:not(:disabled)",
                  ),
                );
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <textarea
              aria-label="Neuer Text"
              value={draft}
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <span className="networkTextPreview">Vorschau: {draft}</span>
            <span className="networkTextActions">
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => void save()}
              >
                ▣ {busy ? "Speichert …" : "Speichern"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Abbrechen
              </button>
              {editor.texts[id] !== undefined && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(true)}
                >
                  Original wiederherstellen
                </button>
              )}
            </span>
            {error && <span role="alert">{error}</span>}
          </span>,
          document.body,
        )}
    </span>
  );
}
