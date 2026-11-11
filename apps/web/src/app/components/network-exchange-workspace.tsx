"use client";
import { NetworkText } from "./network-text-editor";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { PartnerChatWorkspace } from "./partner-chat-workspace";
import { ProfileDialog, type Member } from "./network-members-workspace";
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
  type?: string;
  id: string;
  title: string;
  description: string;
  status: string;
  currentUserId: string;
  canEdit: boolean;
  participants: Person[];
  data: {
    discussionOpen?: boolean;
    imageUrl?: string | null;
    boardImageUrl?: string;
    boardImageIsLogo?: boolean;
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
  const router = useRouter();
  const access = useNetworkAccess(),
    [thread, setThread] = useState<Thread | null>(null),
    [people, setPeople] = useState<Person[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [selectedMember, setSelectedMember] = useState<Member | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState("message");
  const path = "/networks/" + access?.networkId + "/content/" + contentId;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !selectedMember) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [contentId, selectedMember]);
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    let active = true;
    portalRequest<Member[]>(`/networks/${access.networkId}/memberships`, {
      token,
    })
      .then((rows) => {
        if (active)
          setMembers(
            rows.filter(
              (row) =>
                row.status === "active" &&
                row.organization?.networkProfile?.status === "published",
            ),
          );
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, [access?.networkId]);
  function authorBadge(userId: string, name: string) {
    const member = members.find((row) => row.userId === userId);
    const logo = member?.organization?.networkProfile?.logoUrl;
    return member ? (
      <button
        className="networkDiscussionAuthor"
        onClick={() => setSelectedMember(member)}
        title="Unternehmensseite öffnen"
      >
        {logo ? <img src={logo} alt="" /> : <span>{name.slice(0, 1)}</span>}
        <b>{name}</b>
      </button>
    ) : (
      <span className="networkDiscussionAuthor">
        <span>{name.slice(0, 1)}</span>
        <b>{name}</b>
      </span>
    );
  }
  async function load() {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    try {
      const loaded = await portalRequest<Thread>(path + "/thread", { token });
      if (loaded.type === "conversation") {
        router.push(`/portal/netzwerk/${access.slug}/kommunikation?chat=${encodeURIComponent(contentId)}` as never);
        onClose();
        return;
      }
      setThread(loaded);
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
                {(thread.data.boardImageUrl || thread.data.imageUrl) && (
                  <img
                    className="networkArticlePhoto"
                    src={
                      thread.data.boardImageUrl ||
                      thread.data.imageUrl ||
                      undefined
                    }
                    style={
                      thread.data.boardImageIsLogo
                        ? { objectFit: "contain", background: "white" }
                        : undefined
                    }
                    alt="Beitragsfoto"
                  />
                )}
                <p>{thread.description}</p>
                {thread.data.options && (
                  <section className="networkExchangeAction">
                    <b>
                      <NetworkText id="ui.network-exchange-workspace.a519115d1cc9eaa1">
                        Abstimmung
                      </NetworkText>
                    </b>
                    <small>
                      <NetworkText id="ui.network-exchange-workspace.3b90c1d3711226c3">
                        Nicht anonym. Sie können Ihre Auswahl bis zum Abschluss
                        ändern.
                      </NetworkText>
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
                          <NetworkText id="ui.network-exchange-workspace.538a77a7c4211734">
                            Stimmen
                          </NetworkText>
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
                    {authorBadge(m.userId, m.author)}
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
                      ↓ {f.name} · {(f.size / 1024).toFixed(0)}
                      <NetworkText id="ui.network-exchange-workspace.59281a6b29351cfa">
                        KB
                      </NetworkText>
                    </button>
                  ))}
                  {m.kind === "meeting" && (
                    <div className="networkExchangeAction">
                      <b>
                        <NetworkText id="ui.network-exchange-workspace.388415536f5fb561">
                          Terminvorschlag ·
                        </NetworkText>{" "}
                        {new Date(m.startsAt!).toLocaleString("de-DE")}
                      </b>
                      <span>
                        {m.durationMinutes}
                        <NetworkText id="ui.network-exchange-workspace.2493706ce5d68f94">
                          Minuten ·
                        </NetworkText>{" "}
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
                          :{" "}
                          <NetworkText id="ui.network-exchange-workspace.3b1c0704b0b22148">
                            {status === "accepted" ? "Zugesagt" : "Abgesagt"}
                          </NetworkText>
                        </small>
                      ))}
                      {m.status !== "cancelled" && (
                        <div>
                          <button
                            disabled={busy}
                            onClick={() => void respond(m.id, "accepted")}
                          >
                            <NetworkText id="ui.network-exchange-workspace.844fc50dd71cce7d">
                              Zusagen
                            </NetworkText>
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void respond(m.id, "declined")}
                          >
                            <NetworkText id="ui.network-exchange-workspace.9fc0b61d3421a25f">
                              Absagen
                            </NetworkText>
                          </button>
                          <button onClick={() => calendar(m, thread.title)}>
                            <NetworkText id="ui.network-exchange-workspace.eb4952516e2c87d2">
                              Im Kalender speichern
                            </NetworkText>
                          </button>
                          {m.userId === thread.currentUserId && (
                            <button
                              disabled={busy}
                              onClick={() => void respond(m.id, "cancelled")}
                            >
                              <NetworkText id="ui.network-exchange-workspace.3480278c51a67174">
                                Termin absagen
                              </NetworkText>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {m.kind === "action" && (
                    <div className="networkExchangeAction">
                      <b>
                        <NetworkText id="ui.network-exchange-workspace.1da274787a535f18">
                          Nächster Schritt ·
                        </NetworkText>{" "}
                        <NetworkText id="ui.network-exchange-workspace.ec1896d1efed2bf5">
                          {m.status === "completed" ? "Erledigt" : "Offen"}
                        </NetworkText>
                      </b>
                      <span>
                        <NetworkText id="ui.network-exchange-workspace.98ecf0c757464a79">
                          Verantwortlich:
                        </NetworkText>{" "}
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
                          <NetworkText id="ui.network-exchange-workspace.40352717d61301de">
                            {m.status === "completed"
                              ? "Wieder öffnen"
                              : "Als erledigt markieren"}
                          </NetworkText>
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
                        <NetworkText id="ui.network-exchange-workspace.ddc2005cc7d38115">
                          Beitrag entfernen
                        </NetworkText>
                      </button>
                    )}
                </article>
              ))}
            </div>
            {thread.data.discussionOpen === false && (
              <p className="networkDiscussionClosed">
                <NetworkText id="ui.network-exchange-workspace.5ce09fd7333f4582">
                  Dieser Beitrag dient zur Information. Die Diskussion ist
                  geschlossen.
                </NetworkText>
              </p>
            )}
            {!access?.readOnly &&
              thread.data.discussionOpen !== false &&
              !["draft", "archived"].includes(thread.status) && (
                <form onSubmit={send} className="networkExchangeComposer">
                  <label>
                    <NetworkText id="ui.network-exchange-workspace.921d17138777546b">
                      Was möchten Sie tun?
                    </NetworkText>
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
                    <NetworkText id="ui.network-exchange-workspace.2780f877bad54c82">
                      {kind === "meeting"
                        ? "Anlass und Ziel"
                        : kind === "action"
                          ? "Was ist zu tun?"
                          : "Ihre Nachricht"}
                    </NetworkText>
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
                        <NetworkText id="ui.network-exchange-workspace.0d95fd6a769f3f68">
                          Beginn
                        </NetworkText>
                        <input name="startsAt" type="datetime-local" required />
                      </label>
                      <label>
                        <NetworkText id="ui.network-exchange-workspace.56483823cc348ccb">
                          Dauer in Minuten
                        </NetworkText>
                        <input
                          name="durationMinutes"
                          type="number"
                          defaultValue="30"
                          min="15"
                          max="480"
                        />
                      </label>
                      <label>
                        <NetworkText id="ui.network-exchange-workspace.c5585dbb47e1f8a9">
                          Ort oder Einwahllink
                        </NetworkText>
                        <input name="location" maxLength={500} />
                      </label>
                    </div>
                  )}
                  {kind === "action" && (
                    <div className="networkExchangeFields">
                      <label>
                        <NetworkText id="ui.network-exchange-workspace.5c008fc563aa8d86">
                          Verantwortlich
                        </NetworkText>
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
                        <NetworkText id="ui.network-exchange-workspace.d1540c9a6c9e74d9">
                          Fällig am
                        </NetworkText>
                        <input name="deadline" type="datetime-local" />
                      </label>
                    </div>
                  )}
                  <label>
                    <NetworkText id="ui.network-exchange-workspace.53a8a2391a505c9a">
                      Datei / Leistungsportfolio
                    </NetworkText>
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                    />
                    <small>
                      <NetworkText id="ui.network-exchange-workspace.a46a1c06e348ce46">
                        PDF, JPG, PNG oder WebP · bis 1,5 MB. Nur im
                        berechtigten Teilnehmerkreis sichtbar.
                      </NetworkText>
                    </small>
                  </label>
                  <button className="networkPrimary" disabled={busy}>
                    <NetworkText id="ui.network-exchange-workspace.7e3c1dad9aee77a8">
                      {busy ? "Wird gesendet …" : "Senden"}
                    </NetworkText>
                  </button>
                </form>
              )}
          </>
        )}
      </section>
      {selectedMember && (
        <ProfileDialog
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
export function NetworkConversationsWorkspace() {
  return <PartnerChatWorkspace />;
}
