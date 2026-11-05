"use client";
import { NetworkText } from "./network-text-editor";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import {
  NetworkThreadDialog,
  downloadPartnerFile,
} from "./network-exchange-workspace";
import { useNetworkAccess } from "./network-shell";
import { NetworkBoardPager } from "./network-board-pager";
import { useRouter } from "next/navigation";

type ContentType =
  "event" | "topic" | "task" | "document" | "conversation" | "need" | "service";
type Status = "draft" | "published" | "active" | "completed" | "archived";
type Item = {
  id: string;
  createdByUserId: string;
  type: ContentType;
  title: string;
  description: string;
  status: Status;
  startsAt: string | null;
  endsAt?: string | null;
  homepageGrants?: { events?: { enabled: boolean } };
  visibility: "members" | "administrators";
  updatedAt: string;
  createdAt?: string;
  data: Record<string, any>;
  attendanceSummary?: { registrations: number; persons: number };
};
type Attendance = {
  id: string;
  memberUserId?: string;
  membershipId: string;
  memberName: string;
  organizationName: string;
  response: "registered" | "declined";
  attendance: "pending" | "present" | "absent";
  guestNames: string[];
  companionCount: number;
  note: string | null;
};

function eventPhase(item:Item) {
  if(item.data.eventStatus === "cancelled") return "Abgesagt";
  return item.startsAt && Date.parse(item.endsAt || item.startsAt) < Date.now()
    ? "Bereits stattgefunden" : "Bevorstehend";
}
type Config = {
  type: ContentType;
  singular: string;
  plural: string;
  empty: string;
  purpose: string;
  categories: string[];
};

const configs: Record<string, Config> = {
  veranstaltungen: {
    type: "event",
    singular: "Veranstaltung",
    plural: "Veranstaltungen",
    empty: "Noch keine Veranstaltungen angelegt",
    purpose:
      "Bringen Sie Partner persönlich zusammen, verwalten Sie Zu- und Absagen und halten Sie die tatsächliche Teilnahme nachvollziehbar fest.",
    categories: [
      "Geschäftstreffen",
      "Netzwerkveranstaltung",
      "Workshop & Wissen",
      "Sport & Gemeinschaft",
      "Externer Termin",
    ],
  },
  angebote: {
    type: "service",
    singular: "Angebot",
    plural: "Anfragen, Angebote und Leistungen",
    empty: "Noch keine Leistungen oder Kooperationsangebote veröffentlicht",
    purpose:
      "Teilen Sie konkreten Bedarf, Leistungen und Kooperationsmöglichkeiten mit Ihren Partnern – klar, nützlich und ohne unübersichtliche Werbebeiträge.",
    categories: [
      "Geschäftsanfrage & Bedarf",
      "Produkt & Leistung",
      "Kooperationsangebot",
      "Sonderkondition für Partner",
      "Empfehlung & Kontakt",
      "Sponsoring & Unterstützung",
    ],
  },
  kommunikation: {
    type: "conversation",
    singular: "Gespräch",
    plural: "Gespräche",
    empty: "Noch keine freigegebenen Gespräche vorhanden",
    purpose:
      "Starten Sie einen zielgerichteten Austausch mit Partnern und machen Sie Anlass und gewünschtes Ergebnis sofort verständlich.",
    categories: [
      "Geschäftliche Anfrage",
      "Vorstellung & Kennenlernen",
      "Kooperation",
      "Erfahrungsaustausch",
      "Sonstiger Austausch",
    ],
  },
  themen: {
    type: "topic",
    singular: "Beitrag",
    plural: "Aktuelles",
    empty: "Noch keine Partnerthemen veröffentlicht",
    purpose:
      "Teilen Sie Neuigkeiten, holen Sie Meinungen ein und fördern Sie den offenen Austausch im gesamten Partnerkreis.",
    categories: [
      "Neuigkeit des Initiators",
      "Partnerportal & Entwicklung",
      "Austausch & Ideen",
      "Erfolge & Empfehlungen",
      "Umfrage & Feedback",
    ],
  },
  aufgaben: {
    type: "task",
    singular: "Aufgabe",
    plural: "Aufgaben",
    empty: "Noch keine Aufgaben erfasst",
    purpose:
      "Halten Sie gemeinsame nächste Schritte, Zuständigkeiten und Fristen fest, damit aus Gesprächen konkrete Zusammenarbeit entsteht.",
    categories: [
      "Gemeinsames Projekt",
      "Veranstaltungsorganisation",
      "Kontakt & Nachverfolgung",
      "Inhalt & Kommunikation",
      "Sonstiger nächster Schritt",
    ],
  },
  dokumente: {
    type: "document",
    singular: "Dokument",
    plural: "Dokumente und Wissen",
    empty: "Noch keine Dokumente bereitgestellt",
    purpose:
      "Stellen Sie relevantes Wissen zentral bereit: Protokolle, Präsentationen, Vorlagen, Partnerinformationen oder Bilder. Erlaubt sind PDF, JPG, PNG und WebP bis 1,5 MB.",
    categories: [
      "Protokoll & Ergebnis",
      "Präsentation & Information",
      "Vorlage & Arbeitshilfe",
      "Angebot & Partnerleistung",
      "Bild & Veranstaltungsdokumentation",
      "Richtlinie & Organisation",
    ],
  },
};
const labels: Record<Status, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  active: "Aktiv",
  completed: "Erledigt",
  archived: "Archiviert",
};

export function NetworkModuleWorkspace({
  module,
  slug,
}: {
  module: string;
  slug: string;
}) {
  const config = configs[module];
  const board = module === "themen";
  const router = useRouter();
  const access = useNetworkAccess();
  const [networkId, setNetworkId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [dialog, setDialog] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [people, setPeople] = useState<Array<{ userId: string; name: string }>>(
    [],
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [attendanceEvent, setAttendanceEvent] = useState<Item | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const readDocument = (file: File) =>
    new Promise<{
      name: string;
      mimeType: string;
      size: number;
      dataUrl: string;
    }>((resolve, reject) => {
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!allowed.includes(file.type)) {
        reject(
          new Error(
            "Bitte laden Sie eine PDF-, JPG-, PNG- oder WebP-Datei hoch.",
          ),
        );
        return;
      }
      if (file.size > 1_500_000) {
        reject(new Error("Die Datei darf maximal 1,5 MB groß sein."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl: String(reader.result),
        });
      reader.onerror = () =>
        reject(new Error("Die Datei konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    void load();
  }, [module, slug, access?.networkId]);
  useEffect(() => {
    if (module === "themen" && items.length) {
      const id = new URLSearchParams(window.location.search).get("article");
      if (items.some((item) => item.id === id)) setThreadId(id);
    }
    if (module !== "veranstaltungen" || !networkId || !items.length) return;
    const id = new URLSearchParams(window.location.search).get("event");
    const item = items.find((entry) => entry.id === id);
    if (item) void openAttendance(item);
  }, [items, networkId, module]);
  async function load() {
    const token = getPortalSession();
    if (!token || !config) {
      setNotice("Bitte melden Sie sich erneut an.");
      return;
    }
    try {
      if (!access?.networkId) return;
      setNetworkId(access.networkId);
      setPeople(
        await portalRequest<Array<{ userId: string; name: string }>>(
          `/networks/${access.networkId}/participants`,
          { token },
        ),
      );
      setItems(
        await portalRequest<Item[]>(
          `/networks/${access.networkId}/content?type=${board ? "noticeboard" : config.type}`,
          { token },
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Die Netzwerkdaten konnten nicht geladen werden.",
      );
    }
  }
  const canEditItem = (item: Item) =>
    !access?.readOnly &&
    (item.type === "event"
      ? Boolean(access?.isInitiator)
      : (access?.canManage || item.createdByUserId === access?.currentUserId));
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === "Alle" || labels[item.status] === filter || (module === "veranstaltungen" && eventPhase(item) === filter)) &&
          `${item.title} ${item.description}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ).sort((a,b)=>module !== "veranstaltungen" ? 0 :
        Number(eventPhase(a)!=="Bevorstehend")-Number(eventPhase(b)!=="Bevorstehend") ||
        (eventPhase(a)==="Bevorstehend" ? 1 : -1)*(Date.parse(a.startsAt||a.createdAt||a.updatedAt)-Date.parse(b.startsAt||b.createdAt||b.updatedAt))),
    [items, query, filter,module],
  );
  if (!config) return null;
  const memberCanCreate = [
    "kommunikation",
    "angebote",
    "themen",
    "dokumente",
    "aufgaben",
  ].includes(module);
  const canCreate = Boolean(
    !access?.readOnly && (module === "veranstaltungen" ? access?.isInitiator : (access?.canManage || memberCanCreate)),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token || !networkId) return;
    const form = new FormData(event.currentTarget);
    if (module === "veranstaltungen" && form.get("homepagePublish") === "on") {
      const fields = [
        ["title", "Titel"],
        ["description", "Beschreibung"],
        ["startsAt", "Beginn"],
      ];
      const missing = fields.filter(
        ([name]) => !String(form.get(name) ?? "").trim(),
      );
      if (missing.length) {
        setNotice(
          `Bitte noch ergänzen: ${missing.map(([, label]) => label).join(", ")}. Bereits ausgefüllte Angaben bleiben erhalten.`,
        );
        const field = event.currentTarget.elements.namedItem(missing[0][0]);
        if (field instanceof HTMLElement) {
          field.focus();
          field.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return;
      }
    }
    setBusy(true);
    try {
      const documentFile = form.get("file"),
        file =
          module === "dokumente" &&
          documentFile instanceof File &&
          documentFile.size
            ? await readDocument(documentFile)
            : null;
      const data: Record<string, unknown> = {
        category: form.get("category"),
        location: form.get("location"),
        mode: form.get("mode"),
        recurrence: form.get("recurrence"),
        capacity: form.get("capacity"),
        deadline: form.get("deadline")
          ? new Date(String(form.get("deadline"))).toISOString()
          : null,
        priority: form.get("priority"),
        assignee: form.get("assignee"),
        file,
        keywords: form.get("keywords"),
        options: form.get("options"),
      };
      if (!file) delete data.file;
      if (module === "themen") {
        data.discussionOpen = form.get("discussionOpen") === "on";
        const image = form.get("articleImage");
        if (image instanceof File && image.size) {
          if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
            throw new Error("Bitte ein PNG-, JPG- oder WebP-Foto auswählen.");
          data.imageUrl = (await readDocument(image)).dataUrl;
        }
      }
      if (module === "veranstaltungen") {
        for (const field of [
          "timezone",
          "publicLocation",
          "organizer",
          "participationTerms",
          "cost",
          "registrationUrl",
          "eventStatus",
          "publicEventKind",
          "publicAttendanceMode",
          "publicOnlineUrl",
          "publicPreviousStartDate",
          "publicVenueName",
          "publicStreetAddress",
          "publicPostalCode",
          "publicAddressLocality",
          "publicAddressCountry",
        ])
          data[field] = form.get(field);
        const publicImage = form.get("homepageImage");
        data.publicAttendanceMode =
          form.get("mode") === "Online"
            ? "online"
            : form.get("mode") === "Hybrid"
              ? "hybrid"
              : "offline";
        data.location =
          form.get("publicLocation") || form.get("location") || "";
        if (publicImage instanceof File && publicImage.size) {
          if (
            !["image/png", "image/jpeg", "image/webp"].includes(
              publicImage.type,
            ) ||
            publicImage.size > 1_500_000
          )
            throw Error(
              "Öffentliches Bild: PNG, JPEG oder WebP bis 1,5 MB erforderlich.",
            );
          data.imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(publicImage);
          });
        }
      }
      const created = await portalRequest<Item>(
        `/networks/${networkId}/content${editing ? "/" + editing.id : ""}`,
        {
          token,
          body: {
            type: config.type,
            title: form.get("title"),
            description: form.get("description"),
            assignedToUserId: form.get("assignedToUserId"),
            status: form.get("status"),
            startsAt: form.get("startsAt")
              ? new Date(String(form.get("startsAt"))).toISOString()
              : null,
            endsAt:
              module === "veranstaltungen" &&
              form.get("durationMinutes") &&
              form.get("startsAt")
                ? new Date(
                    Date.parse(String(form.get("startsAt"))) +
                      Number(form.get("durationMinutes")) * 60000,
                  ).toISOString()
                : form.get("endsAt")
                  ? new Date(String(form.get("endsAt"))).toISOString()
                  : null,
            visibility: form.get("visibility"),
            data,
            ...(module === "veranstaltungen" &&
            slug === "unternehmerfreunde" &&
            access?.isInitiator
              ? { homepagePublish: form.get("homepagePublish") === "on" }
              : {}),
          },
        },
      );
      setItems((current) =>
        editing
          ? current.map((i) => (i.id === created.id ? created : i))
          : [created, ...current],
      );
      if (
        module === "veranstaltungen" &&
        slug === "unternehmerfreunde" &&
        access?.isInitiator &&
        Boolean(created.homepageGrants?.events?.enabled) !==
          (form.get("homepagePublish") === "on")
      ) {
        setEditing(created);
        throw new Error(
          "Die Veranstaltung wurde im Portal gespeichert, die Homepage-Freigabe aber noch nicht übernommen. Bitte nach Abschluss der Server-Aktualisierung erneut speichern.",
        );
      }
      setDialog(false);
      setEditing(null);
      setNotice(
        module === "veranstaltungen" && !access?.canManage
          ? "Veranstaltungsvorschlag gespeichert. Die Netzwerkleitung prüft und veröffentlicht ihn."
          : `${config.singular} wurde gespeichert.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der Eintrag konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function change(item: Item, status: Status) {
    const token = getPortalSession();
    if (!token || !networkId) return;
    try {
      const updated = await portalRequest<Item>(
        `/networks/${networkId}/content/${item.id}`,
        { token, body: { status } },
      );
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setNotice(`Status: ${labels[status]}.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der Status konnte nicht geändert werden.",
      );
    }
  }
  async function remove(item: Item) {
    if (
      !window.confirm(
        `„${item.title}“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    )
      return;
    const token = getPortalSession();
    if (!token || !networkId) return;
    setBusy(true);
    try {
      await portalRequest(`/networks/${networkId}/content/${item.id}/delete`, {
        token,
        body: {},
      });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (attendanceEvent?.id === item.id) setAttendanceEvent(null);
      setNotice(`${config.singular} wurde endgültig gelöscht.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der Eintrag konnte nicht gelöscht werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openAttendance(item: Item) {
    const token = getPortalSession();
    if (!token || !networkId) return;
    try {
      setAttendance(
        await portalRequest<Attendance[]>(
          `/networks/${networkId}/events/${item.id}/attendance`,
          { token },
        ),
      );
      setAttendanceEvent(item);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Teilnahmeliste konnte nicht geladen werden.",
      );
    }
  }
  async function saveOwnAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token || !attendanceEvent) return;
    const form = new FormData(event.currentTarget);
    try {
      await portalRequest(
        `/networks/${networkId}/events/${attendanceEvent.id}/attendance/self`,
        { token, body: Object.fromEntries(form) },
      );
      await openAttendance(attendanceEvent);
      setNotice("Ihre Rückmeldung wurde gespeichert.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Rückmeldung konnte nicht gespeichert werden.",
      );
    }
  }
  async function markAttendance(row: Attendance, value: "present" | "absent") {
    const token = getPortalSession();
    if (!token || !attendanceEvent) return;
    await portalRequest(
      `/networks/${networkId}/events/${attendanceEvent.id}/attendance/${row.membershipId}`,
      {
        token,
        body: {
          response: row.response,
          attendance: value,
          guestNames: row.guestNames,
          companionCount: row.companionCount,
          note: row.note,
        },
      },
    );
    await openAttendance(attendanceEvent);
  }
  function exportAttendance(kind: "excel" | "pdf") {
    if (!attendanceEvent) return;
    const rows = [
      [
        "Mitglied",
        "Unternehmen",
        "Rückmeldung",
        "Anwesenheit",
        "Begleitpersonen",
        "Gäste",
      ],
      ...attendance.map((x) => [
        x.memberName,
        x.organizationName,
        x.response === "registered" ? "Angemeldet" : "Abgemeldet",
        x.attendance === "present"
          ? "Anwesend"
          : x.attendance === "absent"
            ? "Abwesend"
            : "Offen",
        String(x.companionCount),
        x.guestNames.join(", "),
      ]),
    ];
    const table = `<table>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")}</td>`).join("")}</tr>`).join("")}</table>`;
    if (kind === "excel") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob(["\ufeff", table], { type: "application/vnd.ms-excel" }),
      );
      a.download = `anwesenheit-${attendanceEvent.title}.xls`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(
          `<title>Anwesenheitsliste</title><h1>${attendanceEvent.title.replaceAll("<", "&lt;")}</h1>${table}<script>print();close();<\/script>`,
        );
        win.document.close();
      }
    }
  }
  function exportCsv() {
    const rows = [
      ["Titel", "Kategorie", "Beschreibung", "Status", "Start", "Aktualisiert"],
      ...visible.map((item) => [
        item.title,
        String(item.data.category || ""),
        item.description,
        labels[item.status],
        item.startsAt || "",
        item.updatedAt,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `${module}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  function openDocument(item: Item) {
    const file = item.data.file;
    if (!file || typeof file !== "object") return;
    const dataUrl = (file as { dataUrl?: unknown }).dataUrl;
    if (typeof dataUrl === "string") downloadPartnerFile(file);
  }

  return (
    <div className="networkFunctionalWorkspace">
      {!board && module !== "veranstaltungen" && (
        <section className="networkModulePurpose">
          <strong>
            <NetworkText id="ui.network-module-workspace.d7210663cfd95a64">
              Gemeinsam mehr erreichen
            </NetworkText>
          </strong>
          <p>
            <NetworkText id={`ui.module.${module}.purpose`}>
              {config.purpose}
            </NetworkText>
          </p>
        </section>
      )}
      <div className="networkMemberToolbar">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${config.plural} durchsuchen`}
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Status filtern"
        >
          <option>Alle</option>
          {module === "veranstaltungen" && ["Bevorstehend","Bereits stattgefunden","Abgesagt"].map(label=><option key={label}>{label}</option>)}
          {Object.values(labels).filter(()=>module !== "veranstaltungen" || access?.isInitiator).map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
        {canCreate && (
          <button
            className="networkPrimary"
            type="button"
            onClick={() => {
              setEditing(null);
              setDialog(true);
            }}
          >
            ＋ {config.singular}
            <NetworkText id="ui.network-module-workspace.5c1058aea6bf5633">
              anlegen
            </NetworkText>
          </button>
        )}
      </div>
      {module !== "veranstaltungen" && <div className={board ? "boardCounts" : "networkMemberStats"}>
        <button
          className={filter === "Alle" ? "active" : ""}
          onClick={() => setFilter("Alle")}
        >
          <strong>{items.length}</strong>
          <span>
            <NetworkText id="ui.network-module-workspace.a36bce47fdac8f55">
              Gesamt
            </NetworkText>
          </span>
        </button>
        {(["published", "active", "completed"] as const)
          .filter((value) => !board || value === "published")
          .map((value) => (
            <button
              key={value}
              className={filter === labels[value] ? "active" : ""}
              onClick={() => setFilter(labels[value])}
            >
              <strong>
                {items.filter((item) => item.status === value).length}
              </strong>
              <span>{labels[value]}</span>
            </button>
          ))}
      </div>}
      {board ? (
        <NetworkBoardPager
          key={JSON.stringify([slug, query, filter])}
          empty={
            <p className="boardNoStories">
              <NetworkText id="ui.network-module-workspace.fe5d2dfb87217628">
                {items.length
                  ? "Keine passenden Beiträge. Ändere die Suche oder den Filter."
                  : "Das Brett ist noch leer. Hier erscheinen die Neuigkeiten aus deinem Netzwerk."}
              </NetworkText>
            </p>
          }
        >
          {visible.map((item, index) => {
            const image =
              item.data.boardImageUrl ||
              item.data.imageUrl ||
              item.data.coverImageUrl;
            const welcome = typeof item.data.welcomeMembershipId === "string";
            const partner = item.data.welcomeMembershipId || item.data.partnerMembershipId;
            const date = new Date(item.createdAt || item.updatedAt);
            return (
              <article
                className={`loungeBoardNote loungeBoardNote${index % 3} boardPaperStory`}
                key={item.id}
              >
                <span className="loungeBoardPin" aria-hidden="true" />
                <button
                  className="boardStoryOpen"
                  type="button"
                  onClick={() =>
                    typeof partner === "string"
                      ? router.push(
                          `/portal/netzwerk/${slug}/mitglieder?profil=${encodeURIComponent(String(partner))}${item.data.partnerMembershipId ? "&rubrik=offers" : ""}` as never,
                        )
                      : setThreadId(item.id)
                  }
                >
                  {image && (
                    <img
                      src={image}
                      style={
                        item.data.boardImageIsLogo
                          ? {
                              objectFit: "contain",
                              background: "white",
                              width: "66.6667%",
                              marginInline: "auto",
                              display: "block",
                              maxHeight: "96px",
                            }
                          : undefined
                      }
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <div className="boardStoryText">
                    <div className="boardStoryMeta">
                      <span>
                        {welcome
                          ? "Neues Mitglied"
                          : item.data.category === "Neuigkeit des Initiators"
                            ? "Netzwerkleitung"
                            : item.data.category || "Netzwerkbeitrag"}
                      </span>
                      <time dateTime={date.toISOString()}>
                        {date.toLocaleDateString("de-DE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    {item.status !== "published" && (
                      <small>{labels[item.status]}</small>
                    )}
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <strong>
                      <NetworkText id="ui.network-module-workspace.c37d0b68574d5dc4">
                        {welcome
                          ? "Unternehmensseite ansehen"
                          : "Beitrag öffnen"}
                      </NetworkText>{" "}
                      →
                    </strong>
                  </div>
                </button>
                {!welcome && canEditItem(item) && (
                  <details className="boardStoryManage">
                    <summary>
                      <NetworkText id="ui.network-module-workspace.86d874722332a7e6">
                        Beitrag verwalten
                      </NetworkText>
                    </summary>
                    <button
                      onClick={() => {
                        setEditing(item);
                        setDialog(true);
                      }}
                    >
                      <NetworkText id="ui.network-module-workspace.84e45ee7341134db">
                        Bearbeiten
                      </NetworkText>
                    </button>
                    {item.status !== "published" && (
                      <button
                        disabled={busy}
                        onClick={() => void change(item, "published")}
                      >
                        <NetworkText id="ui.network-module-workspace.1e7ae8483818ab1f">
                          Veröffentlichen
                        </NetworkText>
                      </button>
                    )}
                    {item.status !== "completed" && (
                      <button
                        disabled={busy}
                        onClick={() => void change(item, "completed")}
                      >
                        <NetworkText id="ui.network-module-workspace.2618017f6e9a45eb">
                          Erledigen
                        </NetworkText>
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button
                        disabled={busy}
                        onClick={() => void change(item, "archived")}
                      >
                        <NetworkText id="ui.network-module-workspace.a54c8debab88a289">
                          Archivieren
                        </NetworkText>
                      </button>
                    )}
                    <button disabled={busy} onClick={() => void remove(item)}>
                      <NetworkText id="ui.network-module-workspace.6c2d352161df5809">
                        Löschen
                      </NetworkText>
                    </button>
                  </details>
                )}
              </article>
            );
          })}
        </NetworkBoardPager>
      ) : (
        <section className={`networkCard${module === "veranstaltungen" ? " networkEventCatalog" : ""}`}>
          <header>
            <div>
              <h2>
                <NetworkText id={`ui.module.${module}.title`}>
                  {config.plural}
                </NetworkText>
              </h2>
            </div>
            {(module !== "veranstaltungen" || access?.isInitiator) && <button
              type="button"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <NetworkText id="ui.network-module-workspace.c859cc1c24cf0a40">
                CSV exportieren
              </NetworkText>
            </button>}
          </header>
          <div className="networkContentRows">
            {visible.map((item) => (
              <article
                key={item.id}
                className={
                  ["veranstaltungen", "themen"].includes(module)
                    ? "networkEventRow"
                    : undefined
                }
              >
                {["veranstaltungen", "themen"].includes(module) && (
                    <img
                      className="networkEventThumbnail"
                      src={item.data.imageUrl || item.data.coverImageUrl || "/images/network-meeting-club.webp"}
                      alt=""
                    />
                  )}
                <div>
                  {(module !== "veranstaltungen" || access?.isInitiator) && <span className={`networkMemberStatus ${item.status}`}>
                    {labels[item.status]}
                  </span>}
                  {module === "veranstaltungen" && (
                    <span className="networkContentCategory">
                      <NetworkText id="ui.network-module-workspace.480a2432a9fd2e22">
                        {item.data.eventStatus === "cancelled"
                          ? "Abgesagt"
                          : item.startsAt &&
                              Date.parse(item.endsAt || item.startsAt) <
                                Date.now()
                            ? "Bereits stattgefunden"
                            : "Bevorstehend"}
                      </NetworkText>
                    </span>
                  )}
                  {typeof item.data.category === "string" &&
                    item.data.category && (
                      <span className="networkContentCategory">
                        {item.data.category}
                      </span>
                    )}
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <small>
                    {item.startsAt
                      ? new Date(item.startsAt).toLocaleString("de-DE")
                      : module === "veranstaltungen"
                        ? "Ohne Termin"
                        : `Beitrag vom ${new Date(item.createdAt || item.updatedAt).toLocaleDateString("de-DE")}`}{" "}
                    ·{" "}
                    <NetworkText id="ui.network-module-workspace.039534f5853ce467">
                      {item.visibility === "administrators"
                        ? "Nur Verwaltung"
                        : "Alle Partner"}
                    </NetworkText>
                    {module === "veranstaltungen" && item.attendanceSummary
                      ? ` · ${item.attendanceSummary.registrations} Zusagen · ${item.attendanceSummary.persons} Personen`
                      : ""}
                  </small>
                </div>
                <div className="networkRowActions networkRowActionsStacked">
                  <div className="networkTextActions">
                    <button
                      onClick={() =>
                        module === "veranstaltungen"
                          ? void openAttendance(item)
                          : setThreadId(item.id)
                      }
                      title="Austausch, Termine und nächste Schritte"
                    >
                      <NetworkText id="ui.network-module-workspace.dc0d6e75b9f1a81f">
                        {module === "veranstaltungen"
                          ? "Veranstaltung ansehen"
                          : "Austausch"}
                      </NetworkText>
                    </button>
                    {module === "angebote" &&
                      access?.enabledModules.includes("communication") &&
                      item.createdByUserId !== access.currentUserId && (
                        <a
                          href={`/portal/netzwerk/${slug}/kommunikation?partner=${item.createdByUserId}`}
                        >
                          <NetworkText id="ui.network-module-workspace.f0ff0f140f77668c">
                            Vertraulich anfragen →
                          </NetworkText>
                        </a>
                      )}
                    {canEditItem(item) && (
                      <button
                        onClick={() => {
                          setEditing(item);
                          setDialog(true);
                        }}
                        title="Inhalt bearbeiten"
                      >
                        <NetworkText id="ui.network-module-workspace.84e45ee7341134db">
                          Bearbeiten
                        </NetworkText>
                      </button>
                    )}
                  </div>
                  <div className="networkIconActions">
                    {module === "dokumente" && item.data.file && (
                      <button
                        onClick={() => openDocument(item)}
                        title="Dokument öffnen"
                        aria-label={`${item.title} öffnen`}
                      >
                        ↗
                      </button>
                    )}
                    {module === "veranstaltungen" && access?.isInitiator && (
                      <button
                        onClick={() => void openAttendance(item)}
                        title="Teilnahme und Anwesenheit"
                        aria-label="Teilnahme und Anwesenheit"
                      >
                        ♙
                      </button>
                    )}
                    {canEditItem(item) &&
                      !(module === "veranstaltungen" && !access?.canManage) &&
                      item.status !== "published" &&
                      item.status !== "completed" && (
                        <button
                          onClick={() => void change(item, "published")}
                          title="Veröffentlichen"
                          aria-label="Veröffentlichen"
                        >
                          ✓
                        </button>
                      )}
                    {canEditItem(item) &&
                      item.status !== "completed" && (
                        <button
                          onClick={() => void change(item, "completed")}
                          title="Erledigen"
                          aria-label="Erledigen"
                        >
                          ○
                        </button>
                      )}
                    {canEditItem(item) &&
                      item.status !== "archived" && (
                        <button
                          onClick={() => void change(item, "archived")}
                          title="Archivieren"
                          aria-label="Archivieren"
                        >
                          ⌑
                        </button>
                      )}
                    {canEditItem(item) && (
                      <button
                        className="networkDeleteAction"
                        disabled={busy}
                        onClick={() => void remove(item)}
                        title="Endgültig löschen"
                        aria-label={`${item.title} endgültig löschen`}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="networkEmpty">
              <b>
                <NetworkText id={`ui.module.${module}.empty`}>
                  {config.empty}
                </NetworkText>
              </b>
              <p>
                <NetworkText id="ui.network-module-workspace.06cd477c660e04a4">
                  {canCreate
                    ? "Legen Sie den ersten Eintrag an oder ändern Sie den Filter."
                    : "Sobald Inhalte freigegeben wurden, erscheinen sie hier."}
                </NetworkText>
              </p>
              {canCreate && (
                <button
                  className="networkPrimary"
                  onClick={() => {
                    setEditing(null);
                    setDialog(true);
                  }}
                >
                  <NetworkText id="ui.network-module-workspace.eea4fb66e070f6b5">
                    ＋ Jetzt{" "}
                  </NetworkText>
                  {config.singular.toLowerCase()}
                  <NetworkText id="ui.network-module-workspace.5c1058aea6bf5633">
                    anlegen
                  </NetworkText>
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {canCreate && dialog && (
        <div
          className="networkModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(false);
          }}
        >
          <section
            className="networkModal networkContentModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>{config.plural.toUpperCase()}</span>
                <h2>
                  {config.singular}{" "}
                  <NetworkText id="ui.network-module-workspace.ff9f442627a75802">
                    {editing ? "bearbeiten" : "anlegen"}
                  </NetworkText>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDialog(false)}
                aria-label="Dialog schließen"
              >
                ×
              </button>
            </header>
            <form onSubmit={submit}>
              <label>
                <NetworkText id="ui.network-module-workspace.157416108139f94f">
                  {module === "veranstaltungen" ? "Thema / Titel *" : "Titel"}
                </NetworkText>
                <input
                  name="title"
                  defaultValue={editing?.title || ""}
                  required
                  minLength={2}
                />
              </label>
              <label>
                <NetworkText id="ui.network-module-workspace.a651c2d62aaaeb8d">
                  Ausführliche Beschreibung
                </NetworkText>
                <textarea
                  name="description"
                  defaultValue={editing?.description || ""}
                  required
                  rows={5}
                />
              </label>
              <div>
                <label>
                  <NetworkText id="ui.network-module-workspace.52f2a87a419c0666">
                    Kategorie
                  </NetworkText>
                  <select
                    name="category"
                    required
                    defaultValue={String(
                      editing?.data.category ||
                        (module === "veranstaltungen"
                          ? "Netzwerkveranstaltung"
                          : module === "themen" && access?.isInitiator
                            ? "Neuigkeit des Initiators"
                            : ""),
                    )}
                  >
                    <option value="" disabled>
                      Bitte passend einordnen
                    </option>
                    {config.categories
                      .filter(
                        (c) =>
                          c !== "Neuigkeit des Initiators" ||
                          access?.isInitiator,
                      )
                      .map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                  </select>
                </label>
                <label>
                  <NetworkText id="ui.network-module-workspace.661f7149b21eaae8">
                    Sichtbarkeit
                  </NetworkText>
                  <select
                    name="visibility"
                    defaultValue={editing?.visibility || "members"}
                  >
                    <option value="members">Alle Partner</option>
                    <option value="administrators">Nur Verwaltung</option>
                  </select>
                </label>
              </div>
              {module === "veranstaltungen" && (
                <div className="networkEventFields">
                  {
                    <details className="networkEventExtras">
                      <summary>
                        <NetworkText id="ui.network-module-workspace.1ebb0aafa9508acf">
                          Bild und zusätzliche Angaben (optional)
                        </NetworkText>
                      </summary>
                      <label>
                        <NetworkText id="ui.network-module-workspace.075f152a4f4a19f6">
                          Veranstalter
                        </NetworkText>
                        <input
                          name="organizer"
                          defaultValue={String(
                            editing?.data.organizer ||
                              access?.networkName ||
                              "",
                          )}
                        />
                      </label>
                      <div>
                        <label>
                          <NetworkText id="ui.network-module-workspace.45676ecca0262ea7">
                            Kosten (optional)
                          </NetworkText>
                          <input
                            name="cost"
                            placeholder="z. B. Kostenfrei oder 15 € pro Person"
                            defaultValue={String(editing?.data.cost || "")}
                          />
                        </label>
                        <label>
                          <NetworkText id="ui.network-module-workspace.a79713883a9c9bd2">
                            Terminart
                          </NetworkText>
                          <select
                            name="publicEventKind"
                            defaultValue={String(
                              editing?.data.publicEventKind || "other",
                            )}
                          >
                            <option value="other">Andere Veranstaltung</option>
                            <option value="breakfast">
                              Unternehmerfrühstück
                            </option>
                          </select>
                        </label>
                      </div>
                      <label>
                        <NetworkText id="ui.network-module-workspace.bf01d554b57d3197">
                          Teilnahmebedingungen (optional)
                        </NetworkText>
                        <input
                          name="participationTerms"
                          placeholder="z. B. Anmeldung bis zum Vortag erforderlich"
                          defaultValue={String(
                            editing?.data.participationTerms || "",
                          )}
                        />
                      </label>
                      <label>
                        <NetworkText id="ui.network-module-workspace.6fe882d37230206b">
                          Veranstaltungsbild
                        </NetworkText>
                        <input
                          type="file"
                          name="homepageImage"
                          accept="image/png,image/jpeg,image/webp"
                        />
                        <small>
                          <NetworkText id="ui.network-module-workspace.df5e5af3d9b46a9d">
                            PNG, JPEG oder WebP, maximal 1,5 MB. Verwende nur
                            Bilder, die du veröffentlichen darfst.
                          </NetworkText>
                        </small>
                      </label>
                      {editing?.data.imageUrl && (
                        <img
                          src={String(editing.data.imageUrl)}
                          alt="Aktuelles Veranstaltungsbild"
                          style={{
                            maxWidth: 240,
                            maxHeight: 140,
                            objectFit: "cover",
                            borderRadius: 12,
                          }}
                        />
                      )}
                      <label>
                        <NetworkText id="ui.network-module-workspace.6e445c4ffcc5d010">
                          Öffentlicher Anmeldelink (optional)
                        </NetworkText>
                        <input
                          name="registrationUrl"
                          type="url"
                          defaultValue={String(
                            editing?.data.registrationUrl || "",
                          )}
                          placeholder="https://…"
                        />
                      </label>
                      <label>
                        <NetworkText id="ui.network-module-workspace.4de918838dcb4538">
                          Terminstatus
                        </NetworkText>
                        <select
                          name="eventStatus"
                          defaultValue={String(
                            editing?.data.eventStatus || "scheduled",
                          )}
                        >
                          <option value="scheduled">Geplant</option>
                          <option value="rescheduled">Termin verschoben</option>
                          <option value="cancelled">Abgesagt</option>
                        </select>
                      </label>
                      <details>
                        <summary>
                          <NetworkText id="ui.network-module-workspace.2ec4c3136c5df295">
                            Weitere Orts- und Terminangaben (optional)
                          </NetworkText>
                        </summary>
                        {[
                          ["publicVenueName", "Name des Veranstaltungsorts"],
                          ["publicStreetAddress", "Straße / Hausnummer"],
                          ["publicPostalCode", "Postleitzahl"],
                          ["publicAddressLocality", "Stadt"],
                          ["publicAddressCountry", "Ländercode"],
                          [
                            "publicOnlineUrl",
                            "Öffentliche Online-Veranstaltungsseite (kein privater Einwahllink)",
                          ],
                          [
                            "publicPreviousStartDate",
                            "Ursprünglicher Beginn bei Verschiebung (mit Zeitzone)",
                          ],
                        ].map(([field, label]) => (
                          <label key={field}>
                            {label}
                            <input
                              name={field}
                              defaultValue={String(
                                editing?.data[field] ||
                                  (field === "publicAddressCountry"
                                    ? "DE"
                                    : ""),
                              )}
                            />
                          </label>
                        ))}
                      </details>
                      <input
                        type="hidden"
                        name="timezone"
                        value={String(
                          editing?.data.timezone || "Europe/Berlin",
                        )}
                      />
                    </details>
                  }
                  <div>
                    <label>
                      <NetworkText id="ui.network-module-workspace.55b16320a0a78249">
                        Datum und Uhrzeit *
                      </NetworkText>
                      <input
                        name="startsAt"
                        defaultValue={
                          editing?.startsAt
                            ? new Date(
                                new Date(editing.startsAt).getTime() -
                                  new Date(
                                    editing.startsAt,
                                  ).getTimezoneOffset() *
                                    60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label hidden style={{ display: "none" }}>
                      <NetworkText id="ui.network-module-workspace.df05e812dd4836ab">
                        Ende (automatisch aus der Dauer)
                      </NetworkText>
                      <input
                        name="endsAt"
                        type="datetime-local"
                        defaultValue={
                          editing?.endsAt
                            ? new Date(
                                Date.parse(editing.endsAt) -
                                  new Date(editing.endsAt).getTimezoneOffset() *
                                    60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      <NetworkText id="ui.network-module-workspace.e9968f886577411d">
                        Dauer in Minuten (optional)
                      </NetworkText>
                      <input
                        type="number"
                        name="durationMinutes"
                        min="1"
                        max="43200"
                        placeholder="z. B. 120"
                        defaultValue={
                          editing?.startsAt && editing?.endsAt
                            ? Math.max(
                                1,
                                Math.round(
                                  (Date.parse(editing.endsAt) -
                                    Date.parse(editing.startsAt)) /
                                    60000,
                                ),
                              )
                            : ""
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      <NetworkText id="ui.network-module-workspace.2f343666aaa88c44">
                        Format
                      </NetworkText>
                      <select
                        name="mode"
                        defaultValue={String(editing?.data.mode || "")}
                      >
                        <option>Vor Ort</option>
                        <option>Online</option>
                        <option>Hybrid</option>
                      </select>
                    </label>
                    <label>
                      <NetworkText id="ui.network-module-workspace.fd9659070e03dc6b">
                        {slug === "unternehmerfreunde"
                          ? "Adresse / Veranstaltungsort"
                          : "Adresse / Veranstaltungsort"}
                      </NetworkText>
                      <input
                        name={
                          slug === "unternehmerfreunde"
                            ? "publicLocation"
                            : "location"
                        }
                        defaultValue={String(
                          slug === "unternehmerfreunde"
                            ? editing?.data.publicLocation ||
                                editing?.data.location ||
                                ""
                            : editing?.data.location || "",
                        )}
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      <NetworkText id="ui.network-module-workspace.0770d5f989f3fd8b">
                        Rhythmus (als Hinweis)
                      </NetworkText>
                      <select
                        name="recurrence"
                        defaultValue={String(editing?.data.recurrence || "")}
                      >
                        <option>Einmalig</option>
                        <option>Wöchentlich</option>
                        <option>Monatlich</option>
                        <option>Individuell</option>
                      </select>
                    </label>
                    <label>
                      <NetworkText id="ui.network-module-workspace.6eb5410122cbde30">
                        Maximale Personenanzahl (optional)
                      </NetworkText>
                      <input
                        name="capacity"
                        defaultValue={String(editing?.data.capacity || "")}
                        type="number"
                        min="1"
                      />
                    </label>
                  </div>
                  <label>
                    <NetworkText id="ui.network-module-workspace.13a0a8b5f63a3fc0">
                      Anmeldeschluss (optional)
                    </NetworkText>
                    <input
                      name="deadline"
                      defaultValue={String(editing?.data.deadline || "")}
                      type="datetime-local"
                    />
                  </label>
                </div>
              )}
              {module === "aufgaben" && (
                <div>
                  <label>
                    <NetworkText id="ui.network-module-workspace.787e02f4cc6510e0">
                      Priorität
                    </NetworkText>
                    <select
                      name="priority"
                      defaultValue={String(editing?.data.priority || "")}
                    >
                      <option>Normal</option>
                      <option>Hoch</option>
                      <option>Dringend</option>
                    </select>
                  </label>
                  <label>
                    <NetworkText id="ui.network-module-workspace.5c008fc563aa8d86">
                      Verantwortlich
                    </NetworkText>
                    <select
                      name="assignedToUserId"
                      defaultValue={String(
                        editing?.data.assignedToUserId ||
                          access?.currentUserId ||
                          "",
                      )}
                    >
                      {people.map((p) => (
                        <option key={p.userId} value={p.userId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {module === "dokumente" && (
                <label>
                  <NetworkText id="ui.network-module-workspace.aa9888308fdbf5ad">
                    PDF oder Bild hochladen
                  </NetworkText>
                  <input
                    name="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    required={!editing}
                  />
                  <small>
                    <NetworkText id="ui.network-module-workspace.3ebcb8adaa1913e1">
                      Die Datei bleibt im geschlossenen Partnerportal und ist
                      nur für die gewählte Sichtbarkeit zugänglich. Maximal 1,5
                      MB.
                    </NetworkText>
                  </small>
                </label>
              )}
              {module === "themen" && (
                <>
                  <label className="networkEventPublishConsent">
                    <input
                      type="checkbox"
                      name="discussionOpen"
                      defaultChecked={editing?.data.discussionOpen !== false}
                    />
                    <span>
                      <NetworkText id="ui.network-module-workspace.f720f8c83e22fba0">
                        Offene Diskussion für Mitglieder erlauben
                      </NetworkText>
                    </span>
                  </label>
                  <label>
                    <NetworkText id="ui.network-module-workspace.59f27c5b19fa45f4">
                      Beitragsfoto (Pflichtfeld)
                    </NetworkText>
                    <input
                      name="articleImage"
                      required={!editing?.data.imageUrl}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                    />
                    <small>
                      <NetworkText id="ui.network-module-workspace.9f4200d1f343d1ee">
                        PNG, JPG oder WebP bis 1,5 MB. Das Foto erscheint im
                        Beitrag und auf der Netzwerk-Startseite.
                      </NetworkText>
                    </small>
                  </label>
                  {editing?.data.imageUrl && (
                    <div>
                      <img
                        className="networkArticlePhoto"
                        src={String(editing.data.imageUrl)}
                        alt="Aktuelles Beitragsfoto"
                      />
                      <small>
                        <NetworkText id="ui.network-module-workspace.93c49b81d7be8b89">
                          Das vorhandene Foto bleibt erhalten. Zum Ersetzen ein
                          neues Foto auswählen.
                        </NetworkText>
                      </small>
                    </div>
                  )}
                  <details>
                    <summary>
                      <NetworkText id="ui.network-module-workspace.585011de4477bd0e">
                        Umfrage und Schlagworte (optional)
                      </NetworkText>
                    </summary>
                    <label>
                      <NetworkText id="ui.network-module-workspace.ec9bec76b22370c9">
                        Schlagworte
                      </NetworkText>
                      <input
                        name="keywords"
                        defaultValue={String(editing?.data.keywords || "")}
                        placeholder="Kommagetrennte Schlagworte"
                      />
                    </label>
                    <label>
                      <NetworkText id="ui.network-module-workspace.f747cb3cce8a9a57">
                        Antwortoptionen bei einer Umfrage
                      </NetworkText>
                      <textarea
                        name="options"
                        defaultValue={String(editing?.data.options || "")}
                        rows={3}
                        placeholder="2 bis 10 Optionen, jeweils eine pro Zeile. Abstimmung im Austauschbereich."
                      />
                    </label>
                  </details>
                </>
              )}
              <div>
                <label>
                  <NetworkText id="ui.network-module-workspace.920e413c7d411b61">
                    Status
                  </NetworkText>
                  <select
                    name="status"
                    defaultValue={editing?.status || "published"}
                  >
                    <option value="published">Veröffentlicht</option>
                    <option value="draft">Entwurf</option>
                    <option value="active">Aktiv</option>
                  </select>
                </label>
              </div>
              {module === "veranstaltungen" &&
                slug === "unternehmerfreunde" &&
                access?.isInitiator && (
                  <label className="networkEventPublishConsent">
                    <input
                      type="checkbox"
                      name="homepagePublish"
                      defaultChecked={
                        editing?.homepageGrants?.events?.enabled === true
                      }
                    />
                    <span>
                      <span className="networkEventPublishTitle">
                        <NetworkText id="ui.network-module-workspace.e037513cd314dcb3">
                          Auf der Homepage als Veranstaltung veröffentlichen
                        </NetworkText>
                      </span>
                      <span className="networkEventPublishHelp">
                        <NetworkText id="ui.network-module-workspace.fe3dd6f5d6a20acc">
                          Mit dem Häkchen gibst du diese Veranstaltungsangaben
                          und das Bild öffentlich frei und bestätigst die
                          Veröffentlichungsrechte. Ohne Häkchen bleibt die
                          Veranstaltung nur im Portal. Zusätzliche Angaben und
                          ein Bild sind freiwillig. Zum Veröffentlichen „Alle
                          Partner“ und „Veröffentlicht“ wählen.
                        </NetworkText>
                      </span>
                    </span>
                  </label>
                )}
              {notice && (
                <p className="networkEventFormError" role="alert">
                  {notice}
                </p>
              )}
              <div className="adminNetworkDialogActions">
                <button type="button" onClick={() => setDialog(false)}>
                  <NetworkText id="ui.network-module-workspace.f7ff1178af202f6f">
                    Abbrechen
                  </NetworkText>
                </button>
                <button className="networkPrimary" disabled={busy}>
                  <NetworkText id="ui.network-module-workspace.04864665df052c9c">
                    {busy ? "Wird gespeichert …" : "Speichern"}
                  </NetworkText>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {attendanceEvent && (
        <div className="networkModalBackdrop">
          <section
            className="networkModal networkContentModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>
                  <NetworkText id="ui.network-module-workspace.3f878e7fe8a56985">
                    VERANSTALTUNG
                  </NetworkText>
                </span>
                <h2>{attendanceEvent.title}</h2>
              </div>
              <button onClick={() => setAttendanceEvent(null)}>×</button>
            </header>
            <div className="networkEventDetails">
              {(attendanceEvent.data.imageUrl ||
                attendanceEvent.data.coverImageUrl) && (
                <img
                  src={
                    attendanceEvent.data.imageUrl ||
                    attendanceEvent.data.coverImageUrl
                  }
                  alt=""
                />
              )}
              <p style={{ whiteSpace: "pre-wrap" }}>
                {attendanceEvent.description}
              </p>
              <dl>
                <dt>
                  <NetworkText id="ui.network-module-workspace.83f07dc6e90d3766">
                    Termin
                  </NetworkText>
                </dt>
                <dd>
                  {attendanceEvent.startsAt
                    ? new Date(attendanceEvent.startsAt).toLocaleString(
                        "de-DE",
                        { timeZone: "Europe/Berlin" },
                      )
                    : "Wird noch bekannt gegeben"}
                  {attendanceEvent.endsAt
                    ? ` – ${new Date(attendanceEvent.endsAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`
                    : ""}
                </dd>
                {[
                  [
                    "Ort",
                    attendanceEvent.data.publicLocation ||
                      attendanceEvent.data.location,
                  ],
                  ["Veranstalter", attendanceEvent.data.organizer],
                  ["Kosten", attendanceEvent.data.cost],
                  [
                    "Teilnahmebedingungen",
                    attendanceEvent.data.participationTerms,
                  ],
                  ["Format", attendanceEvent.data.mode],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
              {attendanceEvent.data.eventStatus === "cancelled" ? (
                <strong>
                  <NetworkText id="ui.network-module-workspace.6778e4edb7033a13">
                    Abgesagt
                  </NetworkText>
                </strong>
              ) : attendanceEvent.startsAt &&
                Date.parse(attendanceEvent.endsAt || attendanceEvent.startsAt) <
                  Date.now() ? (
                <strong>
                  <NetworkText id="ui.network-module-workspace.a44568da6421b189">
                    Bereits stattgefunden
                  </NetworkText>
                </strong>
              ) : null}
            </div>
            {!access?.readOnly &&
              attendanceEvent.data.eventStatus !== "cancelled" &&
              (!attendanceEvent.startsAt ||
                Date.parse(
                  attendanceEvent.endsAt || attendanceEvent.startsAt,
                ) >= Date.now()) && (
                <form
                  key={`${attendanceEvent.id}-${JSON.stringify(attendance)}`}
                  onSubmit={saveOwnAttendance}
                >
                  <div>
                    <label>
                      <NetworkText id="ui.network-module-workspace.e692b7de6d70e53e">
                        Meine Rückmeldung
                      </NetworkText>
                      <select
                        name="response"
                        defaultValue={
                          attendance.find(
                            (row) => row.memberUserId === access?.currentUserId,
                          )?.response || "registered"
                        }
                      >
                        <option value="registered">Ich nehme teil</option>
                        <option value="declined">Ich nehme nicht teil</option>
                      </select>
                    </label>
                    <label>
                      <NetworkText id="ui.network-module-workspace.39efe477f7f58fc4">
                        Begleitpersonen
                      </NetworkText>
                      <input
                        name="companionCount"
                        type="number"
                        min="0"
                        max="20"
                        defaultValue={
                          attendance.find(
                            (row) => row.memberUserId === access?.currentUserId,
                          )?.companionCount || 0
                        }
                      />
                    </label>
                  </div>
                  <label>
                    <NetworkText id="ui.network-module-workspace.b1bcbad0306749f2">
                      Gäste – ein Name pro Zeile
                    </NetworkText>
                    <textarea
                      name="guestNames"
                      rows={2}
                      defaultValue={
                        attendance
                          .find(
                            (row) => row.memberUserId === access?.currentUserId,
                          )
                          ?.guestNames.join("\n") || ""
                      }
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-module-workspace.4fe8281d3cdd1a92">
                      Hinweis zur Teilnahme
                    </NetworkText>
                    <textarea
                      name="note"
                      rows={2}
                      defaultValue={
                        attendance.find(
                          (row) => row.memberUserId === access?.currentUserId,
                        )?.note || ""
                      }
                    />
                  </label>
                  {!access?.readOnly && (
                    <button className="networkPrimary">
                      <NetworkText id="ui.network-module-workspace.2764eb6b6b728ae1">
                        Teilnahme bestätigen / Rückmeldung speichern
                      </NetworkText>
                    </button>
                  )}
                </form>
              )}
            {access?.isInitiator && (
              <>
                <header>
                  <div>
                    <span>
                      <NetworkText id="ui.network-module-workspace.885537a9b2344454">
                        ANWESENHEITSLISTE
                      </NetworkText>
                    </span>
                    <h3>
                      <NetworkText id="ui.network-module-workspace.8bac3dfa393054db">
                        Tatsächliche Teilnahme dokumentieren
                      </NetworkText>
                    </h3>
                  </div>
                  <div>
                    <button onClick={() => exportAttendance("pdf")}>
                      <NetworkText id="ui.network-module-workspace.1d393b0081b632c5">
                        PDF
                      </NetworkText>
                    </button>
                    <button onClick={() => exportAttendance("excel")}>
                      <NetworkText id="ui.network-module-workspace.48d53635551c8fd4">
                        Excel
                      </NetworkText>
                    </button>
                  </div>
                </header>
                <div className="networkContentRows">
                  {attendance.map((row) => (
                    <article key={row.id}>
                      <div>
                        <h3>{row.memberName}</h3>
                        <p>
                          {row.organizationName} ·{" "}
                          <NetworkText id="ui.network-module-workspace.faae58d4f46be298">
                            {row.response === "registered"
                              ? "Angemeldet"
                              : "Abgemeldet"}
                          </NetworkText>{" "}
                          · {row.companionCount}
                          <NetworkText id="ui.network-module-workspace.39efe477f7f58fc4">
                            Begleitpersonen
                          </NetworkText>
                        </p>
                        <small>
                          {row.guestNames.join(", ") || "Keine Gäste"}
                        </small>
                      </div>
                      <div className="networkRowActions">
                        <button
                          className={
                            row.attendance === "present" ? "active" : ""
                          }
                          onClick={() => void markAttendance(row, "present")}
                          title="Anwesend"
                        >
                          ✓
                        </button>
                        <button
                          className={
                            row.attendance === "absent" ? "active" : ""
                          }
                          onClick={() => void markAttendance(row, "absent")}
                          title="Abwesend"
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {threadId && (
        <NetworkThreadDialog
          contentId={threadId}
          onClose={() => setThreadId(null)}
        />
      )}
      {notice && (
        <div className="networkNotice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Meldung schließen">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
