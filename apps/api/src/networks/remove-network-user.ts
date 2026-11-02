import { BadRequestException } from "@nestjs/common";
import type { PortalStore } from "../core/portal.store";
export function removeNetworkUser(
  s: PortalStore,
  n: string,
  u: string,
  email: string,
) {
  const members = s.networkMemberships.filter(
    (m) => m.networkId === n && m.userId === u,
  );
  const mids = new Set(members.map((m) => m.id)),
    orgs = new Set(members.map((m) => m.organizationId));
  const orders = [...s.networkOrders.values()].filter(
    (o) => o.networkId === n && o.orderedByUserId === u,
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (
    orders.some(
      (o) =>
        o.kind !== "member_annual" ||
        o.invoiceSentAt ||
        o.invoiceReference ||
        o.paidAt ||
        o.paymentStatus === "paid" ||
        (o.billingPolicy?.automaticInvoices &&
          o.billingPolicy.invoiceDate <= today),
    )
  )
    throw new BadRequestException(
      "Es bestehen Rechnungs- oder fällige Buchungsdaten. Die vollständige Löschung ist gesperrt. Der Zugang kann stattdessen gesperrt werden.",
    );
  for (const o of orders) {
    s.networkOrders.delete(o.id);
    s.operatorMails.delete("annual-booking:" + o.id);
  }
  s.operatorMails.delete(`central-registration:${n}:${u}`);
  function prune<T>(items: T[], test: (v: T) => boolean) {
    for (let i = items.length - 1; i >= 0; i--)
      if (test(items[i])) items.splice(i, 1);
  }
  const removedContent = new Set<string>();
  for (const [id, c] of s.networkContents) {
    if (c.networkId !== n) continue;
    if (
      c.createdByUserId === u ||
      (c.data.kind === "network_invitation" &&
        String(c.data.email).toLowerCase() === email)
    ) {
      s.networkContents.delete(id);
      removedContent.add(id);
      s.operatorMails.delete("invitation:" + id);
      s.operatorMails.delete("participation:" + id);
      continue;
    }
    if (c.assignedToUserId === u) c.assignedToUserId = null;
    for (const key of [
      "participantUserIds",
      "readBy",
      "messages",
      "comments",
      "meetings",
    ]) {
      const rows = c.data[key];
      if (Array.isArray(rows))
        c.data[key] = rows.filter(
          (x) => x !== u && x?.userId !== u && x?.createdByUserId !== u,
        );
    }
  }
  for (const [id, a] of s.networkAttendances)
    if (a.networkId === n && (a.userId === u || removedContent.has(a.eventId)))
      s.networkAttendances.delete(id);
  for (const [id, c] of s.networkConnections)
    if (c.networkId === n && (c.senderId === u || c.recipientId === u))
      s.networkConnections.delete(id);
  for (const [id, r] of s.networkRevenues)
    if (
      r.networkId === n &&
      (mids.has(r.referringMembershipId) || mids.has(r.beneficiaryMembershipId))
    )
      s.networkRevenues.delete(id);
  prune(s.networkMemberships, (m) => mids.has(m.id));
  for (const org of orgs) {
    if (
      !s.networkMemberships.some(
        (m) => m.userId === u && m.organizationId === org,
      )
    )
      prune(s.memberships, (m) => m.userId === u && m.organizationId === org);
    if (
      s.networkMemberships.some((m) => m.organizationId === org) ||
      s.memberships.some((m) => m.organizationId === org)
    )
      continue;
    for (const [id, i] of s.teamInvitations)
      if (i.organizationId === org) s.teamInvitations.delete(id);
    const needs = new Set(
      [...s.needs.values()]
        .filter((x) => x.organizationId === org)
        .map((x) => x.id),
    );
    const pages = new Set(
      [...s.servicePages.values()]
        .filter((x) => x.organizationId === org)
        .map((x) => x.id),
    );
    const matches = new Set(
      [...s.matches.values()]
        .filter(
          (x) =>
            x.buyerOrganizationId === org ||
            x.providerOrganizationId === org ||
            needs.has(x.needId) ||
            pages.has(x.servicePageId),
        )
        .map((x) => x.id),
    );
    for (const [id, c] of s.conversations)
      if (matches.has(c.matchId)) {
        prune(s.messages, (x) => x.conversationId === id);
        s.conversations.delete(id);
      }
    for (const [id, m] of s.meetings)
      if (matches.has(m.matchId)) s.meetings.delete(id);
    for (const [id, f] of s.favorites)
      if (matches.has(f.matchId) || f.providerOrganizationId === org)
        s.favorites.delete(id);
    for (const id of matches) s.matches.delete(id);
    for (const id of pages) s.servicePages.delete(id);
    for (const id of needs) s.needs.delete(id);
    prune(s.reviewDecisions, (x) => x.organizationId === org);
    prune(
      s.activities,
      (x) => x.organizationId === org || matches.has(x.matchId || ""),
    );
    s.organizations.delete(org);
  }
  const keep =
    s.networkMemberships.some((m) => m.userId === u) ||
    s.memberships.some((m) => m.userId === u) ||
    [...s.networkContents.values()].some(
      (c) =>
        c.networkId !== n &&
        c.data.kind === "network_invitation" &&
        String(c.data.email).toLowerCase() === email,
    );
  prune(
    s.notifications,
    (x) => x.userId === u && (!keep || x.data.networkId === n),
  );
  prune(
    s.activities,
    (x) => x.actorUserId === u && (!keep || x.data.networkId === n),
  );
  if (!keep) {
    for (const map of [
      s.sessions,
      s.passwordResetTokens,
      s.verificationTokens,
      s.favorites,
      s.userPreferences,
    ])
      for (const [id, r] of map) if (r.userId === u) map.delete(id);
    s.operatorMails.delete("registration:" + u);
    for (const [id, i] of s.teamInvitations)
      if (i.email.toLowerCase() === email) s.teamInvitations.delete(id);
    s.userByEmail.delete(email);
    s.users.delete(u);
  }
  return { removed: true, accountDeleted: !keep };
}
