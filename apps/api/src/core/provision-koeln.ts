import { randomUUID } from "node:crypto";
import type { PortalStore } from "./portal.store";
import { fullPortalModules } from "../networks/annual-membership";

const receipt = "provision-unternehmernetzwerk-koeln-2026-11-04-v1";

/** Operator-requested logo replacement, restricted to the Cologne network. */
export function replaceKoelnLogo(store: PortalStore): boolean {
  const key = 'koeln-b2b-logo-2026-11-06-v1';
  if (store.maintenanceReceipts.has(key)) return false;
  const network = [...store.networks.values()].find(n => n.slug === 'unternehmernetzwerkkoeln');
  if (!network) return false;
  network.logoUrl = '/images/b2b-matching-logo-brand.png';
  store.maintenanceReceipts.set(key, {state:'applied', completedAt:new Date().toISOString()});
  return true;
}
/** One-time operator-requested provisioning. No users, emails or invoices are created. */
export function provisionKoeln(store: PortalStore): boolean {
  if (store.maintenanceReceipts.has(receipt)) return false;
  const existing = [...store.networks.values()].find(
    (n) => n.slug === "unternehmernetzwerkkoeln",
  );
  if (existing) {
    store.maintenanceReceipts.set(receipt, {
      state: "applied",
      completedAt: new Date().toISOString(),
    });
    return true;
  }
  const owner = [...store.users.values()].find(
    (u) => u.accountRole === "platform_admin",
  );
  if (
    !owner ||
    ![...store.networks.values()].some(
      (n) => n.slug === "unternehmernetzwerkleverkusen",
    )
  )
    return false;
  const now = new Date().toISOString(),
    id = randomUUID();
  store.networks.set(id, {
    id,
    slug: "unternehmernetzwerkkoeln",
    name: "Unternehmernetzwerk Köln",
    legalName: null,
    websiteUrl: "https://b2b-matching.de/Koeln",
    logoUrl: "/images/b2b-matching-logo-brand.png",
    primaryColor: "#c8102e",
    secondaryColor: "#171717",
    status: "active",
    trialEndsAt: null,
    enabledModules: fullPortalModules(),
    settings: {
      closedNetwork: true,
      selfRegistration: false,
      crossNetworkMatching: false,
      admissionRules:
        "Für Unternehmen mit Sitz in Köln. Teilnahmeanfragen werden vor dem Zugang zum geschützten Netzwerk geprüft.",
      welcomeTitle: "Eine Stadt voller Unternehmen. Und du bist mittendrin!",
      welcomeIntro:
        "Das Unternehmernetzwerk Köln ist dein Online-Treffpunkt für geschäftliche Kontakte vor Ort. Stelle dein Unternehmen vor, entdecke passende Leistungen und finde Menschen für dein nächstes Vorhaben – über Veedels- und Branchengrenzen hinweg.",
      bannerTitle: "Köln vernetzt. Dein Unternehmen mittendrin.",
      bannerDescription:
        "Lerne die Menschen hinter Kölner Unternehmen kennen und komm direkt ins Gespräch.",
      bannerImageUrl: "/images/koeln-network-blue-hour.webp",
      setupCompletedAt: now,
      billingMode: "standard",
      memberPaymentModel: "individual",
      memberMonthlyNetCents: 2900,
      memberBilling: {
        months: 12,
        freeUntil: null,
        paidFrom: null,
        paidThrough: null,
        autoRenew: false,
        renewalMonths: 12,
        automaticInvoices: true,
        version: receipt,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  store.networkBySlug.set("unternehmernetzwerkkoeln", id);
  const contentId = randomUUID();
  store.networkContents.set(contentId, {
    id: contentId,
    networkId: id,
    type: "topic",
    title: "Köln hat die Unternehmen. Hier lernen sie sich kennen.",
    description:
      "Willkommen im Unternehmernetzwerk Köln! Ob Handwerk in Ehrenfeld, Dienstleistung in Mülheim oder Handel in der Innenstadt: Oft ist die passende Unterstützung näher, als man denkt.\n\nHier kannst du dein Unternehmen vorstellen, Leistungen und Angebote entdecken, nach Unterstützung suchen und direkt im PartnerChat ins Gespräch kommen. Vernetzungsanfragen, Veranstaltungen und digitale Visitenkarten helfen dir, aus einem ersten Kontakt eine persönliche Verbindung zu machen.\n\nStell dich und dein Unternehmen vor: Was bietet ihr an – und wen möchtet ihr in Köln kennenlernen? Dieses unabhängige Netzwerk wird von der Media Online Innovations Group betrieben. Es ist kein Angebot der Stadt Köln oder eines Vereins.",
    status: "published",
    createdByUserId: owner.id,
    assignedToUserId: null,
    startsAt: null,
    endsAt: null,
    visibility: "members",
    data: {
      category: "Neuigkeit des Initiators",
      imageUrl: "/images/koeln-network-blue-hour.webp",
      pinned: true,
      discussionOpen: true,
    },
    createdAt: now,
    updatedAt: now,
  });
  store.maintenanceReceipts.set(receipt, {
    state: "applied",
    completedAt: now,
  });
  return true;
}
