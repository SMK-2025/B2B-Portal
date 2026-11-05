import { afterEach, describe, expect, it, vi } from "vitest";
import { PortalStore } from "../core/portal.store";
import type { NetworkRecord, NetworkOrderRecord } from "../core/domain";
import { AutomaticBillingService } from "./automatic-billing.service";
import { EmailService } from "../auth/email.service";
import {
  addMonths,
  applyLaunch,
  configureKoelnLaunch,
  KOELN_LAUNCH,
  launchSettings,
  launchSummary,
  validateLaunchBilling,
} from "./launch-promotion";

function fixture(limit = 100, freeMonths = 6) {
  const store = new PortalStore();
  const network = {
    id: "koeln",
    slug: "unternehmernetzwerkkoeln",
    status: "active",
    settings: {
      memberPaymentModel: "individual",
      memberMonthlyNetCents: 1900,
      launchPromotion: { id: KOELN_LAUNCH, enabled: true, limit, freeMonths },
      memberBilling: {
        months: 12,
        autoRenew: true,
        renewalMonths: 12,
        automaticInvoices: true,
        freeUntil: null,
        paidFrom: null,
        paidThrough: null,
      },
    },
  } as NetworkRecord;
  store.networks.set(network.id, network);
  return { store, network };
}
function order(): NetworkOrderRecord {
  return {
    id: "order",
    networkId: "koeln",
    orderedByUserId: "member",
    membershipId: "membership",
    status: "accepted",
    monthlyNetCents: 1900,
    billingPolicy: {
      version: "v1",
      acceptedAt: "2026-11-05",
      pdfConsentAt: "2026-11-05",
      autoRenew: true,
      renewalMonths: 12,
      automaticInvoices: true,
    },
  } as NetworkOrderRecord;
}
afterEach(() => vi.useRealTimers());
describe("network launch promotion", () => {
  it("atomically caps simultaneous applicants at the configured limit", async () => {
    const { store } = fixture();
    const results = await Promise.allSettled(
      Array.from({ length: 105 }, (_, i) =>
        store.claimLaunchPlace("koeln", `user-${i}`, `Firma ${i} GmbH`),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(100);
    expect(store.launchUsed("koeln")).toBe(100);
    await expect(
      store.claimLaunchPlace("koeln", "user-0", "Firma 0 GmbH"),
    ).resolves.toMatchObject({ slot: 1 });
    expect(store.launchUsed("koeln")).toBe(100);
    await expect(
      store.claimLaunchPlace("koeln", "other", "Firma 0 GmbH"),
    ).rejects.toThrow(/bereits/);
    // Removing portal records does not recycle a limited promotional slot.
    store.users.clear();
    store.networkOrders.clear();
    await expect(
      store.claimLaunchPlace("koeln", "new", "Neue GmbH"),
    ).rejects.toThrow(/vergeben/);
  });
  it("isolates limits and months per network and supports different city sizes", async () => {
    const { store, network } = fixture(2, 3);
    store.networks.set("other", {
      ...structuredClone(network),
      id: "other",
      slug: "other",
      settings: {
        ...network.settings,
        launchPromotion: {
          id: "network-launch-v1",
          enabled: true,
          limit: 5,
          freeMonths: 2,
        },
      },
    });
    await store.claimLaunchPlace("koeln", "a", "Firma A");
    await store.claimLaunchPlace("koeln", "b", "Firma B");
    await expect(
      store.claimLaunchPlace("koeln", "c", "Firma C"),
    ).rejects.toThrow();
    await expect(
      store.claimLaunchPlace("other", "a", "Firma A"),
    ).resolves.toMatchObject({ slot: 1, freeMonths: 2 });
    expect(launchSummary(network, 2)).toMatchObject({
      remaining: 0,
      freeMonths: 3,
      limit: 2,
    });
  });
  it("preserves allocated counters, rejects incompatible billing and leaves existing networks untouched", () => {
    const { store, network } = fixture();
    const other = {
      ...structuredClone(network),
      id: "lev",
      slug: "unternehmernetzwerkleverkusen",
    };
    store.networks.set(other.id, other);
    const before = structuredClone(other);
    expect(configureKoelnLaunch(store)).toBe(true);
    expect(configureKoelnLaunch(store)).toBe(false);
    expect(other).toEqual(before);
    expect(network.settings.memberMonthlyNetCents).toBe(1900);
    expect(() =>
      launchSettings(
        { enabled: true, limit: 50, freeMonths: 6 },
        network.settings.launchPromotion,
        60,
      ),
    ).toThrow();
    expect(
      launchSettings(
        { enabled: false, limit: 200, freeMonths: 3 },
        network.settings.launchPromotion,
        60,
      ).id,
    ).toBe(KOELN_LAUNCH);
    expect(() =>
      validateLaunchBilling({
        ...network,
        settings: { ...network.settings, memberPaymentModel: "network" },
      }),
    ).toThrow();
    expect(() => validateLaunchBilling(network)).not.toThrow();
  });
  it("uses calendar months, snapshots a free period and cancellation before the invoice date", () => {
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    const o = order();
    applyLaunch(o, {
      slot: 1,
      startsOn: "2026-11-05",
      campaignId: KOELN_LAUNCH,
      freeMonths: 6,
    });
    expect(o).toMatchObject({
      minimumTermMonths: 6,
      grossCents: 0,
      annualNetCents: 0,
      monthlyNetCents: 1900,
      paymentDueAt: null,
      launchPromotion: { paidFrom: "2027-05-05" },
      billingPolicy: {
        freeUntil: "2027-05-04",
        invoiceDate: "2027-04-20",
        renewalDeadline: "2027-04-19",
        paymentDueDate: "2027-05-04",
      },
    });
  });
  it("sends no zero-value trial invoice, bills twelve months only after the deadline and honors opt-out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
    const { store } = fixture(),
      o = order();
    applyLaunch(o, {
      slot: 1,
      startsOn: "2026-11-05",
      campaignId: KOELN_LAUNCH,
      freeMonths: 6,
    });
    store.networkOrders.set(o.id, o);
    store.networkMemberships.push({
      id: "membership",
      networkId: "koeln",
      userId: "member",
      status: "active",
      role: "member",
    } as any);
    const email = new EmailService(),
      send = vi.spyOn(email, "sendInvoice").mockResolvedValue();
    const billing = new AutomaticBillingService(store, email) as any;
    billing.sql = {};
    billing.formatValidated = true;
    const issue = vi.spyOn(billing, "issue").mockResolvedValue();
    await billing.tick();
    expect(issue).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2027-04-20T12:00:00Z"));
    o.billingPolicy!.renewalDisabledAt = "2027-04-19T12:00:00Z";
    await billing.tick();
    expect(issue).not.toHaveBeenCalled();
    expect(store.networkOrders.size).toBe(1);
    o.billingPolicy!.renewalDisabledAt = null;
    await billing.tick();
    const paid = store.networkOrders.get("renewal:order")!;
    expect(paid).toMatchObject({
      minimumTermMonths: 12,
      annualNetCents: 22800,
      vatCents: 4332,
      grossCents: 27132,
      launchPromotion: undefined,
    });
    expect(issue).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });
  it("serializes database allocation with an advisory transaction lock", async () => {
    const { store, network } = fixture(1);
    const rows: any[] = [],
      queries: string[] = [];
    let queue = Promise.resolve();
    const unsafe = vi.fn(async (q: string, args: any[] = []) => {
      queries.push(q);
      if (q.includes("jsonb_array_elements"))
        return [{ settings: network.settings }];
      if (q.startsWith("INSERT")) {
        rows.push({
          campaign: args[0],
          network_id: args[1],
          slot: args[2],
          user_id: args[3],
          company_hash: args[4],
          starts_on: args[5],
        });
        return [];
      }
      if (q.includes("FROM b2b_launch_places")) return [...rows];
      return [];
    });
    (store as any).sql = {
      unsafe,
      begin: (fn: any) => {
        const p = queue.then(() => fn({ unsafe }));
        queue = p.catch(() => {});
        return p;
      },
    };
    const results = await Promise.allSettled([
      store.claimLaunchPlace("koeln", "a", "Firma A"),
      store.claimLaunchPlace("koeln", "b", "Firma B"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(rows).toHaveLength(1);
    expect(queries[0]).toContain("pg_advisory_xact_lock");
  });
});
