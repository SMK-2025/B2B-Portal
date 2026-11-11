import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import type { NetworkContentRecord } from "../core/domain";
import { PortalStore } from "../core/portal.store";
import { randomUUID } from "node:crypto";

export function reciprocalChat(record: NetworkContentRecord) {
  const ids = new Set([
    record.createdByUserId,
    ...(Array.isArray(record.data.participantUserIds)
      ? record.data.participantUserIds.map(String)
      : []),
  ]);
  const authors = new Set(
    (Array.isArray(record.data.messages) ? record.data.messages : [])
      .filter((m: any) => m.kind === "message" && ids.has(m.userId))
      .map((m: any) => m.userId),
  );
  return (
    record.data.directChat === true && ids.size === 2 && authors.size === 2
  );
}
function statusNote(record: NetworkContentRecord, body: string, stage: string) {
  const labels: Record<string, string> = {
    chat: "Im Gespräch",
    offer: "Angebot",
    negotiation: "Verhandlungen",
    accepted: "Kooperation vereinbart",
    declined: "Angebot abgelehnt",
  };
  const notes = Array.isArray(record.data.pulseNotes)
    ? record.data.pulseNotes
    : [];
  record.data.pulseNotes = [
    ...notes,
    {
      id: randomUUID(),
      body: `${labels[stage] || stage}\n${body}`,
      stage,
      createdAt: new Date().toISOString(),
    },
  ].slice(-200);
}
export function activatePulseOnReply(
  store: PortalStore,
  record: NetworkContentRecord,
) {
  if (
    !reciprocalChat(record) ||
    pulsePeople(store, record).some((p) => !p.active)
  )
    return;
  const previous = pulseState(record);
  if (previous?.startedAt) return;
  const now = new Date().toISOString();
  record.data.networkPulse = {
    enabled: true,
    hiddenBy: [],
    revision: 0,
    stage: "chat",
    comment: "",
    publicText: "",
    approvals: [],
    history: [],
    ...previous,
    startedAt: now,
    updatedAt: now,
  };
  statusNote(
    record,
    "Im Gespräch – ihr habt beide im Chat geantwortet.",
    "chat",
  );
}

export type PulseStage =
  "chat" | "offer" | "negotiation" | "accepted" | "declined";
export type PulseState = {
  enabled: boolean;
  hiddenBy: string[];
  revision: number;
  stage: PulseStage;
  comment: string;
  publicText: string;
  approvals: string[];
  updatedAt: string;
  amountNet?: number;
  publishAmount?: boolean;
  startedAt?: string;
  history: {
    stage: PulseStage;
    comment: string;
    actorId: string;
    at: string;
  }[];
};
export function pulseState(
  record: NetworkContentRecord,
): PulseState | undefined {
  return record.data.networkPulse as PulseState | undefined;
}
export function pulsePeople(store: PortalStore, record: NetworkContentRecord) {
  const ids = [
    ...new Set([
      record.createdByUserId,
      ...(Array.isArray(record.data.participantUserIds)
        ? record.data.participantUserIds.map(String)
        : []),
    ]),
  ];
  return ids.map((userId) => {
    const member = store.networkMemberships.find(
      (m) =>
        m.networkId === record.networkId &&
        m.userId === userId &&
        m.status === "active",
    );
    const user = store.users.get(userId);
    const org = member && store.organizations.get(member.organizationId);
    return {
      userId,
      active: Boolean(member),
      name: user ? `${user.firstName} ${user.lastName}` : "",
      company: org?.displayName || "",
      logoUrl: org?.networkProfile?.logoUrl || null,
      membershipId: member?.id,
    };
  });
}
export function updatePulse(
  store: PortalStore,
  record: NetworkContentRecord,
  actorId: string,
  input: Record<string, unknown>,
) {
  const people = pulsePeople(store, record),
    ids = people.map((p) => p.userId);
  if (
    record.type !== "conversation" ||
    record.data.directChat !== true ||
    ids.length !== 2 ||
    !ids.includes(actorId) ||
    people.some((p) => !p.active)
  )
    throw new ForbiddenException(
      "Nur die beiden aktiven Gesprächspartner können den Status ändern.",
    );
  const previous = pulseState(record);
  if (Number(input.revision) !== (previous?.revision || 0))
    throw new ConflictException(
      "Der Status wurde inzwischen geändert. Bitte erneut öffnen.",
    );
  const now = new Date().toISOString();
  const state: PulseState = previous
    ? structuredClone(previous)
    : {
        enabled: true,
        hiddenBy: [],
        revision: 0,
        stage: "chat",
        comment: "",
        publicText: "",
        approvals: [],
        updatedAt: now,
        history: [],
      };
  if (input.action === "visibility") {
    state.hiddenBy =
      input.visible === true
        ? state.hiddenBy.filter((id) => id !== actorId)
        : [...new Set([...state.hiddenBy, actorId])];
  } else if (input.action === "confirm") {
    if (!state.publicText || state.stage === "declined")
      throw new BadRequestException(
        "Kein Veröffentlichungsvorschlag vorhanden.",
      );
    state.approvals = [...new Set([...state.approvals, actorId])];
  } else if (input.action === "status") {
    if (!reciprocalChat(record))
      throw new BadRequestException(
        "Der Status kann nach der ersten Antwort des Gesprächspartners geändert werden.",
      );
    const stage = String(input.stage) as PulseStage;
    if (
      !["chat", "offer", "negotiation", "accepted", "declined"].includes(stage)
    )
      throw new BadRequestException("Bitte einen gültigen Status wählen.");
    const comment = String(input.comment || "").trim(),
      publicText = String(input.publicText || "").trim();
    if (!comment || comment.length > 2000 || publicText.length > 1000)
      throw new BadRequestException(
        "Bitte einen Kommentar eingeben (maximal 2.000 Zeichen).",
      );
    if (stage === "accepted" && input.publish !== false && !publicText)
      throw new BadRequestException(
        "Bitte eine kurze gemeinsame Beschreibung für die Kooperation eingeben.",
      );
    if (
      input.amountNet !== undefined &&
      (typeof input.amountNet !== "number" ||
        !Number.isFinite(input.amountNet) ||
        input.amountNet < 0 ||
        input.amountNet > 1e12)
    )
      throw new BadRequestException("Ungültiger Auftragswert.");
    state.amountNet =
      input.amountNet === undefined
        ? state.amountNet
        : (input.amountNet as number);
    state.stage = stage;
    state.publishAmount = stage === 'accepted' && input.publish === true && input.publishAmount === true && input.amountNet !== undefined;
    state.comment = comment;
    state.publicText =
      stage === "declined" || input.publish === false ? "" : publicText;
    state.approvals = state.publicText ? [actorId] : [];
    state.history.push({ stage, comment, actorId, at: now });
    state.history = state.history.slice(-100);
    statusNote(
      record,
      `${comment}\n${state.publicText ? "Veröffentlichung vorgeschlagen – Bestätigung des Gesprächspartners erforderlich." : "Nicht veröffentlicht. Nur für euch beide sichtbar."}`,
      stage,
    );
  } else throw new BadRequestException("Unbekannte Statusaktion.");
  state.revision++;
  state.updatedAt = now;
  if (input.action === "confirm")
    statusNote(record, "Veröffentlichung gemeinsam bestätigt.", state.stage);
  if (input.action === "visibility")
    statusNote(
      record,
      input.visible === true
        ? "Netzwerk-Anzeige wieder freigegeben."
        : "Netzwerk-Anzeige ausgeblendet.",
      state.stage,
    );
  record.data.networkPulse = state;
  record.updatedAt = now;
  syncCooperation(store, record);
  return state;
}
function syncCooperation(store: PortalStore, record: NetworkContentRecord) {
  const state = pulseState(record)!,
    people = pulsePeople(store, record);
  const id = `cooperation:${record.id}`;
  const publish =
    state.enabled &&
    !state.hiddenBy.length &&
    state.stage === "accepted" &&
    people.every((p) => p.active && state.approvals.includes(p.userId));
  if (!publish) {
    store.networkContents.delete(id);
    return;
  }
  const existing = store.networkContents.get(id);
  const network = store.networks.get(record.networkId);
  store.networkContents.set(id, {
    id,
    networkId: record.networkId,
    type: "topic",
    title: "Kooperation vereinbart",
    description: `${people.map((p) => p.company || p.name).join(" × ")}\n\n${state.publicText}`,
    status: "published",
    visibility: "members",
    createdByUserId: record.createdByUserId,
    assignedToUserId: null,
    startsAt: null,
    endsAt: null,
    createdAt: existing?.createdAt || state.updatedAt,
    updatedAt: state.updatedAt,
    data: {
      kind: "network_cooperation",
      cooperationLogo: Boolean(people.find((p) => p.logoUrl)),
      cooperationThreadId: record.id,
      discussionOpen: false,
      imageUrl:
        people.find((p) => p.logoUrl)?.logoUrl ||
        network?.settings.bannerImageUrl ||
        "/images/network-meeting-club.webp",
      cooperationPartners: people.map(
        ({ name, company, logoUrl, membershipId }) => ({
          name,
          company,
          logoUrl,
          membershipId,
        }),
      ),
    },
  });
}
export function visibleCooperation(
  store: PortalStore,
  record: NetworkContentRecord,
) {
  if (record.data.kind !== "network_cooperation") return true;
  const chat = store.networkContents.get(
    String(record.data.cooperationThreadId),
  );
  if (
    !chat ||
    chat.networkId !== record.networkId ||
    chat.type !== "conversation" ||
    ["draft", "archived"].includes(chat.status)
  )
    return false;
  const state = pulseState(chat),
    people = pulsePeople(store, chat);
  return Boolean(
    state?.enabled &&
    !state.hiddenBy.length &&
    state.stage === "accepted" &&
    people.length === 2 &&
    people.every((p) => p.active && state.approvals.includes(p.userId)),
  );
}
export function networkPulse(
  store: PortalStore,
  networkId: string,
  days: number,
) {
  const cutoff = Date.now() - days * 86400000;
  return [...store.networkContents.values()]
    .filter(
      (r) =>
        r.networkId === networkId &&
        r.type === "conversation" &&
        r.status !== "archived" &&
        r.status !== "draft",
    )
    .flatMap((r) => {
      const s = pulseState(r),
        people = pulsePeople(store, r);
      if (
        !s?.enabled ||
        s.hiddenBy.length ||
        people.length !== 2 ||
        people.some((p) => !p.active) ||
        !Array.isArray(r.data.messages) ||
        !reciprocalChat(r) ||
        Date.parse(s.updatedAt) < cutoff
      )
        return [];
      const approved =
        s.publicText &&
        s.stage !== "declined" &&
        people.every((p) => s.approvals.includes(p.userId));
      return [
        {
          id: `pulse:${r.id}`,
          stage: approved ? s.stage : "chat",
          text: approved ? s.publicText : "",
          ...(approved && s.stage === 'accepted' && s.publishAmount && s.amountNet !== undefined ? {amountNet:s.amountNet} : {}),
          at: s.updatedAt,
          partners: people.map(({ name, company, logoUrl, membershipId }) => ({
            name,
            company,
            logoUrl,
            membershipId,
          })),
        },
      ];
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
