import { describe, it, expect, vi } from "vitest";
import { PortalStore } from "../core/portal.store";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { NetworksService } from "./networks.service";
import { OrganizationsService } from "../organizations/organizations.service";
describe("operator access and network-wide system notices", () => {
  async function fixture() {
    const store = new PortalStore(),
      email = new EmailService();
    vi.spyOn(email, "sendVerification").mockResolvedValue();
    const auth = new AuthService(store, email),
      networks = new NetworksService(store, auth, email),
      organizations = new OrganizationsService(store, auth, email),
      password = "Sicher-Portal-2026!";
    await auth.ensurePlatformAdmin({
      email: "mk@media-online-innovations.group",
      password,
      firstName: "Martin",
      lastName: "Kelm",
    });
    const owner =
      "Bearer " +
      (
        await auth.login({
          email: "mk@media-online-innovations.group",
          password,
        })
      ).token;
    const network = networks.create(owner, {
        name: "Partnernetzwerk",
        slug: "test-netzwerk",
      }),
      other = networks.create(owner, {
        name: "Anderes Netzwerk",
        slug: "anderes-netzwerk",
      });
    async function member(address: string, role: "member" | "network_admin") {
      const registration = await auth.register({
        email: address,
        password,
        firstName: "Test",
        lastName: "Partner",
      });
      auth.verifyEmail(registration.verificationToken);
      const bearer =
          "Bearer " + (await auth.login({ email: address, password })).token,
        organization = organizations.create(bearer, {
          legalName: "Test GmbH",
          displayName: "Test GmbH",
          role: "buyer",
        });
      networks.addMember(owner, network.id, {
        userId: registration.user.id,
        organizationId: organization.id,
        role,
      });
      return bearer;
    }
    return { store, auth, networks, owner, network, other, member };
  }
  it("opens draft, suspended, expired trial and active networks without memberships, fees or partner notifications", async () => {
    const f = await fixture();
    for (const status of ["draft", "suspended", "trial", "active"] as const) {
      f.network.status = status;
      f.network.trialEndsAt = new Date(0).toISOString();
      expect(f.networks.operatorAccess(f.owner, f.network.id).slug).toBe(
        f.network.slug,
      );
      expect(f.networks.publicBySlug(f.owner, f.network.slug).id).toBe(
        f.network.id,
      );
      expect(f.networks.dashboard(f.owner, f.network.id)).toBeDefined();
    }
    expect(f.store.networkMemberships).toHaveLength(0);
    expect(f.store.networkOrders.size).toBe(0);
    expect(f.store.notifications).toHaveLength(0);
    expect(
      f.store.activities
        .filter((a) => a.type === "operator.network.opened")
        .every((a) => a.visibility === "platform_internal"),
    ).toBe(true);
    expect(f.networks.listMembers(f.owner, f.network.id)).toEqual([]);
  });
  it("shows stored system messages only inside the selected network and reserves publishing and archiving for the platform owner", async () => {
    const f = await fixture(),
      member = await f.member("member@example.de", "member"),
      initiator = await f.member("initiator@example.de", "network_admin");
    f.networks.setAccess(f.owner, f.network.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    const created = f.networks.createSystemMessage(f.owner, f.network.id, {
      title: "Wartungshinweis",
      message: "Das Portal wird heute aktualisiert.",
      severity: "warning",
    });
    const messages = f.networks.systemMessages(member, f.network.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].title).toBe("Wartungshinweis");
    expect(messages[0]).not.toHaveProperty("createdByUserId");
    expect(f.networks.systemMessages(f.owner, f.other.id)).toEqual([]);
    expect(() => f.networks.systemMessages(member, f.other.id)).toThrow();
    for (const bearer of [member, initiator]) {
      expect(() => f.networks.operatorAccess(bearer, f.network.id)).toThrow();
      expect(() =>
        f.networks.createSystemMessage(bearer, f.network.id, {
          title: "Falsch",
          message: "Nicht erlaubt",
        }),
      ).toThrow();
      expect(() =>
        f.networks.archiveSystemMessage(bearer, f.network.id, created.id),
      ).toThrow();
    }
    expect(() =>
      f.networks.archiveSystemMessage(f.owner, f.other.id, created.id),
    ).toThrow();
    const restored = new PortalStore();
    (
      restored as unknown as { hydrate(state: Record<string, unknown>): void }
    ).hydrate(JSON.parse(f.store.snapshot()));
    expect(restored.networkSystemMessages.get(created.id)?.message).toBe(
      "Das Portal wird heute aktualisiert.",
    );
    f.networks.archiveSystemMessage(f.owner, f.network.id, created.id);
    expect(f.networks.systemMessages(member, f.network.id)).toEqual([]);
    expect(f.store.networkSystemMessages.has(created.id)).toBe(true);
    f.networks.remove(f.owner, f.network.id, { confirmSlug: f.network.slug });
    expect(f.store.networkSystemMessages.has(created.id)).toBe(false);
  });
});
