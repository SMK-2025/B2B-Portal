"use client";
import { useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
export function AdminNetworkShare({ id, name }: { id: string; name: string }) {
  const [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function create() {
    if (
      !window.confirm(
        `Registrierungslink für „${name}“ erstellen?\nJeder mit diesem Link kann sich zum festgelegten Partnerpreis registrieren.`,
      )
    )
      return;
    if (
      !window.confirm(
        `Noch einmal bestätigen: Du möchtest den weiterleitbaren Link ausschließlich für „${name}“?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await portalRequest<{ path: string }>(
        `/networks/admin/${id}/shared-invitation`,
        {
          token: getPortalSession() || "",
          body: { confirmName: name, confirmAgain: name },
        },
      );
      setLink(new URL(result.path, window.location.origin).href);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Link konnte nicht erstellt werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="adminShareLink">
      <button
        className="portalSecondary"
        type="button"
        onClick={create}
        disabled={busy}
      >
        {busy ? "Link wird erstellt …" : "Einladungslink"}
      </button>
      {link && (
        <div>
          <label>
            Registrierungslink · {name}
            <input
              value={link}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button
            type="button"
            className="portalSecondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setError("Link kopiert.");
              } catch {
                setError("Bitte den Link im Feld markieren und kopieren.");
              }
            }}
          >
            Link kopieren
          </button>
          <small>
            90 Tage gültig · nur Partnerregistrierung, keine Administratorrechte
          </small>
        </div>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
