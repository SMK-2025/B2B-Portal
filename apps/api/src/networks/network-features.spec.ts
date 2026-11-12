import { describe, it, expect, vi } from "vitest";
import { PortalStore } from "../core/portal.store";
import { NetworksService } from "./networks.service";
import { featureEnabled, networkFeatures } from "./network-features";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { HomepagePublicationController } from "./homepage-publication.controller";

function fixture() {
  const store = new PortalStore(),
    now = new Date().toISOString();
  for (const [id, role] of [
    ["owner", "platform_admin"],
    ["initiator", "user"],
    ["member", "user"],
    ["other", "user"],
  ] as const) {
    store.users.set(id, {
      id,
      email: id + "@example.invalid",
      passwordHash: "unused",
      firstName: id,
      lastName: "Test",
      accountRole: role,
      emailVerifiedAt: now,
      createdAt: now,
    });
  }
  const auth = {
    authenticate: (token: string) => {
      const user = store.users.get(token);
      if (!user) throw Error("Unauthenticated");
      return user;
    },
  } as unknown as AuthService;
  const email = { send: vi.fn() } as unknown as EmailService;
  const service = new NetworksService(store, auth, email);
  const a = service.create("owner", { name: "Netzwerk A", slug: "test-a" });
  const b = service.create("owner", { name: "Netzwerk B", slug: "test-b" });
  for (const network of [a, b])
    service.setAccess("owner", network.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
  for (const [network, id, role] of [
    [a, "initiator", "network_admin"],
    [a, "member", "organization_admin"],
    [b, "other", "network_admin"],
  ] as const) {
    store.networkMemberships.push({
      id: network.id + id,
      networkId: network.id,
      userId: id,
      organizationId: id,
      role,
      status: "active",
      invitedByUserId: "owner",
      createdAt: now,
      updatedAt: now,
    } as any);
  }
  const persist = vi.spyOn(store, "persist").mockResolvedValue(undefined);
  return { store, service, a, b, persist, email, auth };
}

describe("network feature switches", () => {
  it("keeps public homepage feeds off until enabled and withdraws them immediately", async () => {
    const {service,store,auth,a,b}=fixture();
    const homepage=new HomepagePublicationController(store,auth);
    expect(()=>homepage.feed(a.slug,{})).toThrow();
    await service.updateFeatures("initiator",a.id,{revision:0,features:{publicHomepage:true}});
    expect(homepage.feed(a.slug,{})).toMatchObject({network:a.slug,members:[],events:[],recaps:[]});
    expect(()=>homepage.feed(b.slug,{})).toThrow();
    await service.updateFeatures("initiator",a.id,{revision:1,features:{publicHomepage:false}});
    expect(()=>homepage.feed(a.slug,{})).toThrow();
  });
  it("preserves defaults and sports/homepage exceptions without changing other networks", async () => {
    const { service, a, b, persist } = fixture();
    expect(service.features("initiator", a.id).enabled).toMatchObject({
      chat: true,
      events: true,
      pulse: true,
      sports: false,
      publicHomepage: false,
    });
    await service.updateFeatures("initiator", a.id, {
      revision: 0,
      features: { events: false, pulse: false },
    });
    expect(service.features("initiator", a.id).enabled).toMatchObject({
      events: false,
      recaps: false,
      pulse: false,
      chat: true,
    });
    expect(service.features("owner", b.id).enabled.events).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
    expect(
      featureEnabled(
        { ...a, slug: "bayer04leverkusen", settings: {} as any },
        "sports",
      ),
    ).toBe(true);
  });
  it("allows initiators, rejects members and administrators of a different network", async () => {
    const { service, a } = fixture();
    for (const token of ["member", "other"]) {
      expect(() => service.features(token, a.id)).toThrow();
      await expect(
        service.updateFeatures(token, a.id, {
          revision: 0,
          features: { chat: false },
        }),
      ).rejects.toThrow();
    }
  });
  it("validates input before mutation and detects concurrent edits", async () => {
    const { service, a } = fixture();
    await expect(
      service.updateFeatures("initiator", a.id, {
        revision: 0,
        features: { events: false, chat: "false" },
      }),
    ).rejects.toThrow();
    expect(service.features("owner", a.id).enabled.events).toBe(true);
    await expect(
      service.updateFeatures("owner", a.id, {
        revision: 0,
        features: { unknown: true },
      }),
    ).rejects.toThrow();
    await service.updateFeatures("initiator", a.id, {
      revision: 0,
      features: { events: false },
    });
    await expect(
      service.updateFeatures("owner", a.id, {
        revision: 0,
        features: { events: true },
      }),
    ).rejects.toThrow(/zwischenzeitlich/);
  });
  it("blocks direct API access while retaining data and restores access on reactivation", async () => {
    const { service, store, a } = fixture();
    const record = service.createContent("initiator", a.id, {
      type: "event",
      title: "Testtreffen",
      description: "Ein Treffen",
      visibility: "members",
      status: "published",
      data: { category: "Netzwerkveranstaltung" },
    });
    await service.updateFeatures("initiator", a.id, {
      revision: 0,
      features: {
        events: false,
        chat: false,
        pulse: false,
        cooperationRevenue: false,
        connections: false,
        referrals: false,
        pagePilot: false,
      },
    });
    expect(() => service.listContent("member", a.id, "event")).toThrow();
    expect(() =>
      service.updateOwnAttendance("member", a.id, record.id, {
        status: "attending",
      }),
    ).toThrow();
    expect(() => service.pulse("member", a.id)).toThrow();
    expect(() => service.pulseRevenue("member", a.id)).toThrow();
    expect(() => service.connections("member", a.id)).toThrow();
    await expect(service.referral("member", a.id, {})).rejects.toThrow();
    await expect(
      service.importOwnProfile("member", a.id, {
        consent: true,
        websiteUrl: "https://example.invalid",
      }),
    ).rejects.toThrow();
    expect(store.networkContents.has(record.id)).toBe(true);
    await service.updateFeatures("initiator", a.id, {
      revision: 1,
      features: { events: true },
    });
    expect(
      service
        .listContent("member", a.id, "event")
        .some((item) => item.id === record.id),
    ).toBe(true);
  });
  it("keeps sport independent from events and rejects unsupported sources", async () => {
    const { service, a } = fixture();
    await expect(
      service.updateFeatures("owner", a.id, {
        revision: 0,
        features: { sports: true },
      }),
    ).rejects.toThrow(/auswählen/);
    await expect(
      service.updateFeatures("owner", a.id, {
        revision: 0,
        features: { sports: true },
        sportSelection: "http://localhost",
      }),
    ).rejects.toThrow(/nicht unterstützt/);
    await service.updateFeatures("initiator", a.id, {
      revision: 0,
      features: { sports: true, events: false },
      sportSelection: "bayer-giants",
    });
    expect(service.proBSchedule("member", a.id).teamName).toBe("Bayer Giants");
    await service.updateFeatures("initiator", a.id, {
      revision: 1,
      features: { sports: false },
    });
    expect(() => service.proBSchedule("member", a.id)).toThrow();
  });
  it("serializes each network's choices and retains dependency choices", async () => {
    const { service, store, a, b } = fixture();
    await service.updateFeatures("owner", a.id, {
      revision: 0,
      features: { chat: false, pulse: true },
    });
    const serialized = JSON.parse(store.snapshot());
    expect(JSON.stringify(serialized)).toContain('"featureRevision":1');
    expect(networkFeatures(store.networks.get(a.id)!).pulse).toBe(false);
    await service.updateFeatures("owner", a.id, {
      revision: 1,
      features: { chat: true },
    });
    expect(networkFeatures(store.networks.get(a.id)!).pulse).toBe(true);
    expect(store.networks.get(b.id)!.settings.features).toBeUndefined();
  });
});
