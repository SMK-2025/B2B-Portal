import { describe, expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { hashPassword } from "../auth/password";
import { PortalStore } from "../core/portal.store";
import { NetworksService } from "./networks.service";

describe("network interface text isolation", () => {
  it("allows only the authenticated platform owner, persists one network, rejects stale and unsafe updates, and resets to defaults", async () => {
    const store = new PortalStore();
    const auth = new AuthService(store);
    const service = new NetworksService(store, auth, new EmailService());
    const password = "Sehr-Sicher-2026!";
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
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      store.userByEmail.set(`${id}@example.de`, id);
    }
    const owner = `Bearer ${(await auth.login({ email: "owner@example.de", password })).token}`;
    const member = `Bearer ${(await auth.login({ email: "member@example.de", password })).token}`;
    const a = service.create(owner, { name: "Alpha", slug: "alpha" });
    const b = service.create(owner, { name: "Beta", slug: "beta" });
    service.setAccess(owner, a.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    service.setAccess(owner, b.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    const input = {
      key: "ui.portal.name",
      value: "Unser eigenes Portal",
      revision: 0,
    };
    expect(() => service.saveInterfaceText(undefined, a.id, input)).toThrow();
    expect(() => service.saveInterfaceText(member, a.id, input)).toThrow();
    expect(() => service.ownerInterfaceTexts(member, a.id)).toThrow();
    expect(service.saveInterfaceText(owner, a.id, input).revision).toBe(1);
    expect(service.interfaceTexts("alpha").texts["ui.portal.name"]).toBe(
      "Unser eigenes Portal",
    );
    expect(service.interfaceTexts("beta").texts).toEqual({});
    const snapshot = JSON.parse(store.snapshot());
    expect(JSON.stringify(snapshot)).toContain("Unser eigenes Portal");
    expect(() => service.saveInterfaceText(owner, a.id, input)).toThrow(
      /zwischenzeitlich/,
    );
    expect(() =>
      service.saveInterfaceText(owner, a.id, {
        ...input,
        value: "<script>alert(1)</script>",
        revision: 1,
      }),
    ).toThrow();
    expect(() =>
      service.saveInterfaceText(owner, a.id, {
        ...input,
        key: "__proto__",
        revision: 1,
      }),
    ).toThrow();
    expect(() =>
      service.saveInterfaceText(owner, a.id, {
        ...input,
        value: "x".repeat(4001),
        revision: 1,
      }),
    ).toThrow();
    expect(
      service.saveInterfaceText(owner, a.id, {
        ...input,
        value: null,
        revision: 1,
      }).texts,
    ).toEqual({});
    expect(
      store.activities.some(
        (item) => item.type === "operator.network.text.updated",
      ),
    ).toBe(true);
  });
});
