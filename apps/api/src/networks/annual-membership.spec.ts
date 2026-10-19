import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { PortalStore } from "../core/portal.store";
import { OrganizationsService } from "../organizations/organizations.service";
import { NetworksService } from "./networks.service";
import { annualOrder, pricing } from "./annual-membership";
describe("personal annual membership billing", () => {
  async function fixture() {
    const store = new PortalStore(),
      email = new EmailService();
    vi.spyOn(email, "sendVerification").mockResolvedValue();
    const inviteMail = vi
      .spyOn(email, "sendNetworkInvitation")
      .mockResolvedValue();
    const auth = new AuthService(store, email),
      networks = new NetworksService(store, auth, email),
      orgs = new OrganizationsService(store, auth, email),
      password = "Sicher-Portal-2026!";
    await auth.ensurePlatformAdmin({
      email: "owner@example.de",
      password,
      firstName: "Portal",
      lastName: "Owner",
    });
    const owner =
      "Bearer " +
      (await auth.login({ email: "owner@example.de", password })).token;
    const network = networks.create(owner, {
      name: "Partnernetzwerk",
      slug: "partnernetzwerk",
    });
    networks.setAccess(owner, network.id, { status: "active" });
    await networks.inviteMember(owner, network.id, {
      email: "partner@example.de",
      role: "member",
    });
    const invite = inviteMail.mock.calls[0][0].inviteToken;
    const registered = await auth.register(
      {
        email: "partner@example.de",
        password,
        firstName: "Mara",
        lastName: "Partner",
        networkInviteToken: invite,
      },
      true,
    );
    auth.verifyEmail(registered.verificationToken);
    const member =
      "Bearer " +
      (await auth.login({ email: "partner@example.de", password })).token;
    const input = {
      networkInviteToken: invite,
      legalName: "Partner GmbH",
      displayName: "Partner GmbH",
      role: "network",
      websiteUrl: "https://example.de",
      invoiceContact: "Mara Partner",
      invoiceEmail: "rechnung@example.de",
      invoiceStreet: "Beispielstraße 12",
      invoicePostalCode: "12345",
      invoiceCity: "Beispielstadt",
      invoiceCountry: "Deutschland",
      invoiceVatId: "DE123456789",
      acceptedMonthlyNetCents: 6900,
      authorityConfirmed: true,
      termsAccepted: true,
      paymentObligationAccepted: true,
    };
    return {
      store,
      auth,
      email,
      networks,
      orgs,
      owner,
      network,
      member,
      input,
      invite,
      registered,
    };
  }
  it("shows default 69 euro, records the invoice snapshot and immediately unlocks every function despite open payment", async () => {
    const f = await fixture();
    expect(f.networks.invitationQuote({ invite: f.invite })).toMatchObject({
      monthlyNetCents: 6900,
      annualNetCents: 82800,
      vatCents: 15732,
      grossCents: 98532,
    });
    const company = f.orgs.create(f.member, f.input, true);
    const order = [...f.store.networkOrders.values()][0];
    expect(order).toMatchObject({
      kind: "member_annual",
      organizationId: company.id,
      status: "accepted",
      paymentStatus: "open",
      participantCount: 1,
      setupNetCents: 0,
      grossCents: 98532,
      invoiceEmail: "rechnung@example.de",
      minimumTermMonths: 12,
    });
    expect(
      Date.parse(order.serviceEndsAt!) - Date.parse(order.serviceStartsAt!),
    ).toBeGreaterThan(364 * 86400000);
    expect(
      f.networks.publicBySlug(f.member, f.network.slug).enabledModules,
    ).toEqual(
      expect.arrayContaining([
        "profiles",
        "events",
        "communication",
        "documents",
        "tasks",
        "community",
      ]),
    );
    expect(f.networks.ownProfile(f.member, f.network.id).canEdit).toBe(true);
    expect(() => f.orgs.create(f.member, f.input, true)).toThrow();
    expect(f.store.networkOrders.size).toBe(1);
  });
  it("rejects missing billing data, absent consent and stale/forged prices without consuming the invitation", async () => {
    const f = await fixture();
    for (const change of [
      { invoiceStreet: "" },
      { paymentObligationAccepted: false },
      { acceptedMonthlyNetCents: 1 },
      { termsAccepted: false },
    ])
      expect(() =>
        f.orgs.create(f.member, { ...f.input, ...change }, true),
      ).toThrow();
    expect(f.store.networkOrders.size).toBe(0);
    expect(f.store.organizations.size).toBe(0);
    expect(
      f.networks.invitationQuote({ invite: f.invite }).monthlyNetCents,
    ).toBe(6900);
  });
  it("uses the Giants special price and protects signed prices and administrator-only invoice data", async () => {
    const f = await fixture();
    const legacy = {
      ...f.network,
      slug: "bayer-giants",
      settings: { ...f.network.settings },
    };
    delete legacy.settings.memberMonthlyNetCents;
    expect(pricing(legacy)).toMatchObject({
      monthlyNetCents: 4400,
      annualNetCents: 52800,
      vatCents: 10032,
      grossCents: 62832,
    });
    f.networks.memberPricing(f.owner, f.network.id, { monthlyNetCents: 4400 });
    expect(() => f.orgs.create(f.member, f.input, true)).toThrow(/Preis/);
    f.orgs.create(
      f.member,
      { ...f.input, acceptedMonthlyNetCents: 4400 },
      true,
    );
    const order = [...f.store.networkOrders.values()][0];
    f.networks.memberPricing(f.owner, f.network.id, { monthlyNetCents: 8000 });
    expect(order.monthlyNetCents).toBe(4400);
    expect(() =>
      f.networks.memberPricing(f.member, f.network.id, { monthlyNetCents: 1 }),
    ).toThrow();
    expect(() => f.networks.memberRegistrations(f.member)).toThrow();
    expect(() =>
      f.networks.updateMemberInvoice(f.member, order.id, { paid: true }),
    ).toThrow();
    f.networks.updateMemberInvoice(f.owner, order.id, {
      invoiceSent: true,
      invoiceReference: "2026-001",
      paid: true,
    });
    expect(order.paymentStatus).toBe("paid");
    expect(order.invoiceReference).toBe("2026-001");
    order.serviceEndsAt = new Date(Date.now() + 41 * 86400000).toISOString();
    expect(f.networks.memberRegistrations(f.owner)[0].endingSoon).toBe(true);
    expect(
      f.networks.publicBySlug(f.member, f.network.slug).membershipYear
        ?.endingSoon,
    ).toBe(true);
    order.serviceEndsAt = new Date(Date.now() - 1000).toISOString();
    expect(
      f.networks.publicBySlug(f.member, f.network.slug).enabledModules,
    ).not.toContain("documents");
  });
  it("does not allow the legacy module checkout for a new network", async () => {
    const f = await fixture();
    expect(() => f.networks.order(f.owner, f.network.id, {})).toThrow(
      /separate Modulbuchung/,
    );
    expect(f.store.networkOrders.size).toBe(0);
    expect(annualOrder(f.network, "user", f.input).annualNetCents).toBe(82800);
  });
});
