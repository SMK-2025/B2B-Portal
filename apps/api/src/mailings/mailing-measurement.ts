import type { MailingDelivery, MailingLead } from "./mailing.types";

// New deliveries use their immutable instrumentation snapshot, not legacy
// consent metadata. Never reinterpret an untracked historical delivery.
export function deliveryTracks(lead: MailingLead, delivery: MailingDelivery) {
  return delivery.trackingIncluded === true ||
    (delivery.trackingIncluded === undefined && !!lead.tracking);
}

export function withinMeasurementWindow(delivery: MailingDelivery) {
  return Date.parse(delivery.startedAt) > Date.now() - 180 * 86400000;
}
