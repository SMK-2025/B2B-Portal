import type { PortalStore } from "./portal.store";
export const OPERATOR_EMAIL = "mk@media-online-innovations.group";
export function enqueueOperatorMail(
  store: PortalStore,
  id: string,
  subject: string,
  text: string,
) {
  if (store.operatorMails.has(id)) return;
  const now = new Date().toISOString();
  store.operatorMails.set(id, {
    id,
    subject,
    text,
    createdAt: now,
    sentAt: null,
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
  });
}
