"use client";
import { NetworkText } from "./network-text-editor";
import { type ChatPulseState } from './network-pulse';
import { ChatCooperation } from './chat-status';
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import {
  readPartnerFile,
  downloadPartnerFile,
} from "./network-exchange-workspace";
type Person = {
  userId: string;
  name: string;
  company: string;
  role: string;
  logoUrl?: string | null;
};
type FileData = {
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
  body: string;
  createdAt: string;
  kind: string;
  attachments?: FileData[];
};
type Conversation = {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  updatedAt: string;
  status: string;
  currentUserId?: string;
  participants?: Person[];
  data: {
    participantUserIds?: string[];
    messages?: Message[];
    directChat?: boolean;
    networkPulse?: ChatPulseState;
    pulseNotes?: Message[];
  };
};
const ids = (item: Conversation) => [
  ...new Set([item.createdByUserId, ...(item.data.participantUserIds || [])]),
];
function Avatar({ person }: { person?: Person }) {
  return (
    <span className="partnerChatAvatar">
      {person?.logoUrl ? (
        <img src={person.logoUrl} alt="" />
      ) : (
        (person?.name || "P")
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
      )}
    </span>
  );
}
export function PartnerChatWorkspace() {
  const access = useNetworkAccess(),
    networkId = access?.networkId || "";
  const [people, setPeople] = useState<Person[]>([]),
    [items, setItems] = useState<Conversation[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [partner, setPartner] = useState(""),
    [thread, setThread] = useState<Conversation | null>(null),
    [text, setText] = useState(""),
    [file, setFile] = useState<Omit<FileData, "id"> | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [emojis, setEmojis] = useState(false),
    [loadedNetwork, setLoadedNetwork] = useState("");
  const scroll = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    request = useRef(0),
    consumed = useRef(""),
    busyRef = useRef(false),
    autoScroll = useRef(true);
  busyRef.current = busy;
  const base = `/networks/${networkId}`;
  const [logoByUser, setLogoByUser] = useState<Record<string, string>>({});
  const rawPerson = people.find((p) => p.userId === partner);
  const person = rawPerson
    ? {
        ...rawPerson,
        logoUrl: rawPerson.logoUrl || logoByUser[rawPerson.userId],
      }
    : undefined;
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !networkId) return;
    let active = true;
    setLogoByUser({});
    portalRequest<
      Array<{
        userId: string;
        organization: {
          networkProfile?: { logoUrl?: string | null } | null;
        } | null;
      }>
    >(`${base}/memberships`, { token })
      .then((members) => {
        if (active)
          setLogoByUser(
            Object.fromEntries(
              members
                .filter(
                  (member) => member.organization?.networkProfile?.logoUrl,
                )
                .map((member) => [
                  member.userId,
                  member.organization!.networkProfile!.logoUrl!,
                ]),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [networkId]);
  async function loadList() {
    const token = getPortalSession();
    if (!token || !networkId) return;
    try {
      const [list, persons] = await Promise.all([
        portalRequest<Conversation[]>(`${base}/content?type=conversation`, {
          token,
        }),
        portalRequest<Person[]>(`${base}/participants`, { token }),
      ]);
      setItems(list);
      setPeople(persons);
      setLoadedNetwork(networkId);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Chats konnten nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void loadList();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadList();
    }, 15000);
    return () => clearInterval(timer);
  }, [networkId]);
  function choosePerson(id: string) {
    if (busy || uploading) return;
    if (
      (text.trim() || file) &&
      !window.confirm("Nicht gesendete Nachricht verwerfen?")
    )
      return;
    request.current++;
    const existing = items.find(
      (item) =>
        !["draft", "archived"].includes(item.status) &&
        ids(item).length === 2 &&
        ids(item).includes(id) &&
        ids(item).includes(access?.currentUserId || ""),
    );
    setSelected(existing?.id || null);
    setPartner(id);
    setThread(null);
    setText("");
    setFile(null);
    setNotice("");
    setEmojis(false);
    autoScroll.current = true;
  }
  useEffect(() => {
    if (loadedNetwork !== networkId) return;
    const chatId = new URLSearchParams(window.location.search).get("chat");
    if (chatId && consumed.current !== `${networkId}:chat:${chatId}`) {
      const conversation = items.find((item) => item.id === chatId);
      if (conversation) {
        consumed.current = `${networkId}:chat:${chatId}`;
        setSelected(conversation.id);
        setPartner(ids(conversation).find((id) => id !== access?.currentUserId) || "");
      }
      return;
    }
    const id = new URLSearchParams(window.location.search).get("partner");
    if (!id || consumed.current === `${networkId}:${id}`) return;
    consumed.current = `${networkId}:${id}`;
    if (id === access?.currentUserId || !people.some((p) => p.userId === id)) {
      setNotice("Dieser Partner ist für einen Chat nicht verfügbar.");
      return;
    }
    choosePerson(id);
  }, [loadedNetwork, people, items, networkId]);
  useEffect(() => {
    if (!selected) {
      setThread(null);
      return;
    }
    let active = true;
    const load = async () => {
      const token = getPortalSession();
      if (!token || busyRef.current) return;
      const version = ++request.current;
      const near =
        !scroll.current ||
        scroll.current.scrollHeight -
          scroll.current.scrollTop -
          scroll.current.clientHeight <
          120;
      try {
        const value = await portalRequest<Conversation>(
          `${base}/content/${selected}/thread`,
          { token },
        );
        if (active && version === request.current) {
          autoScroll.current = autoScroll.current || near;
          setThread(value);
        }
      } catch (error) {
        if (active)
          setNotice(
            error instanceof Error ? error.message : "Chat nicht erreichbar.",
          );
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selected, networkId]);
  useEffect(() => {
    if (autoScroll.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight;
      autoScroll.current = false;
    }
  }, [thread?.id, thread?.data.messages?.length, thread?.data.pulseNotes?.length]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (
      !token ||
      busy ||
      uploading ||
      (!text.trim() && !file) ||
      access?.readOnly
    )
      return;
    setBusy(true);
    request.current++;
    setNotice("");
    try {
      let id = selected;
      if (!id) {
        if (!person) throw new Error("Bitte wähle einen Partner aus.");
        const created = await portalRequest<Conversation>(`${base}/content`, {
          token,
          body: {
            type: "conversation",
            status: "published",
            title: `Mitglieder-Chat · ${person.name}`.slice(0, 200),
            description:
              "Vertraulicher Austausch zwischen zwei Netzwerkpartnern.",
            participantUserIds: [person.userId],
            data: { category: "Sonstiger Austausch", directChat: true, pulseVisible: true },
          },
        });
        id = created.id;
        setSelected(id);
      }
      const updated = await portalRequest<Conversation>(
        `${base}/content/${id}/replies`,
        { token, body: { kind: "message", body: text.trim(), file } },
      );
      autoScroll.current = true;
      setThread(updated);
      setText("");
      setFile(null);
      setEmojis(false);
      void loadList();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Nachricht konnte nicht gesendet werden. Dein Entwurf bleibt erhalten.",
      );
    } finally {
      setBusy(false);
    }
  }
  const conversations = items.filter((item) =>
    (
      item.title +
      " " +
      ids(item)
        .map((id) => people.find((p) => p.userId === id)?.name || "")
        .join(" ")
    )
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const active = Boolean(partner || selected),
    closed = thread && ["draft", "archived"].includes(thread.status);
  return (
    <section
      className={`partnerChat${active ? " hasActiveChat" : ""}`}
      aria-label="Mitglieder-Chat"
    >
      <aside className="partnerChatSidebar">
        <header>
          <h2>
            <NetworkText id="ui.partner-chat-workspace.d6163d6685bdad2a">
              Mitglieder-Chat
            </NetworkText>
          </h2>
          <p>
            <NetworkText id="ui.partner-chat-workspace.8d26bdf52ad1867b">
              Persönlich. Direkt. Im Netzwerk.
            </NetworkText>
          </p>
        </header>
        <input
          className="partnerChatSearch"
          aria-label="Mitglieder und Chats suchen"
          placeholder="Mitglied oder Chat suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="partnerChatContacts">
          <h3>
            <NetworkText id="ui.partner-chat-workspace.c0625e93b068cfb0">
              Deine Gespräche
            </NetworkText>
          </h3>
          {conversations.map((item) => {
            const participantIds = ids(item),
              other = people.find(
                (p) =>
                  p.userId !== access?.currentUserId &&
                  participantIds.includes(p.userId),
              ),
              group = participantIds.length > 2,
              last = item.data.messages?.at(-1);
            return (
              <button
                type="button"
                key={item.id}
                disabled={busy || uploading}
                className={selected === item.id ? "active" : ""}
                onClick={() => {
                  if (
                    (text.trim() || file) &&
                    !window.confirm("Nicht gesendete Nachricht verwerfen?")
                  )
                    return;
                  setSelected(item.id);
                  setPartner(group ? "" : other?.userId || "");
                  setThread(null);
                  setText("");
                  setFile(null);
                  setNotice("");
                  autoScroll.current = true;
                }}
              >
                <Avatar
                  person={
                    other
                      ? {
                          ...other,
                          logoUrl: other.logoUrl || logoByUser[other.userId],
                        }
                      : undefined
                  }
                />
                <span>
                  <b>{group ? item.title : other?.name || item.title}</b>
                  <small>
                    {last?.body ||
                      (last?.attachments?.length
                        ? "Datei gesendet"
                        : other?.company || "Gespräch öffnen")}
                  </small>
                </span>
              </button>
            );
          })}
          {!conversations.length && (
            <p>
              <NetworkText id="ui.partner-chat-workspace.ad3c94208b7b18cc">
                Noch keine passenden Gespräche.
              </NetworkText>
            </p>
          )}
          <h3>
            <NetworkText id="ui.partner-chat-workspace.a44de4fb1b1413ef">
              Partner anschreiben
            </NetworkText>
          </h3>
          {people
            .filter(
              (p) =>
                p.userId !== access?.currentUserId &&
                (p.name + " " + p.company)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((p) => (
              <button
                type="button"
                key={p.userId}
                className={partner === p.userId ? "active" : ""}
                disabled={busy || uploading}
                onClick={() => choosePerson(p.userId)}
              >
                <Avatar
                  person={{ ...p, logoUrl: p.logoUrl || logoByUser[p.userId] }}
                />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.company}
                    {p.role === "network_admin" ? " · Netzwerkleitung" : ""}
                  </small>
                </span>
              </button>
            ))}
        </div>
      </aside>
      <div className="partnerChatMain">
        {active ? (
          <>
            <header className="partnerChatHeader">
              <button
                className="partnerChatBack"
                aria-label="Zurück zur Chatliste"
                disabled={busy || uploading}
                onClick={() => {
                  if (
                    (text.trim() || file) &&
                    !window.confirm("Nicht gesendete Nachricht verwerfen?")
                  )
                    return;
                  setSelected(null);
                  setPartner("");
                  setText("");
                  setFile(null);
                }}
              >
                ‹
              </button>
              <Avatar person={person} />
              <div>
                <h2>{person?.name || thread?.title || "Mitglieder-Chat"}</h2>
                <p>
                  {person?.company || "Geschlossener Teilnehmerkreis"}
                  <NetworkText id="ui.partner-chat-workspace.0ccdcc9c25c50330">
                    · Vertraulicher Austausch
                  </NetworkText>
                </p>
              </div>
              {person?.logoUrl && (
                <img
                  className="partnerChatCompanyLogo"
                  src={person.logoUrl}
                  alt={`Logo ${person.company || person.name}`}
                />
              )}
              <ChatCooperation key={thread?.id || partner} networkId={networkId} thread={thread} onUpdate={() => { if(thread) void portalRequest<Conversation>(`${base}/content/${thread.id}/thread`, { token: getPortalSession() || '' }).then(setThread).catch(() => setNotice('Status bitte erneut laden.')); }} />
            </header>
            <div
              className="partnerChatHistory"
              ref={scroll}
              role="log"
              aria-label="Gesprächsverlauf"
              aria-live="polite"
            >
              <p className="partnerChatPrivacy">
                {!thread && 'Nach der ersten Antwort des Gesprächspartners erscheint der Status „Im Gespräch“. Nachrichten bleiben vertraulich. '}
                <NetworkText id="ui.partner-chat-workspace.807298e4d83a8a60">
                  Nur die Gesprächsteilnehmer können mitlesen. Die
                  Netzwerkleitung wird nicht automatisch hinzugefügt.
                </NetworkText>
              </p>
              {thread && !thread.data.directChat && (
                <article
                  className={`partnerChatBubble${thread.createdByUserId === access?.currentUserId ? " own" : ""}`}
                >
                  <small>
                    <NetworkText id="ui.partner-chat-workspace.9a5d286c9d1885c9">
                      Bisheriger Gesprächseinstieg ·{" "}
                    </NetworkText>
                    {thread.title}
                  </small>
                  <p>{thread.description}</p>
                </article>
              )}
              {selected && !thread ? (
                <p>
                  <NetworkText id="ui.partner-chat-workspace.05ece1d7297abd77">
                    Chat wird geladen …
                  </NetworkText>
                </p>
              ) : !thread?.data.messages?.length ? (
                <div className="partnerChatWelcome">
                  <span className="partnerChatWelcomeKicker">
                    <NetworkText id="ui.partner-chat-workspace.021dd81847775891">
                      DEIN DIREKTER DRAHT
                    </NetworkText>
                  </span>
                  <h3>
                    {person
                      ? `Sag ${person.name.split(" ")[0]} Hallo.`
                      : "Beginne den Austausch."}
                  </h3>
                  <p>
                    {person?.company && (
                      <strong>
                        {person.company}
                        <br />
                      </strong>
                    )}
                    <NetworkText id="ui.partner-chat-workspace.6489f42fdd22c119">
                      Lernt euch kennen, teilt Ideen und macht aus einem Kontakt
                      ein gutes Gespräch.
                    </NetworkText>
                  </p>
                  <div className="partnerChatStarters">
                    {[
                      {
                        label: "🤝 Kurz kennenlernen",
                        text: `Hallo ${person?.name.split(" ")[0] || ""}, schön, dass wir im selben Netzwerk sind! Ich würde dich und dein Unternehmen gerne näher kennenlernen.`,
                      },
                      {
                        label: "☕ Gespräch vereinbaren",
                        text: `Hallo ${person?.name.split(" ")[0] || ""}, hast du Zeit für einen kurzen persönlichen Austausch?`,
                      },
                      {
                        label: "💡 Gemeinsam etwas bewegen",
                        text: `Hallo ${person?.name.split(" ")[0] || ""}, ich habe eine Idee für eine mögliche Zusammenarbeit und würde mich gerne mit dir dazu austauschen.`,
                      },
                    ].map((starter) => (
                      <button
                        type="button"
                        key={starter.label}
                        disabled={busy || access?.readOnly}
                        onClick={() => {
                          if (
                            text.trim() &&
                            !window.confirm(
                              "Deinen bisherigen Nachrichtentext ersetzen?",
                            )
                          )
                            return;
                          setText(starter.text);
                          input.current?.focus();
                        }}
                      >
                        {starter.label}
                      </button>
                    ))}
                  </div>
                  <small>
                    <NetworkText id="ui.partner-chat-workspace.2029e7e7c2fc0d54">
                      Wähle einen Einstieg und passe ihn an. Gesendet wird erst
                      mit dem Senden-Button.
                    </NetworkText>
                  </small>
                </div>
              ) : null}
              {[...(thread?.data.messages || []), ...(thread?.data.pulseNotes || []).map(n => ({...n, kind:'status-note'}))].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map((message, index, all) => {
                if(message.kind === 'status-note') return <aside className="partnerChatSystemNote" key={message.id}><strong>Status aktualisiert</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString('de-DE')}</time></aside>;
                const own =
                    message.userId ===
                    (thread?.currentUserId || access?.currentUserId),
                  date = new Date(message.createdAt).toLocaleDateString(
                    "de-DE",
                  );
                return (
                  <div key={message.id}>
                    {(index === 0 ||
                      new Date(all[index - 1].createdAt).toLocaleDateString(
                        "de-DE",
                      ) !== date) && (
                      <div className="partnerChatDay">{date}</div>
                    )}
                    <article
                      className={`partnerChatBubble${own ? " own" : ""}`}
                    >
                      {thread && ids(thread).length > 2 && !own && (
                        <b>{message.author}</b>
                      )}
                      {message.kind !== "message" && (
                        <small>
                          <NetworkText id="ui.partner-chat-workspace.82da31d7cc72f30f">
                            {message.kind === "meeting"
                              ? "Termin"
                              : "Nächster Schritt"}
                          </NetworkText>
                        </small>
                      )}
                      {message.body && <p>{message.body}</p>}
                      {message.attachments?.map((attachment) => (
                        <button
                          type="button"
                          className="partnerChatAttachment"
                          key={attachment.id}
                          onClick={() => downloadPartnerFile(attachment)}
                        >
                          {attachment.mimeType.startsWith("image/") && (
                            <img
                              src={attachment.dataUrl}
                              alt={attachment.name}
                              loading="lazy"
                            />
                          )}
                          <span>
                            ↓ {attachment.name} ·{" "}
                            {(attachment.size / 1024).toFixed(0)}
                            <NetworkText id="ui.partner-chat-workspace.59281a6b29351cfa">
                              KB
                            </NetworkText>
                          </span>
                        </button>
                      ))}
                      <time dateTime={message.createdAt}>
                        {new Date(message.createdAt).toLocaleTimeString(
                          "de-DE",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </time>
                    </article>
                  </div>
                );
              })}
            </div>
            {notice && (
              <p className="partnerChatError" role="alert">
                {notice}
              </p>
            )}
            {closed ? (
              <p className="partnerChatError">
                <NetworkText id="ui.partner-chat-workspace.ede306eeef4d72d3">
                  Dieses Gespräch ist archiviert oder noch nicht geöffnet.
                </NetworkText>
              </p>
            ) : access?.readOnly ? (
              <p className="partnerChatError">
                <NetworkText id="ui.partner-chat-workspace.3ee6998c8696b289">
                  Dein Zugang ist derzeit schreibgeschützt.
                </NetworkText>
              </p>
            ) : (
              <form className="partnerChatComposer" onSubmit={send}>
                {file && (
                  <div className="partnerChatPending">
                    {file.mimeType.startsWith("image/") && (
                      <img src={file.dataUrl} alt="Anhang Vorschau" />
                    )}
                    <span>{file.name}</span>
                    <button
                      type="button"
                      aria-label="Anhang entfernen"
                      disabled={busy}
                      onClick={() => setFile(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                {emojis && (
                  <div
                    className="partnerChatEmojis"
                    aria-label="Emoji auswählen"
                  >
                    {[
                      "😀",
                      "😊",
                      "👍",
                      "🙌",
                      "🤝",
                      "🎉",
                      "⚽",
                      "☕",
                      "💡",
                      "❤️",
                      "🙏",
                      "✅",
                    ].map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        aria-label={`Emoji ${emoji}`}
                        onClick={() => {
                          const position =
                            input.current?.selectionStart ?? text.length;
                          setText(
                            text.slice(0, position) +
                              emoji +
                              text.slice(position),
                          );
                          input.current?.focus();
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div className="partnerChatInputRow">
                  <button
                    type="button"
                    aria-label="Emojis öffnen"
                    aria-expanded={emojis}
                    disabled={busy}
                    onClick={() => setEmojis(!emojis)}
                  >
                    ☺
                  </button>
                  <label
                    className="partnerChatUpload"
                    title="Bild oder PDF anhängen"
                  >
                    <span aria-hidden="true">＋</span>
                    <input
                      type="file"
                      aria-label="Bild oder PDF anhängen"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={busy || uploading}
                      onChange={async (event) => {
                        const chosen = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!chosen) return;
                        setUploading(true);
                        try {
                          setFile(await readPartnerFile(chosen));
                          setNotice("");
                        } catch (error) {
                          setNotice(
                            error instanceof Error
                              ? error.message
                              : "Datei konnte nicht gelesen werden.",
                          );
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>
                  <textarea
                    ref={input}
                    rows={1}
                    aria-label="Deine Nachricht"
                    placeholder="Schreib eine Nachricht …"
                    value={text}
                    maxLength={5000}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    className="partnerChatSend"
                    aria-label="Nachricht senden"
                    disabled={busy || uploading || (!text.trim() && !file)}
                  >
                    {busy ? "…" : "➤"}
                  </button>
                </div>
                <small>
                  <NetworkText id="ui.partner-chat-workspace.2d5dbe565069794a">
                    {uploading
                      ? "Datei wird vorbereitet …"
                      : "Enter zum Senden · Shift + Enter für einen Absatz · Bilder / PDF bis 1,5 MB"}
                  </NetworkText>
                </small>
              </form>
            )}
          </>
        ) : (
          <div className="partnerChatEmpty">
            <span aria-hidden="true">↔</span>
            <h2>
              <NetworkText id="ui.partner-chat-workspace.da03b3d770e1563f">
                Gute Kontakte beginnen mit einem Gespräch.
              </NetworkText>
            </h2>
            <p>
              <NetworkText id="ui.partner-chat-workspace.6e7f31218bf31ab3">
                Wähle einen Partner aus und schreib direkt los – ohne Betreff
                und ohne Umwege.
              </NetworkText>
            </p>
            {notice && <p role="alert">{notice}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
