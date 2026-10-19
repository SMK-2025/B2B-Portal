import type { PortalStore } from "./portal.store";
import { enqueueOperatorMail, OPERATOR_EMAIL } from "./operator-mail";
export const RETIRE_INITIATOR_JOB = "retire-legacy-initiator-2026-10-19";
export const RESET_TEST_MEMBER_JOB = "reset-test-member-2026-10-19-hey-five-second";
export function resetTestMember(store: PortalStore) {
  return retireLegacyInitiator(store, {
    email: "mk@hey-five.de",
    job: RESET_TEST_MEMBER_JOB,
    testMember: true,
  });
}
export function retireLegacyInitiator(
  store: PortalStore,
  options = {
    email: "service@b2b-matching.de",
    job: RETIRE_INITIATOR_JOB,
    testMember: false,
  },
) {
  const receipt = store.maintenanceReceipts.get(options.job);
  if (receipt && receipt.state !== "blocked") return receipt;
  const targetEmail = options.email,
    targets = [...store.users.values()].filter(
      (u) => u.email.toLowerCase() === targetEmail,
    ),
    owner = [...store.users.values()].find(
      (u) =>
        u.email.toLowerCase() === OPERATOR_EMAIL &&
        u.accountRole === "platform_admin",
    ),
    target = targets[0],
    now = new Date().toISOString();
  const finish = (state: "removed" | "absent" | "blocked") => {
    const result = { state, completedAt: now };
    store.maintenanceReceipts.set(options.job, result);
    if (state !== "blocked")
      enqueueOperatorMail(
        store,
        options.job,
        options.testMember
          ? "Testzugang und Einladung zurückgesetzt"
          : "Initiator-Benutzerkonto bereinigt",
        options.testMember
          ? `Der Testzugang für ${targetEmail} und seine Einladungen wurden zurückgesetzt. Eine neue Einladung und Registrierung sind möglich. Betreiberkonto, Netzwerk und andere Nutzer bleiben erhalten.`
          : `Die einmalige Bereinigung des nicht mehr benötigten Initiator-Benutzerkontos ist abgeschlossen (${state === "removed" ? "Konto gelöscht" : "Konto bereits nicht mehr vorhanden"}). Betreiberkonto, Partnernetzwerke und andere Nutzer bleiben unverändert. Betreiberinformationen gehen an Ihre Betreiber-Adresse.`,
      );
    return result;
  };
  const removeInvitations = () => {
    for (const [key, value] of store.networkContents)
      if (
        value.data.kind === "network_invitation" &&
        String(value.data.email).toLowerCase() === targetEmail
      ) {
        store.networkContents.delete(key);
        store.operatorMails.delete(`invitation:${key}`);
      }
    for (const [key, value] of store.teamInvitations)
      if (value.email.toLowerCase() === targetEmail)
        store.teamInvitations.delete(key);
  };
  if (!targets.length) {
    removeInvitations();
    return finish("absent");
  }
  if (
    targets.length !== 1 ||
    !owner ||
    target.id === owner.id ||
    target.accountRole !== "user" ||
    [...store.networkOrders.values()].some(
      (o) =>
        o.orderedByUserId === target.id &&
        (!options.testMember ||
          o.kind !== "member_annual" ||
          o.paymentStatus !== "open" ||
          Boolean(o.invoiceSentAt || o.invoiceReference || o.paidAt)),
    ) ||
    store.networkMemberships.some(
      (m) =>
        m.userId === target.id &&
        !options.testMember &&
        m.role !== "network_admin",
    )
  )
    return finish("blocked");
  removeInvitations();
  if (options.testMember)
    for (const [key, order] of store.networkOrders)
      if (order.orderedByUserId === target.id) {
        store.networkOrders.delete(key);
        store.operatorMails.delete(`annual-booking:${key}`);
      }
  store.operatorMails.delete(`registration:${target.id}`);
  const id = target.id,
    organizationIds = new Set(
      store.memberships
        .filter((m) => m.userId === id)
        .map((m) => m.organizationId),
    );
  for (const [key, value] of store.sessions)
    if (value.userId === id) store.sessions.delete(key);
  for (const [key, value] of store.verificationTokens)
    if (value.userId === id) store.verificationTokens.delete(key);
  for (const [key, value] of store.passwordResetTokens)
    if (value.userId === id) store.passwordResetTokens.delete(key);
  for (const [key, value] of store.teamInvitations)
    if (value.email.toLowerCase() === targetEmail)
      store.teamInvitations.delete(key);
  for (const [key, value] of store.favorites)
    if (value.userId === id) store.favorites.delete(key);
  store.userPreferences.delete(id);
  for (const invitation of store.teamInvitations.values())
    if (invitation.invitedByUserId === id)
      invitation.invitedByUserId = "deleted-account";
  for (const [key, attendance] of store.networkAttendances) {
    if (attendance.userId === id) store.networkAttendances.delete(key);
    else if (attendance.updatedByUserId === id)
      attendance.updatedByUserId = "deleted-account";
  }
  for (const decision of store.reviewDecisions)
    if (decision.reviewerId === id) decision.reviewerId = "deleted-account";
  store.memberships.splice(
    0,
    store.memberships.length,
    ...store.memberships.filter((m) => m.userId !== id),
  );
  store.networkMemberships.splice(
    0,
    store.networkMemberships.length,
    ...store.networkMemberships.filter((m) => m.userId !== id),
  );
  for (const [key, value] of store.networkContents) {
    if (
      value.data.kind === "network_invitation" &&
      value.data.email === targetEmail
    ) {
      store.networkContents.delete(key);
      continue;
    }
    if (value.createdByUserId === id) value.createdByUserId = "deleted-account";
    if (value.assignedToUserId === id) value.assignedToUserId = null;
    for (const field of ["participantUserIds", "readBy"])
      if (Array.isArray(value.data[field]))
        value.data[field] = (value.data[field] as unknown[]).filter(
          (v) => v !== id,
        );
    for (const field of ["messages", "comments", "meetings"])
      if (Array.isArray(value.data[field]))
        value.data[field] = (
          value.data[field] as Array<Record<string, unknown>>
        ).filter((v) => v.userId !== id && v.createdByUserId !== id);
  }
  for (const message of store.networkSystemMessages.values())
    if (message.createdByUserId === id)
      message.createdByUserId = "deleted-account";
  store.messages.splice(
    0,
    store.messages.length,
    ...store.messages.filter((m) => m.senderUserId !== id),
  );
  for (const [key, value] of store.meetings)
    if (value.createdByUserId === id) store.meetings.delete(key);
  store.notifications.splice(
    0,
    store.notifications.length,
    ...store.notifications.filter((n) => n.userId !== id),
  );
  for (const activity of store.activities)
    if (activity.actorUserId === id) activity.actorUserId = null;
  for (const invitation of store.networkMemberships) {
    if (invitation.invitedByUserId === id) invitation.invitedByUserId = null;
    if (invitation.reviewedByUserId === id) invitation.reviewedByUserId = null;
  }
  for (const organizationId of organizationIds) {
    const organization = store.organizations.get(organizationId);
    if (!organization) continue;
    if (organization.networkProfile?.contactEmail === targetEmail) {
      organization.networkProfile.contactEmail = "";
      organization.networkProfile.contactName = "";
    }
    if (
      organization.role === "network" &&
      !store.memberships.some((m) => m.organizationId === organizationId) &&
      !store.networkMemberships.some(
        (m) => m.organizationId === organizationId,
      ) &&
      ![...store.servicePages.values()].some(
        (p) => p.organizationId === organizationId,
      ) &&
      ![...store.needs.values()].some(
        (n) => n.organizationId === organizationId,
      )
    )
      store.organizations.delete(organizationId);
  }
  store.users.delete(id);
  for (const [email, userId] of store.userByEmail)
    if (userId === id) store.userByEmail.delete(email);
  return finish("removed");
}
