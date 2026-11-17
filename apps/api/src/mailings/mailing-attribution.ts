import type { PortalStore } from "../core/portal.store";
import { tokenHash } from "../auth/password";
import { deliveryTracks, withinMeasurementWindow } from "./mailing-measurement";
export function attributeMailingRegistration(
  store: PortalStore,
  token: unknown,
  email: string,
  networkId: string,
  userId: string,
) {
  if (typeof token !== "string" || token.length > 100) return;
  for (const campaign of store.mailingCampaigns.values()) {
    if (
      campaign.networkId !== networkId
    )
      continue;
    for (const [leadId, delivery] of Object.entries(campaign.deliveries)) {
      const lead = store.mailingLeads.get(leadId);
      if (
        delivery.token !== token ||
        !lead || !deliveryTracks(lead, delivery) || !withinMeasurementWindow(delivery) ||
        lead.email !== email.toLowerCase() ||
        store.mailingSuppressions.has(tokenHash(lead.email))
      )
        continue;
      if (delivery.registeredUserId) return;
      delivery.registeredUserId = userId;
      delivery.events.push({
        kind: "registered",
        at: new Date().toISOString(),
      });
      return;
    }
  }
}

export function attributeMailingVerification(
  store: PortalStore,
  userId: string,
) {
  for (const campaign of store.mailingCampaigns.values())
    for (const [leadId, delivery] of Object.entries(campaign.deliveries)) {
      const lead = store.mailingLeads.get(leadId);
      if (
        delivery.registeredUserId !== userId ||
        !lead || !deliveryTracks(lead, delivery) || !withinMeasurementWindow(delivery) ||
        store.mailingSuppressions.has(tokenHash(lead.email)) ||
        delivery.events.some((event) => event.kind === "verified")
      )
        continue;
      delivery.events.push({ kind: "verified", at: new Date().toISOString() });
    }
}
