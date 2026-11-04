"use client";
import { NetworkText } from "./network-text-editor";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { NetworkThreadDialog } from "./network-exchange-workspace";
import { useNetworkAccess } from "./network-shell";

type EventItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  startsAt: string | null;
  updatedAt: string;
  data: {
    recapSummary?: string;
    recapResults?: string;
    recapImages?: string[];
  };
};

export function NetworkEventRecapWorkspace() {
  const access = useNetworkAccess(),
    [events, setEvents] = useState<EventItem[]>([]),
    [editing, setEditing] = useState<EventItem | null>(null),
    [images, setImages] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [threadId, setThreadId] = useState<string | null>(null);
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    portalRequest<EventItem[]>(
      `/networks/${access.networkId}/content?type=event`,
      { token },
    )
      .then((items) =>
        setEvents(
          items.sort((a, b) =>
            (b.startsAt || b.updatedAt).localeCompare(
              a.startsAt || a.updatedAt,
            ),
          ),
        ),
      )
      .catch((error) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "Rückblicke konnten nicht geladen werden.",
        ),
      );
  }, [access?.networkId]);
  function edit(item: EventItem) {
    setEditing(item);
    setImages(item.data.recapImages || []);
  }
  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])];
    if (images.length + files.length > 6) {
      setNotice(
        "Pro Veranstaltung können höchstens sechs Bilder veröffentlicht werden.",
      );
      return;
    }
    for (const file of files) {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 1_500_000
      ) {
        setNotice("Jedes Bild muss eine Bilddatei mit maximal 1,5 MB sein.");
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string")
          setImages((current) =>
            [...current, reader.result as string].slice(0, 6),
          );
      };
      reader.readAsDataURL(file);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !access?.networkId) return;
    const token = getPortalSession();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const updated = await portalRequest<EventItem>(
        `/networks/${access.networkId}/content/${editing.id}`,
        {
          token,
          body: {
            status: "completed",
            data: {
              recapSummary: form.get("recapSummary"),
              recapResults: form.get("recapResults"),
              recapImages: images,
              recapPublishedAt: new Date().toISOString(),
            },
          },
        },
      );
      setEvents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(null);
      setNotice("Der Veranstaltungsrückblick wurde veröffentlicht.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Rückblick konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  const published = events.filter((item) => item.data.recapSummary);
  return (
    <div className="networkFunctionalWorkspace">
      {notice && (
        <div className="networkNotice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-event-recap-workspace.2b4f44313ab73012">
                CHRONOLOGISCHES ARCHIV
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-event-recap-workspace.be27b02c40bf4e76">
                Vergangene Netzwerkveranstaltungen
              </NetworkText>
            </h2>
          </div>
        </header>
        <div className="networkRecapGrid">
          {published.map((item) => (
            <article key={item.id}>
              {item.data.recapImages?.[0] && (
                <img src={item.data.recapImages[0]} alt="" />
              )}
              <div>
                <time>
                  {new Date(item.startsAt || item.updatedAt).toLocaleDateString(
                    "de-DE",
                  )}
                </time>
                <h3>{item.title}</h3>
                <p>{item.data.recapSummary}</p>
                {item.data.recapResults && (
                  <aside>
                    <b>
                      <NetworkText id="ui.network-event-recap-workspace.12ba6ae54b689292">
                        Ergebnisse
                      </NetworkText>
                    </b>
                    <p>{item.data.recapResults}</p>
                  </aside>
                )}
                <button onClick={() => setThreadId(item.id)}>
                  <NetworkText id="ui.network-event-recap-workspace.49f05515d506bd8e">
                    Austauschen & nächste Schritte →
                  </NetworkText>
                </button>
                {access?.isInitiator && (
                  <button type="button" onClick={() => edit(item)}>
                    <NetworkText id="ui.network-event-recap-workspace.b93dd4e7e800047a">
                      Rückblick bearbeiten
                    </NetworkText>
                  </button>
                )}
              </div>
            </article>
          ))}
          {!published.length && (
            <div className="networkEmpty">
              <b>
                <NetworkText id="ui.network-event-recap-workspace.675d8b19d4bd1bdc">
                  Noch keine Rückblicke veröffentlicht
                </NetworkText>
              </b>
              <p>
                <NetworkText id="ui.network-event-recap-workspace.b6714592ef3aa93c">
                  Nach einer Veranstaltung kann der Initiator Bilder,
                  Zusammenfassung und Ergebnisse ergänzen.
                </NetworkText>
              </p>
            </div>
          )}
        </div>
      </section>
      {access?.isInitiator && (
        <section className="networkCard">
          <header>
            <div>
              <span>
                <NetworkText id="ui.network-event-recap-workspace.c2fb1b71a3403acc">
                  FÜR DEN INITIATOR
                </NetworkText>
              </span>
              <h2>
                <NetworkText id="ui.network-event-recap-workspace.4fb6f7b1e6f4d1c9">
                  Rückblick zu einer Veranstaltung anlegen
                </NetworkText>
              </h2>
            </div>
          </header>
          <div className="networkRecapEventList">
            {events.map((item) => (
              <button type="button" key={item.id} onClick={() => edit(item)}>
                <span>
                  {new Date(item.startsAt || item.updatedAt).toLocaleDateString(
                    "de-DE",
                  )}
                </span>
                <b>{item.title}</b>
                <small>
                  <NetworkText id="ui.network-event-recap-workspace.d09e6f994742baea">
                    {item.data.recapSummary
                      ? "Rückblick vorhanden"
                      : "Noch ohne Rückblick"}
                  </NetworkText>
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
      {threadId && (
        <NetworkThreadDialog
          contentId={threadId}
          onClose={() => setThreadId(null)}
        />
      )}
      {editing && (
        <div
          className="networkModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <section
            className="networkModal networkContentModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>
                  <NetworkText id="ui.network-event-recap-workspace.903e829a4a18d5ff">
                    VERANSTALTUNGSRÜCKBLICK
                  </NetworkText>
                </span>
                <h2>{editing.title}</h2>
                <p>
                  <NetworkText id="ui.network-event-recap-workspace.c1785f3f82e6991a">
                    Dieser Editor speichert den Rückblick zunächst im
                    geschlossenen Portal. Die öffentliche Homepage-Freigabe
                    erfolgt separat unter „Öffentliche Homepage-Freigaben“.
                    Interne Ergebnisse und nächste Schritte werden nie
                    öffentlich übertragen.
                  </NetworkText>
                </p>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
            </header>
            <form onSubmit={save}>
              <label>
                <NetworkText id="ui.network-event-recap-workspace.c25dcee5da87f8ae">
                  Worum ging es?
                </NetworkText>
                <textarea
                  name="recapSummary"
                  required
                  minLength={20}
                  rows={5}
                  defaultValue={editing.data.recapSummary || ""}
                />
              </label>
              <label>
                <NetworkText id="ui.network-event-recap-workspace.23d17b68d35f7db1">
                  Ergebnisse und nächste Schritte
                </NetworkText>
                <textarea
                  name="recapResults"
                  rows={4}
                  defaultValue={editing.data.recapResults || ""}
                />
              </label>
              <label>
                <NetworkText id="ui.network-event-recap-workspace.214feaf164d4b815">
                  Bilder
                </NetworkText>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={addImages}
                />
                <small>
                  <NetworkText id="ui.network-event-recap-workspace.6fe7e49f5a14420b">
                    Bis zu sechs Bilder, jeweils maximal 1,5 MB.
                  </NetworkText>
                </small>
              </label>
              {images.length > 0 && (
                <div className="networkRecapImages">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() =>
                        setImages((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <img src={image} alt={`Rückblickbild ${index + 1}`} />
                      <span>
                        <NetworkText id="ui.network-event-recap-workspace.3828375a2d45384b">
                          Entfernen
                        </NetworkText>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <footer className="adminNetworkDialogActions">
                <button type="button" onClick={() => setEditing(null)}>
                  <NetworkText id="ui.network-event-recap-workspace.f7ff1178af202f6f">
                    Abbrechen
                  </NetworkText>
                </button>
                <button className="portalPrimary" disabled={busy}>
                  <NetworkText id="ui.network-event-recap-workspace.c4e79e2ffe4c7a39">
                    {busy
                      ? "Wird veröffentlicht …"
                      : "Rückblick veröffentlichen"}
                  </NetworkText>
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
