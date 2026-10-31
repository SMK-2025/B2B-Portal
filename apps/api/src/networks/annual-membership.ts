import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NetworkRecord, NetworkOrderRecord } from "../core/domain";
import { emailAddress, requiredText } from "../core/validation";
import {
  addCalendarDays,
  invoiceSchedule,
  berlinMidnight,
} from "./invoice-schedule";
import {
  allProductModuleIds,
  expandNetworkModules,
} from "./network-module-catalog";
export const fullPortalModules = () =>
  expandNetworkModules(allProductModuleIds());
export function memberPrice(network: NetworkRecord) {
  return (
    network.settings.memberMonthlyNetCents ??
    (network.slug === "bayer-giants" ? 4400 : 6900)
  );
}
export function pricing(network: NetworkRecord) {
  const monthlyNetCents = memberPrice(network),
    annualNetCents =
      monthlyNetCents * (network.settings.memberBilling?.months || 12),
    vatCents = Math.round((annualNetCents * 19) / 100);
  return {
    monthlyNetCents,
    annualNetCents,
    vatCents,
    grossCents: annualNetCents + vatCents,
    months: network.settings.memberBilling?.months || 12,
    billing: network.settings.memberBilling || null,
    vatPercent: 19,
    currency: "EUR",
  };
}
export function validMemberPrice(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 100_000_000
  )
    throw new BadRequestException(
      "Mitgliedspreis muss als gültiger Netto-Centbetrag angegeben werden.",
    );
  return value;
}
export function annualOrder(
  network: NetworkRecord,
  userId: string,
  input: Record<string, unknown>,
): NetworkOrderRecord {
  if (network.status !== "active")
    throw new BadRequestException(
      "Das Partnernetzwerk muss vor einer kostenpflichtigen Mitgliederbuchung vollständig aktiviert sein.",
    );
  const quote = pricing(network);
  const policy = network.settings.memberBilling;
  if (
    policy?.automaticInvoices &&
    input.pdfInvoiceAccepted !== true &&
    input.pdfInvoiceAccepted !== "on"
  )
    throw new BadRequestException(
      "Bitte den Rechnungsversand als PDF an die Rechnungs-E-Mail bestätigen.",
    );
  if (policy && input.acceptedBillingVersion !== policy.version)
    throw new BadRequestException(
      "Die Abrechnungseinstellungen wurden geändert. Bitte neu laden und die aktuellen Bedingungen bestätigen.",
    );
  if (
    policy?.autoRenew &&
    input.renewalAccepted !== true &&
    input.renewalAccepted !== "on"
  )
    throw new BadRequestException(
      "Bitte die automatische Saisonverlängerung ausdrücklich bestätigen.",
    );
  if (
    input.paymentObligationAccepted !== true ||
    input.termsAccepted !== true ||
    input.authorityConfirmed !== true
  )
    throw new BadRequestException(
      "Bitte Jahresbuchung, Vertragsbedingungen und geschäftliche Berechtigung ausdrücklich bestätigen.",
    );
  if (input.acceptedMonthlyNetCents !== quote.monthlyNetCents)
    throw new BadRequestException(
      "Der Mitgliedspreis wurde geändert. Bitte den aktuellen Preis neu laden und bestätigen.",
    );
  const now = new Date(),
    end = new Date(now);
  end.setUTCMonth(end.getUTCMonth() + quote.months);
  if (end.getUTCDate() !== now.getUTCDate()) end.setUTCDate(0);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (policy?.paidThrough && today > policy.paidThrough)
    throw new BadRequestException(
      "Dieser Abrechnungszeitraum ist abgelaufen. Bitte den Betreiber kontaktieren.",
    );
  const schedule = policy?.freeUntil ? invoiceSchedule(policy.freeUntil) : null;
  const serviceStart = policy?.paidFrom
    ? berlinMidnight(policy.paidFrom)
    : now.toISOString();
  const serviceEnd = policy?.paidThrough
    ? berlinMidnight(addCalendarDays(policy.paidThrough, 1))
    : end.toISOString();
  return {
    id: randomUUID(),
    kind: "member_annual",
    networkId: network.id,
    orderedByUserId: userId,
    invoiceCompany: requiredText(
      input.legalName,
      "Rechtlicher Firmenname",
      2,
      200,
    ),
    invoiceContact: requiredText(
      input.invoiceContact,
      "Rechnungskontakt",
      3,
      160,
    ),
    invoiceEmail: emailAddress(input.invoiceEmail),
    invoiceStreet: requiredText(
      input.invoiceStreet,
      "Rechnungsstraße und Hausnummer",
      3,
      200,
    ),
    invoicePostalCode: requiredText(
      input.invoicePostalCode,
      "Rechnungs-Postleitzahl",
      2,
      20,
    ),
    invoiceCity: requiredText(input.invoiceCity, "Rechnungsort", 2, 120),
    invoiceCountry: requiredText(input.invoiceCountry, "Rechnungsland", 2, 100),
    invoiceVatId:
      typeof input.invoiceVatId === "string"
        ? input.invoiceVatId.trim().slice(0, 50)
        : "",
    billingCycle: "annual",
    purchaseOrderReference:
      typeof input.purchaseOrderReference === "string"
        ? input.purchaseOrderReference.trim().slice(0, 120)
        : null,
    participantCount: 1,
    selectedModules: allProductModuleIds(),
    pricingMode: "complete",
    moduleUnitPrices: {},
    monthlyNetCents: quote.monthlyNetCents,
    annualNetCents: quote.annualNetCents,
    vatCents: quote.vatCents,
    grossCents: quote.grossCents,
    setupNetCents: 0,
    minimumTermMonths: quote.months,
    ...(policy
      ? {
          billingPolicy: {
            version: policy.version,
            acceptedAt: now.toISOString(),
            ...(policy.automaticInvoices
              ? { pdfConsentAt: now.toISOString() }
              : {}),
            freeUntil: policy.freeUntil,
            invoiceDate: schedule?.invoiceDate || today,
            paymentDueDate:
              schedule?.paymentDueDate || addCalendarDays(today, 14),
            autoRenew: policy.autoRenew,
            renewalMonths: policy.renewalMonths,
            renewalDeadline:
              policy.autoRenew && policy.paidThrough
                ? addCalendarDays(addCalendarDays(policy.paidThrough, 1), -16)
                : null,
            renewalInvoiceDate:
              policy.autoRenew && policy.paidThrough
                ? addCalendarDays(addCalendarDays(policy.paidThrough, 1), -15)
                : null,
            automaticInvoices: policy.automaticInvoices,
          },
        }
      : {}),
    termsVersion: "member-annual-2026-10-19",
    pricingVersion: "member-flat-annual-2026-10-19",
    authorityConfirmed: true,
    termsAccepted: true,
    paymentObligationAccepted: true,
    status: "accepted",
    submittedAt: now.toISOString(),
    decidedAt: now.toISOString(),
    decidedByUserId: null,
    paymentStatus: "open",
    paymentDueAt: policy
      ? new Date(
          Date.parse(
            berlinMidnight(
              addCalendarDays(
                schedule?.paymentDueDate || addCalendarDays(today, 14),
                1,
              ),
            ),
          ) - 1,
        ).toISOString()
      : null,
    paidAt: null,
    serviceStartsAt: serviceStart,
    serviceEndsAt: serviceEnd,
    invoiceSentAt: null,
    invoiceReference: null,
  };
}
