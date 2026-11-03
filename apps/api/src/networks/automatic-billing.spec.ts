import { describe, it, expect, vi, afterEach } from "vitest";
import { AutomaticBillingService } from "./automatic-billing.service";
import { PortalStore } from "../core/portal.store";
import { EmailService } from "../auth/email.service";
import * as generator from "./zugferd-invoice";
import type { NetworkOrderRecord } from "../core/domain";
afterEach(() => vi.restoreAllMocks());
function fixture() {
  let row: any = null,
    counter = 0,
    queue = Promise.resolve();
  const unsafe = async (query: string, args: any[] = []) => {
    if (query.includes("pg_advisory")) return [];
    if (query.startsWith("INSERT INTO b2b_referral_redemptions")) return [{credit_id: args[0]}];
    if (query.startsWith("SELECT id")) return row ? [{ id: row.id }] : [];
    if (query.includes("nextval")) return [{ n: String(++counter) }];
    if (query.startsWith("INSERT")) {
      row = {
        id: args[0],
        number: args[2],
        payload: JSON.parse(args[3]),
        status: "ready",
        sent_at: null,
      };
      return [];
    }
    if (query.startsWith("SELECT *")) return row ? [{ ...row }] : [];
    if (query.includes("status='sending'")) {
      if (row.status !== "ready") return [];
      row.status = "sending";
      return [{ id: row.id }];
    }
    if (query.includes("status='sent'")) {
      row.status = "sent";
      row.sent_at = new Date().toISOString();
      return [];
    }
    if (query.includes("status='review'")) {
      row.status = "review";
      return [];
    }
    return [];
  };
  const sql = {
    unsafe,
    begin: (fn: (tx: { unsafe: typeof unsafe }) => Promise<void>) => {
      const next = queue.then(() => fn({ unsafe }));
      queue = next.catch(() => {});
      return next;
    },
  };
  const send = vi.fn().mockResolvedValue(undefined),
    store = new PortalStore(),
    service = new AutomaticBillingService(store, {
      sendInvoice: send,
    } as unknown as EmailService);
  (service as any).sql = sql;
  const order = {
    id: "order",
    invoiceEmail: "member@example.test",
    billingPolicy: { invoiceDate: "2027-01-16" },
  } as NetworkOrderRecord;
  const issue = () =>
    (service as any).issue(order, "2027-01-16") as Promise<void>;
  return { store, order, issue, send, row: () => row, count: () => counter };
}
describe("automatic invoice delivery safeguards", () => {
  it.each([1,5,8])("applies at most the billed months, without changing the contract (%s credits)", async credits=>{
    vi.spyOn(generator,"zugferdInvoice").mockResolvedValue(new Uint8Array([1]));
    const f=fixture();Object.assign(f.order,{networkId:"n",orderedByUserId:"u",monthlyNetCents:6900,minimumTermMonths:5,annualNetCents:34500,serviceEndsAt:"2027-07-01"});
    f.store.networks.set("n",{settings:{memberPaymentModel:"individual"}} as never);
    for(let i=0;i<credits;i++) f.store.notifications.push({id:String(i),userId:"u",type:"network.referral.success",data:{creditMonths:1,networkId:"n"},createdAt:"",readAt:null});
    await f.issue();await f.issue();
    const net=Math.max(0,5-credits)*6900;
    expect(f.row().payload).toMatchObject({referralMonths:Math.min(credits,5),order:{grossCents:net+Math.round(net*.19),serviceEndsAt:"2027-07-01"}});
    expect(f.order.annualNetCents).toBe(34500); expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("reserves one number and sends once even for concurrent attempts", async () => {
    vi.spyOn(generator, "zugferdInvoice").mockResolvedValue(
      new Uint8Array([1]),
    );
    const f = fixture();
    await Promise.all([f.issue(), f.issue()]);
    await f.issue();
    expect(f.count()).toBe(1);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.row().status).toBe("sent");
  });
  it("does not retry an uncertain provider result blindly", async () => {
    vi.spyOn(generator, "zugferdInvoice").mockResolvedValue(
      new Uint8Array([1]),
    );
    const f = fixture();
    f.send.mockRejectedValue(Error("timeout"));
    await f.issue();
    await f.issue();
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.row().status).toBe("review");
  });
  it("never sends when structured invoice validation fails", async () => {
    vi.spyOn(generator, "zugferdInvoice").mockRejectedValue(Error("invalid"));
    const f = fixture();
    await f.issue();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.row().status).toBe("ready");
  });
});
