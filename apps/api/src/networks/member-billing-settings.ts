import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NetworkRecord } from "../core/domain";
import { calendarDate, addCalendarDays } from "./invoice-schedule";
export function memberBillingSettings(
  input: unknown,
): NonNullable<NetworkRecord["settings"]["memberBilling"]> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("Ungültige Abrechnungseinstellungen.");
  const b = input as Record<string, unknown>,
    months = Number(b.months),
    renewalMonths = Number(b.renewalMonths || 12);
  if (
    !Number.isInteger(months) ||
    months < 1 ||
    months > 36 ||
    !Number.isInteger(renewalMonths) ||
    renewalMonths < 1 ||
    renewalMonths > 36
  )
    throw new BadRequestException(
      "Laufzeit bitte in ganzen Monaten von 1 bis 36 angeben.",
    );
  const freeUntil = b.freeUntil ? calendarDate(b.freeUntil) : null,
    paidFrom = b.paidFrom
      ? calendarDate(b.paidFrom)
      : freeUntil
        ? addCalendarDays(freeUntil, 1)
        : null,
    paidThrough = b.paidThrough ? calendarDate(b.paidThrough) : null;
  if (
    (paidFrom && !paidThrough) ||
    (!paidFrom && paidThrough) ||
    (paidFrom && paidThrough && paidFrom > paidThrough) ||
    (freeUntil && paidFrom !== addCalendarDays(freeUntil, 1))
  )
    throw new BadRequestException(
      "Bitte zusammenhängenden Zeitraum nach der kostenlosen Nutzung angeben.",
    );
  if (b.autoRenew === true && (!paidThrough || renewalMonths !== 12))
    throw new BadRequestException(
      "Automatische Saisonverlängerung benötigt ein festes Saisonende und zwölf Folgemonate.",
    );
  if (paidFrom && paidThrough) {
    const start = new Date(paidFrom + "T12:00:00Z");
    start.setUTCMonth(start.getUTCMonth() + months);
    if (start.toISOString().slice(0, 10) !== addCalendarDays(paidThrough, 1))
      throw new BadRequestException(
        "Monatsanzahl und Leistungszeitraum stimmen nicht überein.",
      );
  }
  return {
    months,
    freeUntil,
    paidFrom,
    paidThrough,
    autoRenew: b.autoRenew === true,
    renewalMonths,
    automaticInvoices: b.automaticInvoices === true,
    version: randomUUID(),
  };
}
