import { describe, it, expect, vi, afterEach } from "vitest";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { PortalStore } from "../core/portal.store";
import { OrganizationsService } from "../organizations/organizations.service";
import { NetworksService } from "./networks.service";
import { annualOrder, pricing } from "./annual-membership";
describe("personal annual membership billing", () => {
  it("snapshots a five-month season only after explicit consent and supports timely renewal opt-out", async () => {
    const f = await fixture();
    f.networks.memberPricing(f.owner, f.network.id, {
      monthlyNetCents: 6900,
      billing: {
        months: 5,
        freeUntil: "2027-01-31",
        paidFrom: "2027-02-01",
        paidThrough: "2027-06-30",
        autoRenew: true,
        renewalMonths: 12,
        automaticInvoices: true,
      },
    });
    const version = f.network.settings.memberBilling!.version;
    expect(pricing(f.network)).toMatchObject({
      months: 5,
      annualNetCents: 34500,
      grossCents: 41055,
    });
    expect(() => f.orgs.create(f.member, f.input, true)).toThrow();
    f.orgs.create(
      f.member,
      {
        ...f.input,
        acceptedBillingVersion: version,
        renewalAccepted: true,
        pdfInvoiceAccepted: true,
      },
      true,
    );
    const order = [...f.store.networkOrders.values()][0];
    expect(order.minimumTermMonths).toBe(5);
    expect(order.billingPolicy).toMatchObject({
      version,
      invoiceDate: "2027-01-16",
      paymentDueDate: "2027-01-30",
      renewalDeadline: "2027-06-15",
      renewalInvoiceDate: "2027-06-16",
      autoRenew: true,
    });
    expect(order.serviceEndsAt).toBe("2027-06-30T22:00:00.000Z");
    f.networks.changeRenewal(f.member, f.network.id, order.id, {
      enabled: false,
    });
    expect(order.billingPolicy?.renewalDisabledAt).toBeTruthy();
    expect(() =>
      f.networks.changeRenewal(f.owner, f.network.id, order.id, {
        enabled: true,
      }),
    ).toThrow();
    f.networks.memberPricing(f.owner, f.network.id, { monthlyNetCents: 8000 });
    expect(order.monthlyNetCents).toBe(6900);
    expect(order.grossCents).toBe(41055);
  });
  afterEach(() => vi.unstubAllEnvs());
  it("publishes or withdraws an event in the same save without partial writes or member escalation", async () => {
    vi.stubEnv("PUBLIC_HOMEPAGE_MEDIA_ORIGIN", "https://api.example.test");
    const f = await fixture();
    f.orgs.create(f.member, f.input, true);
    f.store.networkBySlug.delete(f.network.slug);
    f.network.slug = "unternehmerfreunde";
    f.store.networkBySlug.set(f.network.slug, f.network.id);
    const input = {
      type: "event",
      title: "Gemeinsames Frühstück",
      description: "Wir lernen uns kennen.",
      status: "published",
      visibility: "members",
      startsAt: "2026-10-10T08:00:00Z",
      endsAt: "2026-10-10T10:00:00Z",
      homepagePublish: true,
      data: {
        category: "Netzwerkveranstaltung",
        timezone: "Europe/Berlin",
        publicLocation: "Wiehl",
        organizer: "Unternehmerfreunde",
        participationTerms: "Anmeldung erforderlich",
        cost: "Kostenfrei",
        eventStatus: "scheduled",
        imageUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
      },
    };
    const before = f.store.networkContents.size;
    expect(() =>
      f.networks.createContent(f.member, f.network.id, input),
    ).toThrow();
    expect(f.store.networkContents.size).toBe(before);
    expect(() =>
      f.networks.createContent(f.owner, f.network.id, {
        ...input,
        startsAt: null,
      }),
    ).toThrow();
    expect(f.store.networkContents.size).toBe(before);
    const event = f.networks.createContent(f.owner, f.network.id, input);
    expect(event.homepageGrants?.events?.enabled).toBe(true);
    expect(() =>
      f.networks.updateContent(f.owner, f.network.id, event.id, {
        title: "Nicht gespeichert",
        homepagePublish: true,
        startsAt: null,
      }),
    ).toThrow();
    expect(f.store.networkContents.get(event.id)?.title).toBe(input.title);
    const revoked = f.networks.updateContent(f.owner, f.network.id, event.id, {
      homepagePublish: false,
    });
    expect(revoked.homepageGrants?.events?.enabled).toBe(false);
    expect(revoked.homepageGrants?.recaps).toBeUndefined();
    f.networks.updateContent(f.owner, f.network.id, event.id, {
      visibility: "administrators",
    });
    const published = f.networks.updateContent(
      f.owner,
      f.network.id,
      event.id,
      {
        visibility: "members",
        homepagePublish: true,
        data: { publicLocation: "Wiehl, Restaurant" },
      },
    );
    expect(published.visibility).toBe("members");
    expect(published.homepageGrants?.events?.enabled).toBe(true);
    expect(published.data.imageUrl).toBe(input.data.imageUrl);
    expect(published.data.organizer).toBe(input.data.organizer);
    expect(published.data.cost).toBe(input.data.cost);
    const minimal = f.networks.createContent(f.owner, f.network.id, {
      ...input,
      data: { category: "Netzwerkveranstaltung" },
    });
    expect(minimal.homepageGrants?.events?.enabled).toBe(true);
  });
  it("registers centrally funded members without personal billing and keeps individual networks unchanged", async () => {
    const f = await fixture();
    const central = f.networks.create(f.owner, {
      name: "Zentrales Netzwerk",
      slug: "zentrales-netzwerk",
      memberPaymentModel: "network",
    });
    expect(central.status).toBe("draft");
    f.networks.setAccess(f.owner, central.id, { status: "active" });
    const link = f.networks.sharedInvitation(f.owner, central.id, {
      confirmName: central.name,
      confirmAgain: central.name,
    });
    const personal = f.networks.resolveSharedInvitation({
      invite: new URL(link.path, "https://example.de").searchParams.get(
        "invite",
      )!,
      email: "partner@example.de",
    });
    const quote = f.networks.invitationQuote({ invite: personal.invite });
    expect(quote.memberPaymentModel).toBe("network");
    expect(quote).not.toHaveProperty("grossCents");
    const input = {
      networkInviteToken: personal.invite,
      legalName: "Zentral GmbH",
      displayName: "Zentral GmbH",
      termsAccepted: true,
    };
    expect(() =>
      f.orgs.create(f.member, { ...input, termsAccepted: false }, true),
    ).toThrow();
    f.orgs.create(f.member, input, true);
    expect(f.store.networkOrders.size).toBe(0);
    expect(
      f.store.networkMemberships.find((m) => m.networkId === central.id)
        ?.centrallyFunded,
    ).toBe(true);
    expect(
      f.networks.publicBySlug(f.member, central.slug).enabledModules,
    ).toContain("documents");
    expect(
      f.networks.adminList(f.owner).find((n) => n.id === central.id)
        ?.centrallyFundedMembers,
    ).toBe(1);
    expect(
      f.networks.adminUsers(f.owner, central.id).users[0].centrallyFunded,
    ).toBe(true);
    expect(() =>
      f.orgs.create(f.member, { ...input, networkInviteToken: f.invite }, true),
    ).toThrow();
    expect(
      f.networks.invitationQuote({ invite: f.invite }).monthlyNetCents,
    ).toBe(6900);
  });
  it("reuses a verified account for another invitation only with its correct password", async () => {
    const f = await fixture();
    const count = f.store.users.size;
    await expect(
      f.auth.register(
        {
          email: "partner@example.de",
          password: "wrong-password",
          networkInviteToken: f.invite,
        },
        true,
      ),
    ).rejects.toThrow();
    const result = await f.auth.register(
      {
        email: "partner@example.de",
        password: "Sicher-Portal-2026!",
        networkInviteToken: f.invite,
      },
      true,
    );
    expect(result.verificationRequired).toBe(false);
    expect("token" in result && result.token).toBeTruthy();
    expect(f.store.users.size).toBe(count);
    f.orgs.create(f.member, f.input, true);
    const second = f.networks.create(f.owner, {
      name: "Zweites Netzwerk",
      slug: "zweites-netzwerk",
    });
    f.networks.setAccess(f.owner, second.id, { status: "active" });
    const link = f.networks.sharedInvitation(f.owner, second.id, {
      confirmName: second.name,
      confirmAgain: second.name,
    });
    const shared = new URL(link.path, "https://example.de").searchParams.get(
      "invite",
    )!;
    const personal = f.networks.resolveSharedInvitation({
      invite: shared,
      email: "partner@example.de",
    });
    const secondLogin = await f.auth.register(
      {
        email: "partner@example.de",
        password: "Sicher-Portal-2026!",
        networkInviteToken: personal.invite,
      },
      true,
    );
    f.orgs.create(
      `Bearer ${"token" in secondLogin ? secondLogin.token : ""}`,
      { ...f.input, networkInviteToken: personal.invite },
      true,
    );
    expect(f.networks.mine(f.member)).toHaveLength(2);
    expect(
      new Set(
        f.store.networkMemberships
          .filter((m) => m.userId === f.registered.user.id)
          .map((m) => m.organizationId),
      ).size,
    ).toBe(2);
    expect(f.store.users.size).toBe(count);
    await expect(
      f.auth.register(
        {
          email: "partner@example.de",
          password: "Sicher-Portal-2026!",
          networkInviteToken: f.invite,
        },
        true,
      ),
    ).rejects.toThrow();
  });
  it("saves editable onepager sections and hero as a draft without publishing or changing other networks", async () => {
    const f = await fixture();
    f.orgs.create(f.member, f.input, true);
    const sections = [
      { title: "Zusammenarbeit", body: "So unterstützen wir unsere Partner." },
      { title: "Unser Vorgehen", body: "Persönlich und transparent." },
    ];
    const result = f.networks.updateOwnProfile(f.member, f.network.id, {
      sections,
      heroImageUrl: "data:image/png;base64,YWJj",
      publish: false,
    });
    expect(result.sections).toEqual(sections);
    expect(result.status).toBe("draft");
    expect(result.heroImageUrl).toContain("data:image/png");
    expect(() =>
      f.networks.updateOwnProfile(f.member, f.network.id, {
        sections: [{ title: "", body: "Text" }],
        publish: false,
      }),
    ).toThrow();
    expect(() =>
      f.networks.updateOwnProfile(f.member, f.network.id, {
        heroImageUrl: "javascript:alert(1)",
        publish: false,
      }),
    ).toThrow();
    expect(
      f.networks.ownProfile(f.member, f.network.id).profile?.sections,
    ).toEqual(sections);
  });
  it("provides a network-bound reusable partner link and exchanges it for an email-bound invitation", async () => {
    const f = await fixture();
    expect(() =>
      f.networks.sharedInvitation(f.member, f.network.id, {
        confirmName: f.network.name,
        confirmAgain: f.network.name,
      }),
    ).toThrow();
    expect(() =>
      f.networks.sharedInvitation(f.owner, f.network.id, {
        confirmName: f.network.name,
        confirmAgain: "wrong",
      }),
    ).toThrow();
    const link = f.networks.sharedInvitation(f.owner, f.network.id, {
      confirmName: f.network.name,
      confirmAgain: f.network.name,
    });
    const token = new URL(link.path, "https://example.de").searchParams.get(
      "invite",
    )!;
    const personal = f.networks.resolveSharedInvitation({
      invite: token,
      email: "newpartner@example.de",
    });
    expect(personal.invite).not.toBe(token);
    await expect(
      f.auth.register(
        {
          email: "other@example.de",
          password: "Sicher-Portal-2026!",
          firstName: "Test",
          lastName: "Partner",
          networkInviteToken: personal.invite,
        },
        true,
      ),
    ).rejects.toThrow();
    const registered = await f.auth.register(
      {
        email: "newpartner@example.de",
        password: "Sicher-Portal-2026!",
        firstName: "Neuer",
        lastName: "Partner",
        networkInviteToken: personal.invite,
      },
      true,
    );
    expect(registered.user.email).toBe("newpartner@example.de");
    expect(
      f.networks.invitationQuote({ invite: personal.invite }).networkSlug,
    ).toBe(f.network.slug);
    expect(
      f.networks.resolveSharedInvitation({
        invite: token,
        email: "second@example.de",
      }).invite,
    ).not.toBe(personal.invite);
  });
  it("supports multiple free admins without partner pages and scopes suspension and payment actions", async () => {
    const f = await fixture();
    f.orgs.create(f.member, f.input, true);
    const order = [...f.store.networkOrders.values()][0];
    await expect(
      f.networks.adminUserAction(f.member, f.network.id, {
        email: "partner@example.de",
        action: "suspend",
      }),
    ).rejects.toThrow();
    await f.networks.adminUserAction(f.owner, f.network.id, {
      email: "partner@example.de",
      action: "role",
      role: "network_admin",
    });
    expect(() => f.networks.ownProfile(f.member, f.network.id)).toThrow(
      /keine eigene Partnerseite/,
    );
    expect(f.networks.listMembers(f.owner, f.network.id)).toHaveLength(0);
    await f.auth.register({
      email: "admin2@example.de",
      password: "Sicher-Portal-2026!",
      firstName: "Zweiter",
      lastName: "Admin",
    });
    await f.networks.appointAdministrator(f.owner, f.network.id, {
      email: "admin2@example.de",
    });
    expect(
      f.store.networkMemberships.filter(
        (m) => m.networkId === f.network.id && m.role === "network_admin",
      ),
    ).toHaveLength(2);
    await f.networks.adminUserAction(f.owner, f.network.id, {
      email: "partner@example.de",
      action: "paid",
      orderId: order.id,
    });
    expect(order.paymentStatus).toBe("paid");
    await f.networks.adminUserAction(f.owner, f.network.id, {
      email: "partner@example.de",
      action: "suspend",
    });
    expect(() => f.networks.publicBySlug(f.member, f.network.slug)).toThrow();
    expect(f.store.networkOrders.get(order.id)).toBe(order);
  });
  it("lists unfinished invited registrations and billed members only for the owner and selected network", async () => {
    const f = await fixture();
    const before = f.networks.adminUsers(f.owner, f.network.id).users;
    expect(before).toHaveLength(1);
    expect(before[0]).toMatchObject({
      email: "partner@example.de",
      status: "Registriert – Buchung offen",
      profile: "Nicht angelegt",
      startsAt: null,
    });
    expect(() => f.networks.adminUsers(f.member, f.network.id)).toThrow();
    f.orgs.create(f.member, f.input, true);
    const after = f.networks.adminUsers(f.owner, f.network.id).users;
    expect(after).toHaveLength(1);
    expect(after[0].startsAt).toBeTruthy();
    expect(after[0].status).toBe("active");
    const other = f.networks.create(f.owner, {
      name: "Anderes Netzwerk",
      slug: "nutzer-anders",
    });
    expect(f.networks.adminUsers(f.owner, other.id).users).toEqual([]);
  });
  it("stores home texts per network and forbids changes by ordinary members", async () => {
    const f = await fixture();
    const texts = {
      welcomeTitle: "Gemeinsam erfolgreich",
      welcomeIntro: "Unser Partnerkreis",
      bannerTitle: "Willkommen",
      bannerDescription: "Kontakte und Chancen",
      bannerImageUrl: "data:image/png;base64,aGVsbG8=",
    };
    f.networks.updateSettings(f.owner, f.network.id, texts);
    expect(
      f.networks.publicBySlug(f.owner, f.network.slug).settings,
    ).toMatchObject(texts);
    expect(() =>
      f.networks.updateSettings(f.member, f.network.id, {
        welcomeTitle: "Fremder Text",
      }),
    ).toThrow();
    const other = f.networks.create(f.owner, {
      name: "Anderes Netzwerk",
      slug: "anderes-textnetzwerk",
    });
    expect(other.settings.welcomeTitle).toBeUndefined();
    expect(other.settings.bannerImageUrl).toBeUndefined();
    expect(() =>
      f.networks.updateSettings(f.member, f.network.id, {
        bannerImageUrl: null,
      }),
    ).toThrow();
    expect(() =>
      f.networks.updateSettings(f.owner, f.network.id, {
        bannerImageUrl: "javascript:alert(1)",
      }),
    ).toThrow();
    f.networks.updateSettings(f.owner, f.network.id, { bannerImageUrl: null });
    expect(f.network.settings.bannerImageUrl).toBeNull();
    f.networks.updateSettings(f.owner, f.network.id, { welcomeTitle: "  " });
    expect(f.network.settings.welcomeTitle).toBeNull();
    expect(() =>
      f.networks.updateSettings(f.owner, f.network.id, {
        bannerTitle: "x".repeat(161),
      }),
    ).toThrow();
  });
  it("shows successful portal logins only to the platform owner", async () => {
    const f = await fixture();
    const first = f.networks.adminUsers(f.owner, f.network.id).users[0];
    expect(first.loginCount).toBe(1);
    expect(first.lastLoginAt).toBeTruthy();
    await expect(
      f.auth.login({ email: "partner@example.de", password: "incorrect" }),
    ).rejects.toThrow();
    expect(
      f.networks.adminUsers(f.owner, f.network.id).users[0].loginCount,
    ).toBe(1);
    await f.auth.login({
      email: "partner@example.de",
      password: "Sicher-Portal-2026!",
    });
    const next = f.networks.adminUsers(f.owner, f.network.id).users[0];
    expect(next.loginCount).toBe(2);
    expect(next.loginTrackingStartedAt).toBe(first.loginTrackingStartedAt);
    expect(next.lastLoginAt! >= first.lastLoginAt!).toBe(true);
    expect(() => f.networks.adminUsers(f.member, f.network.id)).toThrow();
    const snapshot = JSON.parse(f.store.snapshot());
    expect(JSON.stringify(snapshot)).toContain('"loginCount":2');
  });
  it("creates a network-scoped read-only visitor without an organization or charge", async () => {
    const f = await fixture();
    const account = await f.networks.createVisitor(f.owner, f.network.id, {
      email: "b04-besucher@b2b-matching.de",
    });
    const login = await f.auth.login({
      email: account.email,
      password: account.password,
    });
    const authorization = `Bearer ${login.token}`;
    expect(
      f.networks.publicBySlug(authorization, f.network.slug).enabledModules,
    ).toContain("profiles");
    expect(
      f.networks
        .adminUsers(f.owner, f.network.id)
        .users.find((u) => u.email === account.email),
    ).toMatchObject({ role: "visitor", loginCount: 1, startsAt: null });
    expect(f.store.memberships.some((m) => m.userId === login.user.id)).toBe(
      false,
    );
    expect(
      f.networks
        .listMembers(authorization, f.network.id)
        .some((m) => m.userId === login.user.id),
    ).toBe(false);
    expect(() =>
      f.networks.updateSettings(authorization, f.network.id, {
        name: "Changed",
      }),
    ).toThrow();
    const other = f.networks.create(f.owner, {
      name: "Other",
      slug: "visitor-other",
    });
    expect(() => f.networks.publicBySlug(authorization, other.slug)).toThrow();
    await expect(
      f.networks.createVisitor(f.owner, f.network.id, { email: account.email }),
    ).rejects.toThrow();
    await expect(
      f.networks.createVisitor(f.member, f.network.id, {
        email: "forbidden@example.de",
      }),
    ).rejects.toThrow();
  });
  it("keeps connection requests private, deduplicated and separate from chat", async () => {
    const f = await fixture();
    const first = [...f.store.users.values()].find(
      (u) => u.email === "partner@example.de",
    )!;
    const second = {
      ...first,
      id: "second-partner",
      email: "second@example.de",
      firstName: "Robin",
    };
    f.store.users.set(second.id, second);
    f.store.userByEmail.set(second.email, second.id);
    const membership = f.store.networkMemberships.find(
      (m) => m.userId === first.id,
    );
    // Fixture's member starts at the billing step; grant active test access only.
    if (membership) membership.status = "active";
    else
      f.store.networkMemberships.push({
        id: "first-test",
        userId: first.id,
        organizationId: "",
        networkId: f.network.id,
        role: "member",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        invitedByUserId: null,
        reviewedByUserId: null,
        reviewedAt: null,
      });
    f.store.networkMemberships.push({
      ...f.store.networkMemberships.find((m) => m.userId === first.id)!,
      id: "second-test",
      userId: second.id,
    });
    const peer = `Bearer ${(await f.auth.login({ email: second.email, password: "Sicher-Portal-2026!" })).token}`;
    const request = f.networks.requestConnection(f.member, f.network.id, {
      recipientId: second.id,
    });
    expect(
      f.networks.requestConnection(peer, f.network.id, {
        recipientId: first.id,
      }).id,
    ).toBe(request.id);
    expect(f.networks.connections(f.owner, f.network.id)).toEqual([]);
    expect(
      f.networks
        .networkNotifications(peer, f.network.id)
        .some((n) => n.data.connectionId === request.id),
    ).toBe(true);
    expect(() =>
      f.networks.decideConnection(f.member, f.network.id, request.id, {
        status: "accepted",
      }),
    ).toThrow();
    expect(
      f.networks.decideConnection(peer, f.network.id, request.id, {
        status: "accepted",
      }).status,
    ).toBe("accepted");
    expect(f.store.networkConnections.size).toBe(1);
    expect(f.store.conversations.size).toBe(0);
    expect(() =>
      f.networks.requestConnection(f.member, f.network.id, {
        recipientId: first.id,
      }),
    ).toThrow();
    expect(f.store.snapshot()).toContain('"networkConnections"');
  });
  it("copies a published partner to another network with free independent access", async () => {
    const f = await fixture();
    f.orgs.create(f.member, f.input, true);
    const user = [...f.store.users.values()].find(
      (u) => u.email === "partner@example.de",
    )!;
    const source = f.store.networkMemberships.find(
      (m) => m.userId === user.id,
    )!;
    const organization = f.store.organizations.get(source.organizationId)!;
    organization.networkProfile = {
      companyName: "Original",
      status: "published",
      heroImageUrl: "data:image/png;base64,aA==",
    } as any;
    const target = f.networks.create(f.owner, {
      name: "Giants test",
      slug: "giants-copy-test",
    });
    f.networks.setAccess(f.owner, target.id, { status: "active" });
    expect(() =>
      f.networks.copyPartner(f.member, target.id, {
        email: user.email,
        sourceSlug: f.network.slug,
      }),
    ).toThrow();
    f.networks.copyPartner(f.owner, target.id, {
      email: user.email,
      sourceSlug: f.network.slug,
    });
    const copied = f.store.networkMemberships.find(
      (m) => m.userId === user.id && m.networkId === target.id,
    )!;
    expect(copied).toMatchObject({
      role: "member",
      status: "active",
      complimentaryAccess: true,
    });
    expect(copied.organizationId).not.toBe(source.organizationId);
    expect(
      f.networks.publicBySlug(f.member, target.slug).enabledModules,
    ).toContain("profiles");
    const profile = f.store.organizations.get(
      copied.organizationId,
    )!.networkProfile!;
    expect(profile).toEqual(organization.networkProfile);
    expect(copied.homepageGrants).toBeUndefined();
    const central = f.networks.create(f.owner, {
      name: "Central copy",
      slug: "central-copy",
      memberPaymentModel: "network",
    });
    f.networks.setAccess(f.owner, central.id, { status: "active" });
    f.networks.copyPartner(f.owner, central.id, {
      email: user.email,
      sourceSlug: f.network.slug,
    });
    const centralCopy = f.store.networkMemberships.find(
      (m) => m.networkId === central.id && m.userId === user.id,
    )!;
    expect(centralCopy.centrallyFunded).toBe(true);
    expect(centralCopy.homepageGrants).toBeUndefined();
    profile.companyName = "Independent";
    expect(organization.networkProfile!.companyName).toBe("Original");
    expect(() =>
      f.networks.copyPartner(f.owner, target.id, {
        email: user.email,
        sourceSlug: f.network.slug,
      }),
    ).toThrow();
    expect(
      [...f.store.networkOrders.values()].filter(
        (o) => o.networkId === target.id,
      ),
    ).toHaveLength(0);
  });
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
  it("continues a verified invite through billing without granting premature access", async () => {
    const f = await fixture();
    expect(f.networks.claimInitiatorInvitation(f.member).claimed).toBe(false);
    expect(f.networks.mine(f.member)).toEqual([]);
    expect(f.networks.invitationQuote({ invite: f.invite }).initiator).toBe(
      false,
    );
    expect(() =>
      f.orgs.create(f.member, { ...f.input, invoiceStreet: "" }, true),
    ).toThrow();
    expect(f.networks.mine(f.member)).toEqual([]);
    expect(f.store.networkOrders.size).toBe(0);
    f.orgs.create(f.member, f.input, true);
    expect(f.networks.mine(f.member)).toHaveLength(1);
    expect(f.networks.memberRegistrations(f.owner)).toHaveLength(1);
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
