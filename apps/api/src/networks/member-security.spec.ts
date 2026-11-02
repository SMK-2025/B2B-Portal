import { describe, it, expect, vi } from "vitest";
import { PortalStore } from "../core/portal.store";
import { removeNetworkUser } from "./remove-network-user";
import { NetworksController } from "./networks.controller";
describe("member data boundaries", () => {
  it("preserves a second network and removes the login only after the last membership", () => {
    const s = new PortalStore(),
      email = "member@example.test";
    s.users.set("u", { id: "u", email, accountRole: "user" } as never);
    s.userByEmail.set(email, "u");
    for (const n of ["one", "two"]) {
      s.networkMemberships.push({
        id: n,
        networkId: n,
        organizationId: n,
        userId: "u",
      } as never);
      s.memberships.push({ organizationId: n, userId: "u", role: "admin" });
      s.organizations.set(n, { id: n } as never);
      s.networkContents.set(n, {
        networkId: n,
        createdByUserId: "u",
        data: {},
      } as never);
    }
    s.sessions.set("session", { userId: "u" } as never);
    expect(removeNetworkUser(s, "one", "u", email).accountDeleted).toBe(false);
    expect(s.organizations.has("one")).toBe(false);
    expect(s.networkContents.has("one")).toBe(false);
    expect(s.organizations.has("two")).toBe(true);
    expect(s.networkContents.has("two")).toBe(true);
    expect(s.sessions.size).toBe(1);
    expect(removeNetworkUser(s, "two", "u", email).accountDeleted).toBe(true);
    expect(s.sessions.size).toBe(0);
    expect(s.userByEmail.has(email)).toBe(false);
  });
  it("blocks destructive removal before mutating issued billing records", () => {
    const s = new PortalStore();
    s.networkOrders.set("order", {
      networkId: "n",
      orderedByUserId: "u",
      kind: "member_annual",
      invoiceReference: "B2B-123",
    } as never);
    const before = s.snapshot();
    expect(() => removeNetworkUser(s, "n", "u", "u@example.test")).toThrow();
    expect(s.snapshot()).toBe(before);
  });
  it("rejects another member's invoice before any document lookup", async () => {
    const billing = { status: vi.fn(), document: vi.fn() };
    const controller = new NetworksController(
      { myBilling: () => [{ id: "mine" }] } as never,
      billing as never,
    );
    await expect(
      controller.memberPdf("Bearer test", "my-network", "other"),
    ).rejects.toThrow();
    expect(billing.status).not.toHaveBeenCalled();
    billing.status.mockResolvedValue([{ id: "pdf", downloadable: true }]);
    billing.document.mockResolvedValue({ number: "B2B-1", base64: "JVBERg==" });
    await expect(
      controller.memberPdf("Bearer test", "my-network", "mine"),
    ).resolves.toMatchObject({ number: "B2B-1" });
    expect(billing.status).toHaveBeenCalledWith(["mine"]);
  });
});
