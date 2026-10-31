import { BadRequestException } from "@nestjs/common";

/** Calendar dates, not instants: scheduling is evaluated in Europe/Berlin. */
export function calendarDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new BadRequestException("Bitte ein gültiges Datum angeben.");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException("Bitte ein gültiges Datum angeben.");
  return value;
}

export function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${calendarDate(value)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function invoiceSchedule(freeThrough: string) {
  const freeUntil = calendarDate(freeThrough);
  const invoiceDate = addCalendarDays(freeUntil, -15);
  return {
    freeUntil,
    invoiceDate,
    paymentDueDate: addCalendarDays(invoiceDate, 14),
    paidFrom: addCalendarDays(freeUntil, 1),
    timezone: "Europe/Berlin" as const,
  };
}

export function berlinMidnight(value: string): string {
  const date = calendarDate(value);
  const utc = Date.parse(`${date}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(utc))
    .find((p) => p.type === "timeZoneName")!.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset)!;
  const minutes =
    (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1);
  return new Date(utc - minutes * 60000).toISOString();
}
