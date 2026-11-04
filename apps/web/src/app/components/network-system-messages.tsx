"use client";
import { NetworkText } from "./network-text-editor";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getPortalSession, portalRequest } from "../lib/portal-api";
type Message = {
  id: string;
  networkId: string;
  title: string;
  message: string;
  severity: "info" | "warning";
  createdAt: string;
};
export function NetworkSystemMessages({
  networkId,
  operator,
}: {
  networkId: string;
  operator: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [compose, setCompose] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    return portalRequest<Message[]>(`/networks/${networkId}/system-messages`, {
      token: getPortalSession() || "",
    });
  }
  useEffect(() => {
    let active = true;
    setMessages([]);
    const refresh = () => {
      void load()
        .then((m) => {
          if (active) setMessages(m);
        })
        .catch(() => {
          if (active) setMessages([]);
        });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [networkId]);
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      input = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      await portalRequest(`/networks/${networkId}/system-messages`, {
        token: getPortalSession() || "",
        body: {
          title: input.get("title"),
          message: input.get("message"),
          severity: input.get("severity"),
        },
      });
      setMessages(await load());
      form.reset();
      setCompose(false);
      setNotice(
        "System-Meldung für alle Nutzer dieses Netzwerks veröffentlicht.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Veröffentlichen fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function archive(id: string) {
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/system-messages/${id}/archive`,
        { token: getPortalSession() || "", body: {} },
      );
      setMessages(await load());
      setNotice("System-Meldung ausgeblendet. Sie bleibt intern gespeichert.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Archivieren fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="networkSystemMessages" aria-label="System-Meldungen">
      {operator && (
        <div className="networkOperatorTools">
          <span>
            <NetworkText id="ui.network-system-messages.44ae13c406fd513b">
              Betreiberzugang · kein Mitglied dieses Netzwerks
            </NetworkText>
          </span>
          <Link href="/portal/admin/netzwerke">
            <NetworkText id="ui.network-system-messages.5ba0d2c367c1d92b">
              Zur Netzwerkverwaltung
            </NetworkText>
          </Link>
          <button type="button" onClick={() => setCompose(!compose)}>
            <NetworkText id="ui.network-system-messages.66c596f70f6c07c2">
              {compose ? "Abbrechen" : "System-Meldung erstellen"}
            </NetworkText>
          </button>
        </div>
      )}
      {operator && compose && (
        <form className="networkSystemComposer" onSubmit={publish}>
          <h2>
            <NetworkText id="ui.network-system-messages.e76e636eebbd6007">
              System-Meldung an dieses Netzwerk
            </NetworkText>
          </h2>
          <p>
            <NetworkText id="ui.network-system-messages.399a7459bbdf4fee">
              Der Hinweis wird allen Nutzern im Partnerportal angezeigt. Keine
              persönliche Nachricht, keine E-Mail.
            </NetworkText>
          </p>
          <label>
            <NetworkText id="ui.network-system-messages.abcafc82daaf011f">
              Titel
            </NetworkText>
            <input name="title" minLength={2} maxLength={160} required />
          </label>
          <label>
            <NetworkText id="ui.network-system-messages.2e2011d96a411698">
              Hinweis
            </NetworkText>
            <textarea
              name="message"
              rows={5}
              minLength={2}
              maxLength={5000}
              required
            />
          </label>
          <label>
            <NetworkText id="ui.network-system-messages.1da7a3b4eea2f86e">
              Darstellung
            </NetworkText>
            <select name="severity">
              <option value="info">Information</option>
              <option value="warning">Wichtiger Hinweis</option>
            </select>
          </label>
          <button disabled={busy}>
            <NetworkText id="ui.network-system-messages.29d751d638fcc52c">
              Für dieses Netzwerk veröffentlichen
            </NetworkText>
          </button>
        </form>
      )}
      {messages
        .filter((m) => m.networkId === networkId)
        .map((m) => (
          <article key={m.id} className={`networkSystemMessage ${m.severity}`}>
            <small>
              <NetworkText id="ui.network-system-messages.cbfae0769676f032">
                SYSTEM-MELDUNG ·{" "}
              </NetworkText>
              {new Date(m.createdAt).toLocaleString("de-DE")}
            </small>
            <h2>{m.title}</h2>
            <p>{m.message}</p>
            {operator && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void archive(m.id)}
              >
                <NetworkText id="ui.network-system-messages.6a911c8d9332d051">
                  Meldung ausblenden
                </NetworkText>
              </button>
            )}
          </article>
        ))}
      {notice && operator && <p role="status">{notice}</p>}
    </section>
  );
}
