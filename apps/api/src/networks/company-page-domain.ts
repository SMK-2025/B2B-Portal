import { BadRequestException } from "@nestjs/common";

// A homepage represents one business presence, not an individual URL path.
export function companyDomain(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error();
    return url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    throw new BadRequestException('Bitte eine gültige Unternehmenshomepage mit https:// angeben.');
  }
}

export function sameCompanyDomain(a: string, b: string): boolean {
  const left = companyDomain(a), right = companyDomain(b);
  return left === right || left.endsWith('.' + right) || right.endsWith('.' + left);
}
