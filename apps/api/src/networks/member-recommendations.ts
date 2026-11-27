import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NetworkContentRecord } from "../core/domain";
import { PortalStore } from "../core/portal.store";
import { pulsePeople } from "./network-pulse";

export type Recommendation = {
  id: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  company: string;
  contact: string;
  email: string;
  phone: string;
  description: string;
  milestones: Partial<
    Record<
      | "read"
      | "accepted"
      | "thanked"
      | "answered"
      | "contact"
      | "declined"
      | "deal",
      string
    >
  >;
  history: { action: string; at: string; actorId: string; comment: string }[];
  amountNet?: number;
  publishRevenue?: boolean;
};
export const recommendations = (
  record: NetworkContentRecord,
): Recommendation[] =>
  Array.isArray(record.data.recommendations)
    ? (record.data.recommendations as Recommendation[])
    : [];
function people(
  store: PortalStore,
  record: NetworkContentRecord,
  actorId: string,
) {
  const members = pulsePeople(store, record);
  if (
    record.type !== "conversation" ||
    record.data.directChat !== true ||
    members.length !== 2 ||
    members.some((p) => !p.active) ||
    !members.some((p) => p.userId === actorId)
  )
    throw new ForbiddenException(
      "Empfehlungen sind nur zwischen den beiden aktiven Gesprächsteilnehmern möglich.",
    );
  if (["draft", "archived"].includes(record.status))
    throw new BadRequestException("Dieses Gespräch ist nicht geöffnet.");
  return members;
}
function text(
  input: Record<string, unknown>,
  key: string,
  max: number,
  required = true,
) {
  const value =
    typeof input[key] === "string" ? (input[key] as string).trim() : "";
  if ((required && !value) || value.length > max)
    throw new BadRequestException(
      `Bitte ${({ company: "Unternehmen", contact: "Ansprechpartner", email: "E-Mail-Adresse", phone: "Rufnummer", description: "Beschreibung", comment: "Rückmeldung" } as Record<string, string>)[key] || key} gültig ausfüllen (maximal ${max} Zeichen).`,
    );
  return value;
}
export function createRecommendation(
  store: PortalStore,
  record: NetworkContentRecord,
  actorId: string,
  input: Record<string, unknown>,
) {
  const members = people(store, record, actorId),
    list = recommendations(record);
  if (list.length >= 500)
    throw new BadRequestException(
      "Bitte ein neues Gespräch für weitere Empfehlungen beginnen.",
    );
  const company = text(input, "company", 200),
    contact = text(input, "contact", 200),
    email = text(input, "email", 254),
    phone = text(input, "phone", 80),
    description = text(input, "description", 2000);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/[0-9]{3}/.test(phone.replace(/\D/g, ""))
  )
    throw new BadRequestException(
      "Bitte eine gültige E-Mail-Adresse und Rufnummer eingeben.",
    );
  if (input.sharingConfirmed !== true)
    throw new BadRequestException(
      "Bitte bestätigen, dass die Kontaktdaten weitergegeben werden dürfen.",
    );
  const now = new Date().toISOString(),
    recipientId = members.find((p) => p.userId !== actorId)!.userId;
  const entry: Recommendation = {
    id: randomUUID(),
    senderId: actorId,
    recipientId,
    company,
    contact,
    email,
    phone,
    description,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    milestones: {},
    history: [{ action: "sent", at: now, actorId, comment: "" }],
  };
  const messages = Array.isArray(record.data.messages)
    ? record.data.messages
    : [];
  if (messages.length >= 1000)
    throw new BadRequestException("Bitte ein neues Gespräch beginnen.");
  record.data.recommendations = [...list, entry];
  record.data.messages = [
    ...messages,
    {
      id: randomUUID(),
      recommendationId: entry.id,
      userId: actorId,
      author: members.find((p) => p.userId === actorId)!.name,
      body: "Empfehlung ausgesprochen",
      kind: "recommendation",
      createdAt: now,
    },
  ];
  record.updatedAt = now;
  return entry;
}
export function respondRecommendation(
  store: PortalStore,
  record: NetworkContentRecord,
  actorId: string,
  id: string,
  input: Record<string, unknown>,
) {
  people(store, record, actorId);
  const entry = recommendations(record).find((r) => r.id === id);
  if (!entry || entry.recipientId !== actorId)
    throw new ForbiddenException(
      "Nur der Empfänger kann die Empfehlung beantworten.",
    );
  if (input.revision !== entry.revision)
    throw new ConflictException(
      "Die Empfehlung wurde inzwischen aktualisiert. Bitte neu laden.",
    );
  const action = String(input.action);
  if (
    ![
      "read",
      "accepted",
      "thanked",
      "answered",
      "contact",
      "declined",
      "deal",
    ].includes(action)
  )
    throw new BadRequestException("Unbekannte Rückmeldung.");
  if (entry.milestones[action as keyof typeof entry.milestones]) return entry;
  if (action !== "read" && !entry.milestones.read)
    throw new BadRequestException("Bitte die Empfehlung zuerst öffnen.");
  if (entry.milestones.declined && action !== "read")
    throw new BadRequestException("Diese Empfehlung wurde bereits abgelehnt.");
  if (
    action === "declined" &&
    (entry.milestones.contact || entry.milestones.deal)
  )
    throw new BadRequestException(
      "Ein entstandener Kontakt kann nicht als abgelehnte Empfehlung markiert werden.",
    );
  const comment = text(input, "comment", 2000, false);
  if (["contact", "deal", "declined", "answered"].includes(action) && !comment)
    throw new BadRequestException("Bitte eine kurze Rückmeldung ergänzen.");
  if (action === "deal") {
    if (!entry.milestones.contact)
      throw new BadRequestException(
        "Bitte zuerst den entstandenen Kontakt bestätigen.",
      );
    const amount = input.amountNet;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 1e12 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.001
    )
      throw new BadRequestException(
        "Bitte einen gültigen Netto-Umsatz mit maximal zwei Nachkommastellen eingeben.",
      );
    entry.amountNet = amount;
    entry.publishRevenue = input.publishRevenue === true;
  }
  const now = new Date().toISOString();
  entry.milestones[action as keyof typeof entry.milestones] = now;
  entry.history.push({ action, at: now, actorId, comment });
  entry.revision++;
  entry.updatedAt = now;
  record.updatedAt = now;
  return entry;
}
export function recommendationRows(store: PortalStore, networkId: string) {
  return [...store.networkContents.values()]
    .filter((r) => r.networkId === networkId && r.type === "conversation")
    .flatMap((record) =>
      recommendations(record).map((entry) => ({
        ...entry,
        threadId: record.id,
        people: pulsePeople(store, record).map(({ userId, name, company }) => ({
          userId,
          name,
          company,
        })),
      })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function recommendationPulse(
  store: PortalStore,
  networkId: string,
  days: number,
) {
  const cutoff = Date.now() - days * 86400000;
  return recommendationRows(store, networkId)
    .filter(
      (r) =>
        Date.parse(r.createdAt) >= cutoff &&
        pulsePeople(store, store.networkContents.get(r.threadId)!).every(
          (p) => p.active,
        ),
    )
    .map((r) => ({
      id: `recommendation:${r.id}`,
      stage: "recommendation",
      text: "Eine Empfehlung wurde ausgesprochen.",
      at: r.createdAt,
      partners: r.people.map(({ name, company }) => ({
        name,
        company,
        logoUrl: null,
      })),
    }));
}
