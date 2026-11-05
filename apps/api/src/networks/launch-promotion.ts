import { BadRequestException } from "@nestjs/common";
import type {
  NetworkRecord,
  NetworkOrderRecord,
  MaintenanceReceipt,
} from "../core/domain";
import { addCalendarDays, berlinMidnight } from "./invoice-schedule";

export const KOELN_LAUNCH = "koeln-first-100-six-months-v1";
export const launchEnabled = (n: NetworkRecord) =>
  n.settings.launchPromotion?.enabled === true &&
  n.settings.memberPaymentModel !== "network" &&
  n.settings.billingMode !== "cooperation_free";

export function launchSummary(network: NetworkRecord, used: number) {
  if (!launchEnabled(network)) return null;
  const p = network.settings.launchPromotion!;
  return {
    id: p.id,
    version: `${p.id}:${p.limit}:${p.freeMonths}:fixed-term-v2`,
    limit: p.limit,
    used,
    remaining: Math.max(0, p.limit - used),
    freeMonths: p.freeMonths,
  };
}
/** Public offers never expose the number of allocated or remaining places. */
export function publicLaunchOffer(
  network: NetworkRecord,
  used: number,
  reserved = false,
) {
  const p = launchSummary(network, used);
  return p
    ? {
        id: p.id,
        version: p.version,
        limit: p.limit,
        freeMonths: p.freeMonths,
        available: p.remaining > 0 || reserved,
      }
    : null;
}

export function launchSettings(
  input: unknown,
  previous: NetworkRecord["settings"]["launchPromotion"],
  used: number,
) {
  if (!input || typeof input !== "object")
    throw new BadRequestException("Ungültige Startaktion.");
  const p = input as Record<string, unknown>,
    limit = Number(p.limit),
    freeMonths = Number(p.freeMonths);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100000 ||
    limit < used ||
    !Number.isInteger(freeMonths) ||
    freeMonths < 1 ||
    freeMonths > 24
  )
    throw new BadRequestException(
      "Bitte 1 bis 100.000 Plätze (mindestens bereits vergeben) und 1 bis 24 kostenlose Monate angeben.",
    );
  return {
    id: previous?.id || "network-launch-v1",
    enabled: p.enabled === true,
    limit,
    freeMonths,
  };
}
export function validateLaunchBilling(n: NetworkRecord) {
  if (!n.settings.launchPromotion?.enabled) return;
  const b = n.settings.memberBilling;
  if (
    n.settings.memberPaymentModel === "network" ||
    n.settings.billingMode === "cooperation_free" ||
    !b ||
    b.freeUntil ||
    b.paidFrom ||
    b.paidThrough
  )
    throw new BadRequestException(
      "Für die Startaktion bitte individuelle Zahlung ohne feste Datumszeiträume wählen.",
    );
}

export function addMonths(date: string, months: number) {
  const d = new Date(date + "T12:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export function applyLaunch(
  order: NetworkOrderRecord,
  grant: {
    slot: number;
    startsOn: string;
    campaignId: string;
    freeMonths: number;
    limit?: number;
  },
) {
  if (!order.billingPolicy)
    throw new BadRequestException(
      "Die Startaktion wurde geändert. Bitte Konditionen erneut bestätigen.",
    );
  const paidFrom = addMonths(grant.startsOn, grant.freeMonths);
  order.launchPromotion = {
    id: grant.campaignId,
    slot: grant.slot,
    limit: grant.limit,
    paidFrom,
  };
  order.minimumTermMonths = grant.freeMonths;
  order.annualNetCents = 0;
  order.vatCents = 0;
  order.grossCents = 0;
  order.serviceStartsAt = berlinMidnight(grant.startsOn);
  order.serviceEndsAt = berlinMidnight(paidFrom);
  order.paymentStatus = "paid";
  order.paymentDueAt = null;
  order.billingPolicy.freeUntil = addCalendarDays(paidFrom, -1);
  order.billingPolicy.invoiceDate = addCalendarDays(paidFrom, -15);
  order.billingPolicy.paymentDueDate = addCalendarDays(paidFrom, -1);
  order.billingPolicy.autoRenew = false;
  order.billingPolicy.automaticInvoices = false;
  order.billingPolicy.renewalDisabledAt = new Date().toISOString();
  order.billingPolicy.renewalDeadline = null;
  order.billingPolicy.renewalInvoiceDate = null;
  order.paymentObligationAccepted = false;
}

/** No extension, new order or mail is created by this operator-requested change. */
export function disableAutomaticRenewals(store: {networks:Map<string,NetworkRecord>;networkOrders:Map<string,NetworkOrderRecord>;maintenanceReceipts:Map<string,MaintenanceReceipt>}) {
  const receipt="all-memberships-fixed-term-2026-11-05-v1";
  if(store.maintenanceReceipts.has(receipt)) return false;
  const now=new Date().toISOString();
  for(const n of store.networks.values()) if(n.settings.memberBilling) {
    n.settings.memberBilling.autoRenew=false;
    n.settings.memberBilling.version=receipt;
    n.updatedAt=now;
  }
  for(const o of store.networkOrders.values()) if(o.billingPolicy) {
    o.billingPolicy.autoRenew=false;o.billingPolicy.renewalDisabledAt=now;
    o.billingPolicy.renewalDeadline=null;o.billingPolicy.renewalInvoiceDate=null;
    if(o.launchPromotion) o.billingPolicy.automaticInvoices=false;
    // Stop unsent future renewal bookings; never alter an issued invoice.
    if(o.id.startsWith("renewal:") && !o.invoiceReference && !o.invoiceSentAt) o.status="cancelled";
  }
  store.maintenanceReceipts.set(receipt,{state:"applied",completedAt:now});
  return true;
}

/** Only future Cologne bookings change; previously accepted contracts remain untouched. */
export function configureKoelnLaunch(store: {
  networks: Map<string, NetworkRecord>;
  maintenanceReceipts: Map<string, MaintenanceReceipt>;
}) {
  if (store.maintenanceReceipts.has(KOELN_LAUNCH)) return false;
  const n = [...store.networks.values()].find(
    (n) => n.slug === "unternehmernetzwerkkoeln",
  );
  if (!n) return false;
  n.settings.memberMonthlyNetCents = 1900;
  n.settings.launchPromotion = {
    id: KOELN_LAUNCH,
    enabled: true,
    limit: 100,
    freeMonths: 6,
  };
  n.settings.memberBilling = {
    months: 12,
    freeUntil: null,
    paidFrom: null,
    paidThrough: null,
    autoRenew: false,
    renewalMonths: 12,
    automaticInvoices: true,
    version: KOELN_LAUNCH,
  };
  n.updatedAt = new Date().toISOString();
  store.maintenanceReceipts.set(KOELN_LAUNCH, {
    state: "applied",
    completedAt: n.updatedAt,
  });
  return true;
}
