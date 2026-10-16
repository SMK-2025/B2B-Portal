"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
type Person = { userId: string; name: string; company: string; role: string };
type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
};
type Message = {
  id: string;
  userId: string;
  author: string;
  kind: string;
  body: string;
  createdAt: string;
  attachments: Attachment[];
  status?: string;
  startsAt?: string;
  durationMinutes?: number;
  location?: string;
  responses?: Record<string, string>;
  assignedToUserId?: string;
  deadline?: string;
};
type Thread = {
  id: string;
  title: string;
  description: string;
  status: string;
  currentUserId: string;
  canEdit: boolean;
  participants: Person[];
  data: {
    messages?: Message[];
    options?: string;
    votes?: Record<string, number>;
  };
};
export async function readPartnerFile(
  file: File,
): Promise<Omit<Attachment, "id">> {
  if (
    !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    ) ||
    file.size > 1_500_000
  )
    throw new Error("Bitte PDF, JPG, PNG oder WebP bis 1,5 MB auswählen.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    reader.onerror = () =>
      reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
export function downloadPartnerFile(file: Attachment) {
  const [, base64] = file.dataUrl.split(",");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function calendar(message: Message, title: string) {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/[,;]/g, (m) => "\\" + m);
  const start = new Date(message.startsAt!);
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//B2B Matching//Partnerportal//DE",
    "BEGIN:VEVENT",
    "UID:" + message.id + "@partnerportal",
    "DTSTAMP:" + stamp(new Date()),
    "DTSTART:" + stamp(start),
    "DTEND:" +
      stamp(
        new Date(start.getTime() + (message.durationMinutes || 30) * 60000),
      ),
    "SUMMARY:" + escape(title),
    "DESCRIPTION:" + escape(message.body),
    "LOCATION:" + escape(message.location || ""),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "partnertermin.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function NetworkThreadDialog({
  contentId,
  onClose,
}: {
  contentId: string;
  onClose: () => void;
}) {
  const access = useNetworkAccess(),
    [thread, setThread] = useState<Thread | null>(null),
    [people, setPeople] = useState<Person[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState("message");
  const path = "/networks/" + access?.networkId + "/content/" + contentId;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [contentId]);
  async function load() {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    try {
      setThread(await portalRequest<Thread>(path + "/thread", { token }));
      setPeople(
        await portalRequest<Person[]>(
          "/networks/" + access.networkId + "/participants",
          { token },
        ),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Austausch nicht verfügbar.");
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [contentId, access?.networkId]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) return;
    const element = event.currentTarget,
      form = new FormData(element);
    setBusy(true);
    try {
      const selected = form.get("file");
      const file =
        selected instanceof File && selected.size
          ? await readPartnerFile(selected)
          : null;
      setThread(
        await portalRequest<Thread>(path + "/replies", {
          token,
          body: {
            ...Object.fromEntries(form),
            file,
            kind,
            startsAt: form.get("startsAt")
              ? new Date(String(form.get("startsAt"))).toISOString()
              : undefined,
            deadline: form.get("deadline")
              ? new Date(String(form.get("deadline"))).toISOString()
              : undefined,
          },
        }),
      );
      element.reset();
      setNotice("Gesendet.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Senden nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  async function respond(id: string, status: string) {
    const token = getPortalSession();
    if (!token) return;
    setBusy(true);
    try {
      setThread(
        await portalRequest<Thread>(path + "/replies/" + id, {
          token,
          body: { status },
        }),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Änderung nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  async function vote(option: number) {
    const token = getPortalSession();
    if (!token) return;
    setBusy(true);
    try {
      setThread(
        await portalRequest<Thread>(path + "/vote", {
          token,
          body: { option },
        }),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Abstimmung nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  const participants = thread?.participants.length
    ? thread.participants
    : people;
  return (
    <div className="networkModalBackdrop">
      <section
        className="networkModal networkExchangeModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exchange-title"
      >
        <header>
          <div>
            <h2 id="exchange-title">
              {thread?.title || "Austausch wird geladen …"}
            </h2>
            <p>
              {thread?.participants.length
                ? thread.participants
                    .map(
                      (p) =>
                        p.name +
                        (p.role === "network_admin" ? " (Initiator)" : ""),
                    )
                    .join(" · ")
                : "Austausch im freigegebenen Partnerkreis"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </header>
        {notice && <p role="status">{notice}</p>}
        {thread && (
          <>
            <div className="networkExchangeMessages">
              <article className="networkExchangeIntro">
                <p>{thread.description}</p>
                {thread.data.options && (
                  <section className="networkExchangeAction">
                    <b>Abstimmung</b>
                    <small>
                      Nicht anonym. Sie können Ihre Auswahl bis zum Abschluss
                      ändern.
                    </small>
                    {thread.data.options
                      .split(/\r?\n/)
                      .map((v) => v.trim())
                      .filter(Boolean)
                      .map((option, index) => (
                        <button
                          key={index}
                          disabled={
                            busy ||
                            access?.readOnly ||
                            !["published", "active"].includes(thread.status)
                          }
                          onClick={() => void vote(index)}
                        >
                          {thread.data.votes?.[thread.currentUserId] === index
                            ? "✓ "
                            : ""}
                          {option} ·{" "}
                          {
                            Object.values(thread.data.votes || {}).filter(
                              (v) => v === index,
                            ).length
                          }{" "}
                          Stimmen
                        </button>
                      ))}
                  </section>
                )}
              </article>
              {(thread.data.messages || []).map((m) => (
                <article
                  key={m.id}
                  className={m.userId === thread.currentUserId ? "own" : ""}
                >
                  <header>
                    <b>{m.author}</b>
                    <small>
                      {new Date(m.createdAt).toLocaleString("de-DE")}
                    </small>
                  </header>
                  <p>{m.body}</p>
                  {m.attachments?.map((f) => (
                    <button
                      className="networkFileLink"
                      key={f.id}
                      onClick={() => downloadPartnerFile(f)}
                    >
                      ↓ {f.name} · {(f.size / 1024).toFixed(0)} KB
                    </button>
                  ))}
                  {m.kind === "meeting" && (
                    <div className="networkExchangeAction">
                      <b>
                        Terminvorschlag ·{" "}
                        {new Date(m.startsAt!).toLocaleString("de-DE")}
                      </b>
                      <span>
                        {m.durationMinutes} Minuten ·{" "}
                        {m.location || "Ort noch abstimmen"}
                      </span>
                      <span>
                        {m.status === "cancelled"
                          ? "Abgesagt"
                          : Object.keys(m.responses || {}).length +
                            " Rückmeldungen"}
                      </span>
                      {Object.entries(m.responses || {}).map(([id, status]) => (
                        <small key={id}>
                          {people.find((p) => p.userId === id)?.name ||
                            "Partner"}
                          : {status === "accepted" ? "Zugesagt" : "Abgesagt"}
                        </small>
                      ))}
                      {m.status !== "cancelled" && (
                        <div>
                          <button
                            disabled={busy}
                            onClick={() => void respond(m.id, "accepted")}
                          >
                            Zusagen
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void respond(m.id, "declined")}
                          >
                            Absagen
                          </button>
                          <button onClick={() => calendar(m, thread.title)}>
                            Im Kalender speichern
                          </button>
                          {m.userId === thread.currentUserId && (
                            <button
                              disabled={busy}
                              onClick={() => void respond(m.id, "cancelled")}
                            >
                              Termin absagen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {m.kind === "action" && (
                    <div className="networkExchangeAction">
                      <b>
                        Nächster Schritt ·{" "}
                        {m.status === "completed" ? "Erledigt" : "Offen"}
                      </b>
                      <span>
                        Verantwortlich:{" "}
                        {people.find((p) => p.userId === m.assignedToUserId)
                          ?.name || "Partner"}
                        {m.deadline
                          ? " · bis " +
                            new Date(m.deadline).toLocaleDateString("de-DE")
                          : ""}
                      </span>
                      {[m.userId, m.assignedToUserId].includes(
                        thread.currentUserId,
                      ) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void respond(
                              m.id,
                              m.status === "completed" ? "open" : "completed",
                            )
                          }
                        >
                          {m.status === "completed"
                            ? "Wieder öffnen"
                            : "Als erledigt markieren"}
                        </button>
                      )}
                    </div>
                  )}
                  {m.kind === "message" &&
                    m.userId === thread.currentUserId &&
                    m.body !== "Beitrag entfernt" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Eigenen Beitrag und Anhang entfernen?"))
                            void respond(m.id, "deleted");
                        }}
                      >
                        Beitrag entfernen
                      </button>
                    )}
                </article>
              ))}
            </div>
            {!access?.readOnly &&
              !["draft", "archived"].includes(thread.status) && (
                <form onSubmit={send} className="networkExchangeComposer">
                  <label>
                    Was möchten Sie tun?
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="message">Nachricht / Datei senden</option>
                      <option value="meeting">Termin vereinbaren</option>
                      <option value="action">
                        Nächsten Schritt festhalten
                      </option>
                    </select>
                  </label>
                  <label>
                    {kind === "meeting"
                      ? "Anlass und Ziel"
                      : kind === "action"
                        ? "Was ist zu tun?"
                        : "Ihre Nachricht"}
                    <textarea
                      name="body"
                      rows={3}
                      maxLength={5000}
                      required={kind !== "message"}
                    />
                  </label>
                  {kind === "meeting" && (
                    <div className="networkExchangeFields">
                      <label>
                        Beginn
                        <input name="startsAt" type="datetime-local" required />
                      </label>
                      <label>
                        Dauer in Minuten
                        <input
                          name="durationMinutes"
                          type="number"
                          defaultValue="30"
                          min="15"
                          max="480"
                        />
                      </label>
                      <label>
                        Ort oder Einwahllink
                        <input name="location" maxLength={500} />
                      </label>
                    </div>
                  )}
                  {kind === "action" && (
                    <div className="networkExchangeFields">
                      <label>
                        Verantwortlich
                        <select
                          name="assignedToUserId"
                          defaultValue={thread.currentUserId}
                        >
                          {participants.map((p) => (
                            <option key={p.userId} value={p.userId}>
                              {p.name} · {p.company}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Fällig am
                        <input name="deadline" type="datetime-local" />
                      </label>
                    </div>
                  )}
                  <label>
                    Datei / Leistungsportfolio
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                    />
                    <small>
                      PDF, JPG, PNG oder WebP · bis 1,5 MB. Nur im berechtigten
                      Teilnehmerkreis sichtbar.
                    </small>
                  </label>
                  <button className="networkPrimary" disabled={busy}>
                    {busy ? "Wird gesendet …" : "Senden"}
                  </button>
                </form>
              )}
          </>
        )}
      </section>
    </div>
  );
}
export function NetworkConversationsWorkspace() {
  const access = useNetworkAccess(),
    [items, setItems] = useState<
      Array<{
        id: string;
        title: string;
        description: string;
        updatedAt: string;
      }>
    >([]),
    [people, setPeople] = useState<Person[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [preselected, setPreselected] = useState("");
  async function load() {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    try {
      const [list, persons] = await Promise.all([
        portalRequest<typeof items>(
          "/networks/" + access.networkId + "/content?type=conversation",
          { token },
        ),
        portalRequest<Person[]>(
          "/networks/" + access.networkId + "/participants",
          { token },
        ),
      ]);
      setItems(list);
      setPeople(persons);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Gespräche nicht verfügbar.");
    }
  }
  useEffect(() => {
    void load();
    const partner = new URLSearchParams(window.location.search).get("partner");
    if (partner) {
      setPreselected(partner);
      setCreating(true);
    }
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [access?.networkId]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await portalRequest<{ id: string }>(
        "/networks/" + access.networkId + "/content",
        {
          token,
          body: {
            type: "conversation",
            title: form.get("title"),
            description: form.get("description"),
            participantUserIds: form.getAll("participants"),
            data: { category: form.get("category") },
          },
        },
      );
      setCreating(false);
      setSelected(result.id);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Gespräch nicht angelegt.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="networkFunctionalWorkspace">
      <section className="networkModulePurpose">
        <strong>Vertraulich miteinander ins Geschäft kommen</strong>
        <p>
          Einzel- und Gruppengespräche, Leistungsportfolios, Termine und nächste
          Schritte. Nur ausgewählte Teilnehmer können mitlesen – die
          Netzwerkleitung ausschließlich, wenn Sie sie auswählen.
        </p>
      </section>
      <div className="networkMemberToolbar">
        <input
          aria-label="Gespräche suchen"
          placeholder="Meine Gespräche durchsuchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="networkPrimary"
          disabled={access?.readOnly}
          onClick={() => setCreating(true)}
        >
          ＋ Gespräch beginnen
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <section className="networkCard">
        <header>
          <h2>Meine Gespräche</h2>
        </header>
        <div className="networkContentRows">
          {items
            .filter((i) =>
              (i.title + " " + i.description)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((i) => (
              <article key={i.id}>
                <div>
                  <h3>{i.title}</h3>
                  <p>{i.description}</p>
                  <small>{new Date(i.updatedAt).toLocaleString("de-DE")}</small>
                </div>
                <button onClick={() => setSelected(i.id)}>
                  Gespräch öffnen →
                </button>
              </article>
            ))}
          {!items.length && (
            <div className="networkEmpty">
              Lernen Sie einen Partner kennen oder beginnen Sie eine konkrete
              Geschäftsanfrage.
            </div>
          )}
        </div>
      </section>
      {creating && (
        <div className="networkModalBackdrop">
          <section className="networkModal" role="dialog" aria-modal="true">
            <header>
              <h2>Partnergespräch beginnen</h2>
              <button onClick={() => setCreating(false)} aria-label="Schließen">
                ×
              </button>
            </header>
            <form onSubmit={create}>
              <label>
                Betreff
                <input name="title" required minLength={2} maxLength={200} />
              </label>
              <label>
                Anlass
                <textarea
                  name="description"
                  required
                  minLength={2}
                  maxLength={5000}
                  rows={3}
                />
              </label>
              <label>
                Kategorie
                <select name="category">
                  {[
                    "Geschäftliche Anfrage",
                    "Vorstellung & Kennenlernen",
                    "Kooperation",
                    "Erfahrungsaustausch",
                    "Sonstiger Austausch",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>Teilnehmer auswählen</legend>
                <p>
                  Wählen Sie einen Partner oder mehrere Personen für eine
                  Gruppe. Initiatoren sind ausdrücklich als Netzwerkleitung
                  gekennzeichnet.
                </p>
                <div className="networkParticipantPicker">
                  {people
                    .filter((p) => p.userId !== access?.currentUserId)
                    .map((p) => (
                      <label key={p.userId}>
                        <input
                          type="checkbox"
                          name="participants"
                          defaultChecked={p.userId === preselected}
                          value={p.userId}
                        />
                        <span>
                          {p.name}
                          <small>
                            {p.company}
                            {p.role === "network_admin" ? " · Initiator" : ""}
                          </small>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
              <button className="networkPrimary" disabled={busy}>
                {busy ? "Wird angelegt …" : "Vertrauliches Gespräch starten"}
              </button>
            </form>
          </section>
        </div>
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
    </div>
  );
}
