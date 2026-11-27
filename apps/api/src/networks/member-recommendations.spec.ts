import { describe, it, expect, vi } from "vitest";
import { PortalStore } from "../core/portal.store";
import type { NetworkContentRecord } from "../core/domain";
import {
  createRecommendation,
  respondRecommendation,
  recommendations,
  recommendationPulse,
  recommendationRows,
} from "./member-recommendations";
import { NetworksService } from "./networks.service";
function fixture() {
  const store = new PortalStore(),
    now = new Date().toISOString();
  store.networks.set("n", {
    id: "n",
    slug: "test",
    name: "Test",
    status: "active",
    settings: {},
    enabledModules: ["communication", "analytics"],
    offeredModules: ["communication", "analytics"],
  } as never);
  for (const id of ["a", "b", "c"]) {
    store.users.set(id, {
      id,
      firstName: id,
      lastName: "Test",
      accountRole: "user",
      email: `${id}@test.invalid`,
    } as never);
    store.organizations.set(`o${id}`, {
      id: `o${id}`,
      displayName: `Firma ${id}`,
    } as never);
    store.networkMemberships.push({
      id: `m${id}`,
      networkId: "n",
      userId: id,
      organizationId: `o${id}`,
      status: "active",
      role: id === "c" ? "network_admin" : "member",
      complimentaryAccess: true,
    } as never);
  }
  const record: NetworkContentRecord = {
    id: "chat",
    networkId: "n",
    type: "conversation",
    title: "PRIVATE CHAT",
    description: "PRIVATE DESCRIPTION",
    createdByUserId: "a",
    assignedToUserId: null,
    startsAt: null,
    endsAt: null,
    visibility: "members",
    status: "published",
    createdAt: now,
    updatedAt: now,
    data: {
      category: "Sonstiger Austausch",
      directChat: true,
      participantUserIds: ["a", "b"],
      messages: [],
    },
  };
  store.networkContents.set("chat", record);
  const input = {
    company: "SECRET COMPANY",
    contact: "SECRET CONTACT",
    email: "secret@example.org",
    phone: "+49 221 12345",
    description: "SECRET PROBLEM",
    sharingConfirmed: true,
  };
  const auth = {
    authenticate: (token: string) => {
      const user = store.users.get(token);
      if (!user) throw Error("auth");
      return user;
    },
  };
  const service = new NetworksService(store, auth as never, {} as never);
  vi.spyOn(store, "persist").mockResolvedValue();
  return { store, record, input, service };
}
describe("member recommendations", () => {
  it("cannot overwrite recommendations through generic content edits", () => {
    const { store, record, input, service } = fixture();
    const entry = createRecommendation(store, record, "a", input);
    service.updateContent("a", "n", "chat", {
      data: {
        recommendations: [
          { ...entry, milestones: { deal: "forged" }, amountNet: 999 },
        ],
      },
    });
    expect(recommendations(store.networkContents.get("chat")!)[0]).toEqual(
      entry,
    );
  });
  it("acknowledges only the current users community notice without marking a recommendation as read", async () => {
    const { store, service, input } = fixture();
    await service.recommend("a", "n", "chat", input);
    const notice = store.notifications.find(
      (n) => n.type === "network.recommendation.community" && n.userId === "b",
    )!;
    await expect(
      service.readRecommendationNotice("a", "n", notice.id),
    ).rejects.toThrow();
    await service.readRecommendationNotice("b", "n", notice.id);
    expect(notice.readAt).toBeTruthy();
    expect(
      recommendations(store.networkContents.get("chat")!)[0].milestones.read,
    ).toBeUndefined();
  });
  it("stores a structured private recommendation and message in the existing durable store", () => {
    const { store, record, input } = fixture();
    const r = createRecommendation(store, record, "a", input);
    expect(r.recipientId).toBe("b");
    expect(record.data.messages).toMatchObject([
      { kind: "recommendation", recommendationId: r.id },
    ]);
    const copy = new PortalStore();
    (copy as unknown as { hydrate: (v: unknown) => void }).hydrate(
      JSON.parse(store.snapshot()),
    );
    expect(recommendations(copy.networkContents.get("chat")!)[0]).toEqual(r);
  });
  it("rejects outsiders, archived and group chats, and missing sharing permission", () => {
    const { store, record, input } = fixture();
    expect(() => createRecommendation(store, record, "c", input)).toThrow();
    expect(() =>
      createRecommendation(store, record, "a", {
        ...input,
        sharingConfirmed: false,
      }),
    ).toThrow();
    record.status = "archived";
    expect(() => createRecommendation(store, record, "a", input)).toThrow();
    record.status = "published";
    record.data.participantUserIds = ["a", "b", "c"];
    expect(() => createRecommendation(store, record, "a", input)).toThrow();
  });
  it("validates email, phone, required contact fields and text limits before mutation", () => {
    const { store, record, input } = fixture();
    for (const patch of [
      { email: "bad" },
      { phone: "abc" },
      { company: "" },
      { description: "x".repeat(2001) },
    ])
      expect(() =>
        createRecommendation(store, record, "a", { ...input, ...patch }),
      ).toThrow();
    expect(recommendations(record)).toHaveLength(0);
  });
  it("only the recipient may report milestones, with optimistic conflict protection", () => {
    const { store, record, input } = fixture();
    const r = createRecommendation(store, record, "a", input);
    expect(() =>
      respondRecommendation(store, record, "a", r.id, {
        revision: 0,
        action: "read",
      }),
    ).toThrow();
    expect(() =>
      respondRecommendation(store, record, "c", r.id, {
        revision: 0,
        action: "read",
      }),
    ).toThrow();
    respondRecommendation(store, record, "b", r.id, {
      revision: 0,
      action: "read",
    });
    expect(() =>
      respondRecommendation(store, record, "b", r.id, {
        revision: 0,
        action: "accepted",
      }),
    ).toThrow(/inzwischen/);
    expect(r.milestones.read).toBeTruthy();
  });
  it("does not count polling or delivery as reading, and tracks separate timestamps once", () => {
    const { store, record, input } = fixture();
    const r = createRecommendation(store, record, "a", input);
    expect(r.milestones).toEqual({});
    expect(() =>
      respondRecommendation(store, record, "b", r.id, {
        revision: 0,
        action: "accepted",
      }),
    ).toThrow(/öffnen/);
    for (const action of ["read", "accepted", "thanked", "answered", "contact"])
      respondRecommendation(store, record, "b", r.id, {
        revision: r.revision,
        action,
        comment: "Rückmeldung",
      });
    const length = r.history.length;
    respondRecommendation(store, record, "b", r.id, {
      revision: r.revision,
      action: "contact",
      comment: "duplicate",
    });
    expect(r.history).toHaveLength(length);
    expect(Object.keys(r.milestones)).toHaveLength(5);
  });
  it("never leaks recommended contacts, problem text or chat details into the network pulse", () => {
    const { store, record, input } = fixture();
    createRecommendation(store, record, "a", input);
    const pulse = JSON.stringify(recommendationPulse(store, "n", 30));
    expect(pulse).toContain("Empfehlung");
    for (const secret of ["SECRET", "secret@example.org", "12345", "PRIVATE"])
      expect(pulse).not.toContain(secret);
    expect(recommendationPulse(store, "other", 30)).toEqual([]);
    expect(recommendationRows(store, "other")).toEqual([]);
  });
  it("requires a contact before a deal; rejects invalid amounts and keeps publication explicit", () => {
    const { store, record, input } = fixture();
    const r = createRecommendation(store, record, "a", input);
    respondRecommendation(store, record, "b", r.id, {
      revision: 0,
      action: "read",
    });
    expect(() =>
      respondRecommendation(store, record, "b", r.id, {
        revision: 1,
        action: "deal",
        amountNet: 100,
        comment: "Deal",
      }),
    ).toThrow(/Kontakt/);
    respondRecommendation(store, record, "b", r.id, {
      revision: 1,
      action: "contact",
      comment: "Telefoniert",
    });
    for (const amountNet of [NaN, -1, 1.001, "100", Infinity])
      expect(() =>
        respondRecommendation(store, record, "b", r.id, {
          revision: 2,
          action: "deal",
          amountNet,
          comment: "Deal",
        }),
      ).toThrow();
    respondRecommendation(store, record, "b", r.id, {
      revision: 2,
      action: "deal",
      amountNet: 100.5,
      comment: "Auftrag",
    });
    expect(r.publishRevenue).toBe(false);
  });
  it("prevents falsely rejecting an already established contact", () => {
    const { store, record, input } = fixture();
    const r = createRecommendation(store, record, "a", input);
    respondRecommendation(store, record, "b", r.id, {
      revision: 0,
      action: "read",
    });
    respondRecommendation(store, record, "b", r.id, {
      revision: 1,
      action: "contact",
      comment: "Kontakt",
    });
    expect(() =>
      respondRecommendation(store, record, "b", r.id, {
        revision: 2,
        action: "declined",
        comment: "No",
      }),
    ).toThrow();
  });
  it("restricts the management report to the correct network initiator, not participants or other networks", () => {
    const { service } = fixture();
    expect(() => service.recommendationOverview("a", "n")).toThrow();
    expect(service.recommendationOverview("c", "n")).toEqual([]);
    expect(() => service.recommendationOverview("c", "other")).toThrow();
  });
  it("persists send and recipient updates and broadcasts only generic information within this network", async () => {
    const { store, service, input } = fixture();
    await service.recommend("a", "n", "chat", input);
    expect(store.persist).toHaveBeenCalled();
    const notice = store.notifications.find(
      (n) => n.type === "network.recommendation.community",
    );
    expect(notice?.data).toEqual({
      networkId: "n",
      title:
        "Mitglieder helfen einander: Eine neue Empfehlung wurde ausgesprochen.",
    });
    expect(JSON.stringify(notice)).not.toContain("SECRET");
    const r = recommendations(store.networkContents.get("chat")!)[0];
    await service.recommendationResponse("b", "n", "chat", r.id, {
      revision: 0,
      action: "read",
    });
    expect(r.milestones.read).toBeTruthy();
    await expect(
      service.recommend("b", "other", "chat", input),
    ).rejects.toThrow();
  });
  it("adds recommendation revenue once only after the recipient explicitly publishes it", () => {
    const { store, record, input, service } = fixture();
    const r = createRecommendation(store, record, "a", input);
    for (const action of ["read", "contact"])
      respondRecommendation(store, record, "b", r.id, {
        revision: r.revision,
        action,
        comment: "Kontakt",
      });
    respondRecommendation(store, record, "b", r.id, {
      revision: r.revision,
      action: "deal",
      comment: "Auftrag",
      amountNet: 1234.56,
      publishRevenue: true,
    });
    expect(service.pulseRevenue("b", "n")).toMatchObject({
      amountNet: 1234.56,
      recommendations: 1,
    });
    respondRecommendation(store, record, "b", r.id, {
      revision: r.revision,
      action: "deal",
      amountNet: 9999,
      comment: "duplicate",
    });
    expect(service.pulseRevenue("b", "n").amountNet).toBe(1234.56);
  });
  it("respects the recommendations module switch and writable membership", async () => {
    const { store, service, input } = fixture();
    store.networks.get("n")!.settings.features = {
      recommendations: false,
    } as never;
    await expect(service.recommend("a", "n", "chat", input)).rejects.toThrow();
  });
});
