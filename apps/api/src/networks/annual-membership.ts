import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NetworkRecord, NetworkOrderRecord } from "../core/domain";
import { emailAddress, requiredText } from "../core/validation";
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
    annualNetCents = monthlyNetCents * 12,
    vatCents = Math.round((annualNetCents * 19) / 100);
  return {
    monthlyNetCents,
    annualNetCents,
    vatCents,
    grossCents: annualNetCents + vatCents,
    months: 12,
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
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  if (end.getUTCMonth() !== now.getUTCMonth()) end.setUTCDate(0);
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
    minimumTermMonths: 12,
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
    paymentDueAt: null,
    paidAt: null,
    serviceStartsAt: now.toISOString(),
    serviceEndsAt: end.toISOString(),
    invoiceSentAt: null,
    invoiceReference: null,
  };
}
