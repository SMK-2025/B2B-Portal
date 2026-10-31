import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { invoicePdf, type InvoiceData } from "./invoice-document";
import { invoiceXml } from "./zugferd-invoice";
import type { NetworkOrderRecord } from "../core/domain";
const sample: InvoiceData = {
  number: "B2B-0000001",
  issuedOn: "2027-01-16",
  dueOn: "2027-01-30",
  order: {
    orderedByUserId: "abc",
    invoiceCompany: "Beispiel & Partner GmbH",
    invoiceContact: "Max Mustermann",
    invoiceStreet: "Beispielstraße 1",
    invoicePostalCode: "51371",
    invoiceCity: "Leverkusen",
    invoiceCountry: "Deutschland",
    monthlyNetCents: 6900,
    minimumTermMonths: 5,
    annualNetCents: 34500,
    vatCents: 6555,
    grossCents: 41055,
    serviceStartsAt: "2027-01-31T23:00:00Z",
    serviceEndsAt: "2027-06-30T22:00:00Z",
  } as NetworkOrderRecord,
};
describe("invoice data and readable PDF", () => {
  it("renders one page with the portal branding", async () => {
    const bytes = await invoicePdf(sample);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it("uses the same totals and calendar period in structured data", () => {
    const xml = invoiceXml(sample);
    expect(xml).toContain("Beispiel &amp; Partner GmbH");
    expect(xml).toContain("410.55");
    expect(xml).toContain("20270201");
    expect(xml).toContain("20270630");
    expect(xml).toContain("20270130");
    expect(xml).not.toMatch(/Bayer|Muster|Vorlage/);
  });
  it("refuses inconsistent totals and unsupported foreign tax cases", () => {
    expect(() =>
      invoiceXml({ ...sample, order: { ...sample.order, grossCents: 1 } }),
    ).toThrow(/totals/);
    expect(() =>
      invoiceXml({
        ...sample,
        order: { ...sample.order, invoiceCountry: "AT" },
      }),
    ).toThrow(/Auslands/);
  });
});
