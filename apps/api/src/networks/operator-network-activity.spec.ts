import { describe, expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { hashPassword } from "../auth/password";
import { PortalStore } from "../core/portal.store";
import { NetworksService } from "./networks.service";

describe("operator network activity overview", () => {
  it("isolates networks, keeps pending requests visible, excludes private conversations and enforces owner-only access", async () => {
    const store = new PortalStore(),
      auth = new AuthService(store),
      service = new NetworksService(store, auth, new EmailService());
    const password = "Sehr-Sicher-2026!",
      date = new Date(Date.now() - 10000).toISOString();
    for (const [id, role] of [
      ["owner", "platform_admin"],
      ["member", "user"],
    ] as const) {
      store.users.set(id, {
        id,
        email: `${id}@example.de`,
        passwordHash: await hashPassword(password),
        firstName: id,
        lastName: "Test",
        accountRole: role,
        emailVerifiedAt: date,
        createdAt: date,
      });
      store.userByEmail.set(`${id}@example.de`, id);
    }
    const owner = `Bearer ${(await auth.login({ email: "owner@example.de", password })).token}`;
    const member = `Bearer ${(await auth.login({ email: "member@example.de", password })).token}`;
    const a = service.create(owner, { name: "Alpha", slug: "alpha" });
    const b = service.create(owner, { name: "Beta", slug: "beta" });
    const content = {
      networkId: a.id,
      type: "event" as const,
      title: "Frühstück",
      description: "",
      status: "published" as const,
      createdByUserId: "member",
      assignedToUserId: null,
      startsAt: null,
      endsAt: null,
      visibility: "members" as const,
      data: {},
      createdAt: date,
      updatedAt: date,
    };
    store.networkContents.set("event", { ...content, id: "event" });
    store.networkContents.set("private", {
      ...content,
      id: "private",
      type: "conversation",
      title: "PRIVATE MESSAGE",
    });
    store.networkContents.set("other", {
      ...content,
      id: "other",
      networkId: b.id,
      title: "OTHER NETWORK",
    });
    store.networkContents.set("request", {
      ...content,
      id: "request",
      type: "announcement",
      data: {
        admissionStatus: "pending",
        company: "Neue GmbH",
        kind: "network_invitation",
        inviteTokenHash: "SECRET",
      },
    });
    expect(() => service.operatorNetworkActivity(member, a.id)).toThrow();
    expect(() =>
      service.markOperatorNetworkActivitySeen(member, a.id, { asOf: date }),
    ).toThrow();
    const first = service.operatorNetworkActivity(owner, a.id);
    expect(first.items).toHaveLength(2);
    expect(first.pendingCount).toBe(1);
    expect(first.unreadCount).toBe(2);
    expect(JSON.stringify(first)).not.toMatch(
      /PRIVATE MESSAGE|OTHER NETWORK|SECRET/,
    );
    const seen = service.markOperatorNetworkActivitySeen(owner, a.id, {
      asOf: first.asOf,
    });
    expect(seen.unreadCount).toBe(1);
    expect(seen.pendingCount).toBe(1);
    expect(service.operatorNetworkActivity(owner, b.id).unreadCount).toBe(1);
    expect(() =>
      service.markOperatorNetworkActivitySeen(owner, a.id, {
        asOf: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).toThrow();
    expect(JSON.stringify(JSON.parse(store.snapshot()))).toContain(
      "operatorNetworkSeenAt",
    );
    expect(
      service.adminList(owner).find((n) => n.id === a.id)?.activitySummary
        .pendingCount,
    ).toBe(1);
    store.networkContents.get("request")!.data.admissionStatus = "approved";
    expect(service.operatorNetworkActivity(owner, a.id).unreadCount).toBe(0);
  });
});
