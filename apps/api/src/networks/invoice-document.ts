import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NetworkOrderRecord } from "../core/domain";
export type InvoiceData = {
  number: string;
  issuedOn: string;
  dueOn: string;
  order: NetworkOrderRecord;
};
const money = (n: number) =>
  (n / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " EUR";
export async function invoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([595.28, 841.89]),
    regular = await doc.embedFont(
      await readFile(join(__dirname, "../../assets/NotoSans-Regular.ttf")),
      { subset: true },
    ),
    bold = await doc.embedFont(
      await readFile(join(__dirname, "../../assets/NotoSans-Bold.ttf")),
      { subset: true },
    );
  const supported = new Set(regular.getCharacterSet());
  const ink = rgb(0.16, 0.15, 0.25),
    accent = rgb(0.39, 0.49, 0.95);
  const clean = (s: string) => {
    const normalized = s
      .normalize("NFC")
      .replace(/[–—]/g, "-")
      .replace(/[„“”]/g, '"')
      .replace(/[‘’]/g, "'");
    if ([...normalized].some((char) => !supported.has(char.codePointAt(0)!)))
      throw Error(
        "Rechnungsdaten enthalten Zeichen, die mit der eingebundenen Schrift nicht verlustfrei dargestellt werden können.",
      );
    return normalized;
  };
  const write = (
    s: string,
    x: number,
    y: number,
    size = 10,
    strong = false,
    right = false,
  ) => {
    const font = strong ? bold : regular;
    s = clean(s);
    page.drawText(s, {
      x: right ? x - font.widthOfTextAtSize(s, size) : x,
      y,
      size,
      font,
      color: ink,
    });
  };
  const date = (s: string) =>
    new Date(s.length === 10 ? s + "T12:00:00Z" : s).toLocaleDateString(
      "de-DE",
      { timeZone: "Europe/Berlin" },
    );
  const logo = await doc.embedPng(
    await readFile(join(__dirname, "../../assets/b2b-logo.png")),
  );
  page.drawRectangle({ x: 0, y: 835, width: 596, height: 7, color: accent });
  page.drawImage(logo, { x: 42, y: 754, width: 216, height: 54 });
  write("RECHNUNG", 553, 789, 13, true, true);
  write("Digitales Netzwerkpartner-Portal", 553, 768, 9, false, true);
  write("Media Online Innovations Group", 42, 711, 11, true);
  write("Inhaber: Martin Kelm", 42, 695);
  write("Im Weidenblech 25 · 51371 Leverkusen", 42, 679, 9);
  write("Tel.: 0214/330140-60", 553, 711, 9, false, true);
  write("mail@media-online-innovations.group", 553, 695, 9, false, true);
  write("media-online-innovations.group", 553, 679, 9, false, true);
  write("RECHNUNG AN", 42, 634, 8, true);
  const o = data.order;
  for (const [i, s] of [
    o.invoiceCompany,
    o.invoiceContact,
    o.invoiceStreet,
    `${o.invoicePostalCode} ${o.invoiceCity}`,
    o.invoiceCountry,
  ].entries()) {
    // Wrap long names and addresses within the recipient column.
    const words = clean(s).split(/\s+/);
    let row = "",
      lines: string[] = [];
    for (const word of words) {
      if (regular.widthOfTextAtSize(row + " " + word, 10) > 265) {
        lines.push(row);
        row = word;
      } else row += (row ? " " : "") + word;
    }
    lines.push(row);
    if (
      lines.length > 2 ||
      lines.some((line) => regular.widthOfTextAtSize(line, 10) > 265)
    )
      throw Error(
        "Rechnungsadresse passt nicht vollständig in das Layout. Bitte vor dem Versand prüfen.",
      );
    lines
      .slice(0, 2)
      .forEach((line, j) =>
        write(line, 42, 615 - i * 27 - j * 12, 10, i === 0),
      );
  }
  [
    ["Rechnungsnummer", data.number],
    ["Rechnungsdatum", date(data.issuedOn)],
    ["Kundennummer", o.orderedByUserId.slice(0, 8).toUpperCase()],
    ["Zahlbar bis", date(data.dueOn)],
  ].forEach(([label, value], i) => {
    write(label, 553, 642 - i * 29, 8, false, true);
    write(value, 553, 629 - i * 29, 10, i === 0, true);
  });
  write("Rechnung", 42, 452, 26, true);
  write("Mitgliedszugang B2B Matching", 42, 428, 13, true);
  const lastDay = new Date(Date.parse(o.serviceEndsAt!) - 1).toISOString();
  write(
    `Leistungszeitraum: ${date(o.serviceStartsAt!)} bis ${date(lastDay)}`,
    42,
    407,
  );
  page.drawRectangle({
    x: 42,
    y: 352,
    width: 511,
    height: 30,
    color: rgb(0.94, 0.95, 0.99),
  });
  write("Leistung", 52, 363, 9, true);
  write("Monate", 384, 363, 9, true, true);
  write("Netto / Monat", 465, 363, 9, true, true);
  write("Netto", 543, 363, 9, true, true);
  write("Portalnutzung und Vernetzung", 52, 332, 10, true);
  write(String(o.minimumTermMonths), 384, 332, 10, false, true);
  write(money(o.monthlyNetCents), 465, 332, 10, false, true);
  write(money(o.annualNetCents!), 543, 332, 10, false, true);
  write("Nettobetrag", 454, 291, 10, false, true);
  write(money(o.annualNetCents!), 543, 291, 10, false, true);
  write("Umsatzsteuer 19 %", 454, 267, 10, false, true);
  write(money(o.vatCents!), 543, 267, 10, false, true);
  write("Gesamtbetrag", 330, 233, 12, true);
  write(money(o.grossCents!), 543, 233, 15, true, true);
  write(
    `Bitte bis ${date(data.dueOn)} überweisen. Verwendungszweck: ${data.number}`,
    42,
    191,
    9,
  );
  write("Media Online Innovations Group · Banking Circle (Vivid)", 42, 170, 10);
  write("IBAN: DE18 2022 0800 0058 8861 21", 42, 153, 10, true);
  write("BIC: SXPYDEHHXXX", 42, 136, 10);
  write("Media Online Innovations Group, Inhaber: Martin Kelm", 42, 89, 8);
  write(
    "Im Weidenblech 25 · 51371 Leverkusen · Steuernummer: 230/5176/2697",
    42,
    75,
    8,
  );
  write(
    "mail@media-online-innovations.group · media-online-innovations.group",
    42,
    61,
    8,
  );
  write("Seite 1 / 1", 553, 38, 8, false, true);
  return doc.save();
}
