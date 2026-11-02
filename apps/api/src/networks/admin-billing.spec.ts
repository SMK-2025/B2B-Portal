import { describe, expect, it, vi } from "vitest";
import { NetworksService } from "./networks.service";
import { AutomaticBillingService } from "./automatic-billing.service";

function fixture() {
  const network = {
    id: "a",
    slug: "test",
    name: "Test",
    settings: { memberMonthlyNetCents: 6900 },
  };
  const existing = {
    id: "old",
    networkId: "a",
    monthlyNetCents: 4400,
    submittedAt: "2026-01-01",
    paymentStatus: "paid",
  };
  const service = Object.assign(Object.create(NetworksService.prototype), {
    auth: { authenticate: vi.fn(() => ({ id: "owner" })) },
    requirePlatformAdmin: vi.fn(),
    raw: vi.fn(() => network),
    operatorAudit: vi.fn(),
    store: {
      networkOrders: new Map([
        ["old", existing],
        [
          "other",
          {
            ...existing,
            id: "other",
            networkId: "b",
            submittedAt: "2026-02-01",
          },
        ],
      ]),
    },
  });
  return { service, network, existing };
}
describe("operator billing details", () => {
  it("changes future pricing without rewriting existing contracts", () => {
    const { service, network, existing } = fixture();
    service.memberPricing("Bearer owner", "a", {
      monthlyNetCents: 7900,
      memberPaymentModel: "network",
      billing: {
        months: 6,
        freeUntil: "2026-12-31",
        paidFrom: "2027-01-01",
        paidThrough: "2027-06-30",
        autoRenew: true,
        renewalMonths: 12,
        automaticInvoices: true,
      },
    });
    expect(network.settings).toMatchObject({
      memberMonthlyNetCents: 7900,
      memberPaymentModel: "network",
      memberBilling: { months: 6 },
    });
    expect(existing.monthlyNetCents).toBe(4400);
    const result = service.adminBilling("Bearer owner", "a");
    expect(result.orders.map((o: { id: string }) => o.id)).toEqual(["old"]);
    expect(result.schedule).toMatchObject({
      invoiceDate: "2026-12-16",
      paymentDueDate: "2026-12-30",
    });
  });
  it("rejects invalid models and mismatched month ranges without mutation", () => {
    const { service, network } = fixture();
    expect(() =>
      service.memberPricing("owner", "a", {
        monthlyNetCents: 9900,
        memberPaymentModel: "invalid",
      }),
    ).toThrow();
    expect(() =>
      service.memberPricing("owner", "a", {
        monthlyNetCents: 9900,
        memberPaymentModel: "network",
        billing: {
          months: 5,
          paidFrom: "2027-01-01",
          paidThrough: "2027-06-30",
        },
      }),
    ).toThrow();
    expect(network.settings).toEqual({ memberMonthlyNetCents: 6900 });
  });
  it("checks operator authority before exposing billing records", () => {
    const { service } = fixture();
    service.requirePlatformAdmin = () => {
      throw new Error("Forbidden");
    };
    expect(() => service.adminBilling("member", "a")).toThrow("Forbidden");
    expect(() =>
      service.memberPricing("member", "a", { monthlyNetCents: 0 }),
    ).toThrow("Forbidden");
  });
  it("scopes invoice lookup to the authorized network's order ids", async () => {
    const unsafe = vi.fn(async () => []);
    const billing = Object.assign(
      Object.create(AutomaticBillingService.prototype),
      { sql: { unsafe } },
    );
    await billing.status([]);
    expect(unsafe).not.toHaveBeenCalled();
    await billing.status(["order-a"]);
    expect(unsafe).toHaveBeenCalledWith(
      expect.stringContaining("WHERE order_id = ANY($1::text[])"),
      [["order-a"]],
    );
  });
});
