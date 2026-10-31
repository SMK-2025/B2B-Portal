import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { PortalStore } from "../core/portal.store";
import { EmailService } from "../auth/email.service";
import { invoicePdf, type InvoiceData } from "./invoice-document";
import { zugferdInvoice } from "./zugferd-invoice";
import { addCalendarDays, berlinMidnight } from "./invoice-schedule";
import { randomUUID } from "node:crypto";
import type { NetworkOrderRecord } from "../core/domain";

@Injectable()
export class AutomaticBillingService
  implements OnModuleInit, OnApplicationShutdown
{
  private sql: import("postgres").Sql | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  formatValidated = false;
  formatError: string | null = null;
  readiness() {
    return {
      configured: !!this.sql,
      persistenceReady: this.store.homepageReadsSafe(),
      running: this.running,
      validated: this.formatValidated,
      check: this.formatError,
    };
  }
  private logger = new Logger(AutomaticBillingService.name);
  constructor(
    private store: PortalStore,
    private mail: EmailService,
  ) {}
  async onModuleInit() {
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === "test") return;
    const { default: postgres } = await import("postgres");
    this.sql = postgres(process.env.DATABASE_URL, {
      max: 2,
      connect_timeout: 15,
    });
    await this.sql
      .unsafe(`CREATE SEQUENCE IF NOT EXISTS b2b_invoice_sequence START 1;
      CREATE TABLE IF NOT EXISTS b2b_invoices (
        id text PRIMARY KEY, order_id text UNIQUE NOT NULL, number text UNIQUE NOT NULL,
        payload jsonb NOT NULL, pdf_base64 text, status text NOT NULL DEFAULT 'ready',
        created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, error text
      );`);
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
    this.timer.unref();
  }
  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.sql?.end({ timeout: 5 });
  }
  async tick() {
    // Fail closed until the structured invoice + PDF/A validation pipeline is deployed.
    // Never fall back silently to a plain PDF invoice.
    if (this.running || !this.sql || !this.store.homepageReadsSafe()) return;
    this.running = true;
    try {
      if (!this.formatValidated) {
        const sample = {
          number: "B2B-VALIDIERUNG",
          issuedOn: "2027-01-16",
          dueOn: "2027-01-30",
          order: {
            id: "validation-only",
            orderedByUserId: "validation-only",
            invoiceCompany: "Validierung GmbH",
            invoiceContact: "Test",
            invoiceStreet: "Teststraße 1",
            invoicePostalCode: "51371",
            invoiceCity: "Leverkusen",
            invoiceCountry: "DE",
            minimumTermMonths: 5,
            monthlyNetCents: 6900,
            annualNetCents: 34500,
            vatCents: 6555,
            grossCents: 41055,
            serviceStartsAt: berlinMidnight("2027-02-01"),
            serviceEndsAt: berlinMidnight("2027-07-01"),
          } as NetworkOrderRecord,
        };
        await zugferdInvoice(sample);
        this.formatValidated = true;
        this.formatError = null;
      }
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      for (const order of [...this.store.networkOrders.values()]) {
        const p = order.billingPolicy;
        const membership = this.store.networkMemberships.find(
          (m) => m.id === order.membershipId,
        );
        const network = this.store.networks.get(order.networkId);
        if (
          !p?.automaticInvoices ||
          !p.pdfConsentAt ||
          order.status !== "accepted" ||
          network?.status !== "active" ||
          network.settings.memberPaymentModel === "network" ||
          membership?.status !== "active" ||
          membership.complimentaryAccess ||
          membership.centrallyFunded ||
          ["visitor", "network_admin"].includes(membership.role)
        )
          continue;
        if (p.invoiceDate <= today && !order.invoiceSentAt)
          await this.issue(order, today);
        if (
          p.autoRenew &&
          !p.renewalDisabledAt &&
          p.renewalInvoiceDate &&
          p.renewalInvoiceDate <= today
        )
          await this.renew(order, today);
      }
    } catch (error) {
      if (!this.formatValidated) {
        const detail = error instanceof Error ? error.message : "";
        this.formatError = detail.includes("--action combine")
          ? "COMBINE"
          : detail.includes("--action validate")
            ? "VALIDATE"
            : detail.includes("gs ")
              ? "PDFA_CONVERSION"
              : "FORMAT_CHECK";
      }
      this.logger.error(
        "Automatische Abrechnung fehlgeschlagen. Bitte Abrechnungsstatus prüfen.",
      );
    } finally {
      this.running = false;
    }
  }
  private async issue(order: NetworkOrderRecord, today: string) {
    if (!this.sql || !order.billingPolicy) return;
    // A dedicated, transactional ledger is independent of the portal snapshot.
    await this.store.persist();
    await this.sql.begin(async (tx) => {
      await tx.unsafe("SELECT pg_advisory_xact_lock(6620427)");
      const existing = await tx.unsafe(
        "SELECT id FROM b2b_invoices WHERE order_id=$1",
        [order.id],
      );
      if (existing.length) return;
      const rows = (await tx.unsafe(
        "SELECT nextval('b2b_invoice_sequence') AS n",
      )) as { n: string }[];
      const number = "B2B-" + String(rows[0].n).padStart(7, "0");
      // Late registrations get a fresh 14-day payment term, never a past due date.
      const dueOn = addCalendarDays(today, 14);
      const payload: InvoiceData = {
        number,
        issuedOn: today,
        dueOn,
        order: structuredClone(order),
      };
      await tx.unsafe(
        "INSERT INTO b2b_invoices(id,order_id,number,payload) VALUES($1,$2,$3,$4::jsonb)",
        [randomUUID(), order.id, number, JSON.stringify(payload)],
      );
    });
    const rows = (await this.sql.unsafe(
      "SELECT * FROM b2b_invoices WHERE order_id=$1",
      [order.id],
    )) as {
      id: string;
      number: string;
      status: string;
      sent_at: string;
      payload: InvoiceData;
    }[];
    const row = rows[0];
    if (!row) return;
    if (row.status === "sent") {
      order.invoiceReference = row.number;
      order.invoiceSentAt = new Date(row.sent_at).toISOString();
      await this.store.persist();
      return;
    }
    if (row.status !== "ready") return;
    const data = row.payload as InvoiceData;
    let bytes: Uint8Array;
    try {
      bytes = await zugferdInvoice(data);
    } catch {
      this.logger.error(`PDF-Erstellung fehlgeschlagen: ${row.number}`);
      return;
    }
    const claim = await this.sql.unsafe(
      "UPDATE b2b_invoices SET status='sending',pdf_base64=$2 WHERE id=$1 AND status='ready' RETURNING id",
      [row.id, Buffer.from(bytes).toString("base64")],
    );
    if (!claim.length) return;
    try {
      await this.mail.sendInvoice(
        data.order.invoiceEmail,
        data.number,
        data.dueOn,
        bytes,
      );
      await this.sql.unsafe(
        "UPDATE b2b_invoices SET status='sent',sent_at=now() WHERE id=$1",
        [row.id],
      );
      order.invoiceReference = data.number;
      order.invoiceSentAt = new Date().toISOString();
      order.paymentDueAt = new Date(
        Date.parse(berlinMidnight(addCalendarDays(data.dueOn, 1))) - 1,
      ).toISOString();
      await this.store.persist();
    } catch {
      // A network timeout may mean the provider accepted the email. Never retry blindly.
      await this.sql.unsafe(
        "UPDATE b2b_invoices SET status='review',error='Versandstatus unklar. Vor erneutem Versand beim Mailanbieter prüfen.' WHERE id=$1",
        [row.id],
      );
    }
  }
  private async renew(order: NetworkOrderRecord, today: string) {
    if (!this.sql || !order.billingPolicy || !order.serviceEndsAt) return;
    const p = order.billingPolicy;
    const id = `renewal:${order.id}`;
    if (this.store.networkOrders.has(id)) return;
    const startDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(order.serviceEndsAt));
    const end = new Date(startDate + "T12:00:00Z");
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    const endDate = end.toISOString().slice(0, 10);
    const net = order.monthlyNetCents * p.renewalMonths,
      vat = Math.round(net * 0.19);
    const next: NetworkOrderRecord = {
      ...structuredClone(order),
      id,
      minimumTermMonths: p.renewalMonths,
      annualNetCents: net,
      vatCents: vat,
      grossCents: net + vat,
      serviceStartsAt: berlinMidnight(startDate),
      serviceEndsAt: berlinMidnight(endDate),
      invoiceReference: null,
      invoiceSentAt: null,
      paymentStatus: "open",
      paidAt: null,
      submittedAt: new Date().toISOString(),
      billingPolicy: {
        ...p,
        sourceOrderId: order.id,
        freeUntil: null,
        invoiceDate: p.renewalInvoiceDate!,
        paymentDueDate: addCalendarDays(p.renewalInvoiceDate!, 14),
        renewalDeadline: addCalendarDays(endDate, -16),
        renewalInvoiceDate: addCalendarDays(endDate, -15),
      },
    };
    // Stable order id makes restart recovery deterministic.
    this.store.networkOrders.set(id, next);
    await this.store.persist();
    await this.issue(next, today);
  }
  async status() {
    return this.sql
      ? this.sql.unsafe(
          "SELECT id,order_id,number,status,created_at,sent_at,error FROM b2b_invoices ORDER BY created_at DESC LIMIT 200",
        )
      : [];
  }
  async document(id: string) {
    if (!this.sql) return null;
    const rows = (await this.sql.unsafe(
      "SELECT number,pdf_base64 FROM b2b_invoices WHERE id=$1",
      [id],
    )) as { number: string; pdf_base64: string | null }[];
    return rows[0]?.pdf_base64
      ? { number: rows[0].number, base64: rows[0].pdf_base64 }
      : null;
  }
}
