"use client";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
export function AdminNetworkShare({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);
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
      const link = new URL(result.path, window.location.origin).href;
      try {
        await navigator.clipboard.writeText(link);
        setError("Link kopiert.");
      } catch {
        window.prompt(
          "Dein Browser blockiert das automatische Kopieren. Bitte kopiere diesen Link:",
          link,
        );
        setError("Automatisches Kopieren wurde vom Browser blockiert.");
      }
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
      {error && <p role="status">{error}</p>}
    </div>
  );
}
