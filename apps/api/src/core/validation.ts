import { BadRequestException } from "@nestjs/common";

export function requiredText(value: unknown, field: string, min = 1, max = 200): string {
  if (typeof value !== "string") throw new BadRequestException(`${field} ist erforderlich.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new BadRequestException(`${field} muss zwischen ${min} und ${max} Zeichen enthalten.`);
  return normalized;
}

export function emailAddress(value: unknown): string {
  const email = requiredText(value, "E-Mail-Adresse", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Die E-Mail-Adresse ist ungültig.");
  return email;
}

export function safeUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = requiredText(value, "Homepage", 8, 500);
  try { const url = new URL(raw); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); return url.toString(); }
  catch { throw new BadRequestException("Die Homepage muss eine gültige HTTP- oder HTTPS-Adresse sein."); }
}
