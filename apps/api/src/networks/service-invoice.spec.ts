import { describe, it, expect, vi } from "vitest";
import { AutomaticBillingService } from "./automatic-billing.service";
import type { NetworkOrderRecord } from "../core/domain";
import { PortalStore } from "../core/portal.store";
import { EmailService } from "../auth/email.service";
describe("operator-controlled service billing", () => {
  it("never dispatches the initial invoice or renewal on a timer before manual issue", async () => {
    const store = new PortalStore(),
      mail = new EmailService(),
      billing = new AutomaticBillingService(store, mail);
    const order = {
      id: "o",
      manualServiceInvoice: true,
      networkId: "n",
      membershipId: "m",
      status: "accepted",
      billingPolicy: {
        automaticInvoices: true,
        pdfConsentAt: "2020",
        invoiceDate: "2020",
        autoRenew: true,
        renewalInvoiceDate: "2020",
      },
    } as NetworkOrderRecord;
    store.networkOrders.set("o", order);
    store.networks.set("n", {
      status: "active",
      settings: { memberPaymentModel: "individual" },
    } as never);
    store.networkMemberships.push({
      id: "m",
      status: "active",
      role: "organization_admin",
    } as never);
    const issue = vi.fn(),
      renew = vi.fn();
    Object.assign(billing, { sql: {}, issue, renew, formatValidated: true });
    vi.spyOn(store, "homepageReadsSafe").mockReturnValue(true);
    await billing.tick();
    expect(issue).not.toHaveBeenCalled();
    expect(renew).not.toHaveBeenCalled();
  });
  it("resends only the archived PDF, number and original recipient without a new invoice", async () => {
    const mail = new EmailService(),
      send = vi.spyOn(mail, "sendInvoice").mockResolvedValue(undefined),
      billing = new AutomaticBillingService(new PortalStore(), mail);
    const unsafe = vi
      .fn()
      .mockResolvedValue([
        {
          number: "B2B-0000001",
          pdf_base64: "JVBERg==",
          payload: {
            order: { invoiceEmail: "archiv@example.test" },
            dueOn: "2027-01-01",
          },
        },
      ]);
    Object.assign(billing, { sql: { unsafe }, formatValidated: true });
    await billing.dispatchServiceInvoice(
      {
        id: "o",
        manualServiceInvoice: true,
        invoiceReference: "B2B-0000001",
      } as NetworkOrderRecord,
      true,
    );
    expect(send).toHaveBeenCalledWith(
      "archiv@example.test",
      "B2B-0000001",
      "2027-01-01",
      Buffer.from("JVBERg==", "base64"),
    );
    expect(unsafe).toHaveBeenCalledTimes(1);
  });
});
