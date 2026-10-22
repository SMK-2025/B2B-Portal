export type ContactCardData = {
  companyName: string;
  contactName: string;
  contactPosition: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  websiteUrl: string | null;
  logoUrl: string | null;
};
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}
function foldLine(line: string) {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let part = "",
    bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += length;
  }
  lines.push(part);
  return lines.join("\r\n");
}
export function partnerVCard(profile: ContactCardData) {
  const text = escapeText,
    name = profile.contactName.trim() || profile.companyName.trim();
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${text(name)}`,
    `N:${text(name)};;;;`,
    `ORG:${text(profile.companyName)}`,
  ];
  if (profile.contactPosition)
    lines.push(`TITLE:${text(profile.contactPosition)}`);
  if (profile.contactEmail)
    lines.push(`EMAIL;TYPE=INTERNET,WORK:${text(profile.contactEmail)}`);
  if (profile.contactPhone)
    lines.push(`TEL;TYPE=WORK,VOICE:${text(profile.contactPhone)}`);
  if (profile.street || profile.city || profile.postalCode)
    lines.push(
      `ADR;TYPE=WORK:;;${text(profile.street)};${text(profile.city)};;${text(profile.postalCode)};${text(profile.country)}`,
    );
  if (profile.websiteUrl && /^https?:\/\//i.test(profile.websiteUrl))
    lines.push(`URL:${profile.websiteUrl.replace(/[\r\n\u0000-\u001f]/g, "")}`);
  lines.push("END:VCARD");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
