import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invoicePdf, type InvoiceData } from "./invoice-document";
const run = promisify(execFile);
const xml = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const amount = (n: number) => (n / 100).toFixed(2);
const date = (s: string) => s.slice(0, 10).replaceAll("-", "");
const berlinDate = (s: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(s));
export function invoiceXml(d: InvoiceData): string {
  const o = d.order,
    net = o.annualNetCents!,
    vat = o.vatCents!,
    gross = o.grossCents!;
  if (
    net !== o.monthlyNetCents * o.minimumTermMonths ||
    vat !== Math.round(net * 0.19) ||
    gross !== net + vat
  )
    throw Error("Invoice totals mismatch");
  const country = ["deutschland", "germany", "de"].includes(
    o.invoiceCountry.trim().toLowerCase(),
  )
    ? "DE"
    : o.invoiceCountry.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country))
    throw Error("Rechnungsland benötigt einen ISO-Ländercode.");
  if (country !== "DE")
    throw Error(
      "Auslandsrechnungen müssen vor dem Versand steuerlich geprüft werden.",
    );
  const start = berlinDate(o.serviceStartsAt!),
    end = berlinDate(new Date(Date.parse(o.serviceEndsAt!) - 1).toISOString());
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument><ram:ID>${xml(d.number)}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${date(d.issuedOn)}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction><ram:IncludedSupplyChainTradeLineItem>
<ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
<ram:SpecifiedTradeProduct><ram:Name>Mitgliedszugang B2B Matching</ram:Name><ram:Description>Portalnutzung und Vernetzung</ram:Description></ram:SpecifiedTradeProduct>
<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amount(o.monthlyNetCents)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="MON">${o.minimumTermMonths}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19.00</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(net)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
</ram:IncludedSupplyChainTradeLineItem>
<ram:ApplicableHeaderTradeAgreement><ram:SellerTradeParty><ram:Name>Media Online Innovations Group, Inhaber: Martin Kelm</ram:Name><ram:PostalTradeAddress><ram:PostcodeCode>51371</ram:PostcodeCode><ram:LineOne>Im Weidenblech 25</ram:LineOne><ram:CityName>Leverkusen</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress><ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">230/5176/2697</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty>
<ram:BuyerTradeParty><ram:ID>${xml(o.orderedByUserId.slice(0, 8).toUpperCase())}</ram:ID><ram:Name>${xml(o.invoiceCompany)}</ram:Name><ram:PostalTradeAddress><ram:PostcodeCode>${xml(o.invoicePostalCode)}</ram:PostcodeCode><ram:LineOne>${xml(o.invoiceStreet)}</ram:LineOne><ram:CityName>${xml(o.invoiceCity)}</ram:CityName><ram:CountryID>${xml(country)}</ram:CountryID></ram:PostalTradeAddress></ram:BuyerTradeParty></ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeDelivery/>
<ram:ApplicableHeaderTradeSettlement><ram:PaymentReference>${xml(d.number)}</ram:PaymentReference><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE18202208000058886121</ram:IBANID><ram:AccountName>Media Online Innovations Group</ram:AccountName></ram:PayeePartyCreditorFinancialAccount><ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>SXPYDEHHXXX</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution></ram:SpecifiedTradeSettlementPaymentMeans>
<ram:ApplicableTradeTax><ram:CalculatedAmount>${amount(vat)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>${amount(net)}</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19.00</ram:RateApplicablePercent></ram:ApplicableTradeTax>
<ram:BillingSpecifiedPeriod><ram:StartDateTime><udt:DateTimeString format="102">${date(start)}</udt:DateTimeString></ram:StartDateTime><ram:EndDateTime><udt:DateTimeString format="102">${date(end)}</udt:DateTimeString></ram:EndDateTime></ram:BillingSpecifiedPeriod>
<ram:SpecifiedTradePaymentTerms><ram:Description>14 Tage nach Rechnungsdatum ohne Abzug</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">${date(d.dueOn)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${amount(net)}</ram:LineTotalAmount><ram:ChargeTotalAmount>0.00</ram:ChargeTotalAmount><ram:AllowanceTotalAmount>0.00</ram:AllowanceTotalAmount><ram:TaxBasisTotalAmount>${amount(net)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${amount(vat)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${amount(gross)}</ram:GrandTotalAmount><ram:TotalPrepaidAmount>0.00</ram:TotalPrepaidAmount><ram:DuePayableAmount>${amount(gross)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
</ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;
}
export async function zugferdInvoice(d: InvoiceData): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), "b2b-invoice-"));
  try {
    const source = join(dir, "source.pdf"),
      pdfa = join(dir, "pdfa.pdf"),
      xmlFile = join(dir, "factur-x.xml"),
      out = join(dir, "invoice.pdf"),
      ps = join(dir, "pdfa.ps");
    const icc = process.env.B2B_SRGB_ICC || "/opt/b2b/srgb.icc",
      jar = process.env.B2B_ZUGFERD_JAR || "/opt/b2b/mustang.jar";
    await writeFile(source, await invoicePdf(d));
    await writeFile(xmlFile, invoiceXml(d));
    if (/[()\\\n\r]/.test(icc)) throw Error("Invalid ICC path");
    await writeFile(
      ps,
      `/ICCProfile (${icc}) def\n[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark\n[{icc_PDFA} << /N 3 >> /PUT pdfmark\n[{icc_PDFA} ICCProfile (r) file /PUT pdfmark\n[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark\n[{OutputIntent_PDFA} << /Type /OutputIntent /S /GTS_PDFA1 /DestOutputProfile {icc_PDFA} /OutputConditionIdentifier (sRGB) >> /PUT pdfmark\n[{Catalog} << /OutputIntents [ {OutputIntent_PDFA} ] >> /PUT pdfmark\n`,
    );
    const options = {
      timeout: 120_000,
      maxBuffer: 4_000_000,
      windowsHide: true,
      cwd: dir,
    };
    await run(
      process.env.B2B_GHOSTSCRIPT || "gs",
      [
        "-dSAFER",
        `--permit-file-read=${icc}`,
        "-dBATCH",
        "-dNOPAUSE",
        "-dPDFA=3",
        "-sDEVICE=pdfwrite",
        "-sColorConversionStrategy=RGB",
        "-dPDFACompatibilityPolicy=1",
        `-sOutputFile=${pdfa}`,
        ps,
        source,
      ],
      options,
    );
    const java = process.env.B2B_JAVA || "java";
    const combined = await run(
      java,
      [
        "-Xmx512m",
        "-jar",
        jar,
        "--action",
        "combine",
        "--source",
        pdfa,
        "--source-xml",
        xmlFile,
        "--out",
        out,
        "--format",
        "zf",
        "--version",
        "2",
        "--profile",
        "e",
        "--no-additional-attachments",
        "--disable-file-logging",
      ],
      options,
    );
    // The CLI catches combination errors and can exit successfully without a file.
    try {
      await readFile(out);
    } catch {
      throw Object.assign(new Error("--action combine did not produce a PDF"), {
        stderr: combined.stderr,
        stdout: combined.stdout,
      });
    }
    const report = await run(
      java,
      [
        "-Xmx512m",
        "-jar",
        jar,
        "--action",
        "validate",
        "--source",
        out,
        "--disable-file-logging",
      ],
      options,
    );
    const summaries = [
      ...report.stdout.matchAll(/<summary\s+status=["']([^"']+)["']/g),
    ];
    const pdfReport =
      /<pdf\b[^>]*>([\s\S]*?)<\/pdf>/.exec(report.stdout)?.[1] || "";
    if (
      !summaries.length ||
      summaries.some((s) => s[1] !== "valid") ||
      !pdfReport ||
      /isCompliant[=\s"'>:]+false|status=["']invalid/i.test(pdfReport) ||
      !(
        /isCompliant[=\s"'>:]+true/i.test(pdfReport) ||
        /<summary\s+status=["']valid["']/.test(pdfReport)
      )
    )
      throw Error("ZUGFeRD validation did not confirm validity");
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
