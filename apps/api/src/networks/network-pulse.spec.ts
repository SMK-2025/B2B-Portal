import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { NetworksService } from "./networks.service";
import { removeNetworkUser } from "./remove-network-user";
import { PortalStore } from "../core/portal.store";
import {
  networkPulse,
  pulseState,
  updatePulse,
  activatePulseOnReply,
} from "./network-pulse";
import type { NetworkContentRecord } from "../core/domain";
function fixture() {
  const store = new PortalStore(),
    now = new Date().toISOString();
  for (const id of ["a", "b", "other"]) {
    store.users.set(id, {
      id,
      email: `${id}@test.invalid`,
      passwordHash: "unused",
      firstName: id,
      lastName: "Test",
      accountRole: "user",
      emailVerifiedAt: now,
      createdAt: now,
    });
    store.networkMemberships.push({
      id: `m-${id}`,
      networkId: id === "other" ? "other" : "network",
      organizationId: `org-${id}`,
      userId: id,
      role: id === "a" ? "network_admin" : "member",
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as never);
  }
  const chat: NetworkContentRecord = {
    id: "chat",
    networkId: "network",
    type: "conversation",
    title: "SECRET TITLE",
    description: "SECRET DESCRIPTION",
    status: "published",
    createdByUserId: "a",
    assignedToUserId: null,
    startsAt: null,
    endsAt: null,
    visibility: "members",
    createdAt: now,
    updatedAt: now,
    data: {
      directChat: true,
      participantUserIds: ["a", "b"],
      messages: [
        { userId: "a", kind: "message", body: "SECRET MESSAGE" },
        { userId: "b", kind: "message", body: "PRIVATE REPLY" },
      ],
    },
  };
  store.networkContents.set(chat.id, chat);
  return { store, chat };
}
describe("network pulse", () => {
  it("starts only after both participants reply and creates one private system note", () => {
    const { store, chat } = fixture();
    chat.data.messages = [{ userId: "a", kind: "message", body: "Hello" }];
    activatePulseOnReply(store, chat);
    expect(pulseState(chat)).toBeUndefined();
    expect(networkPulse(store, "network", 30)).toEqual([]);
    expect(() =>
      updatePulse(store, chat, "a", {
        action: "status",
        revision: 0,
        stage: "offer",
        comment: "x",
      }),
    ).toThrow(/Antwort/);
    (chat.data.messages as unknown[]).push({
      userId: "b",
      kind: "message",
      body: "Reply",
    });
    activatePulseOnReply(store, chat);
    activatePulseOnReply(store, chat);
    expect(pulseState(chat)?.stage).toBe("chat");
    expect(chat.data.pulseNotes).toHaveLength(1);
    expect(networkPulse(store, "network", 30)).toHaveLength(1);
  });
  it("keeps private acceptance and its comment out of all public projections", () => {
    const { store, chat } = fixture();
    updatePulse(store, chat, "a", {
      action: "status",
      revision: 0,
      stage: "accepted",
      comment: "SECRET ACCEPTANCE",
      publish: false,
    });
    expect(chat.data.pulseNotes).toHaveLength(1);
    expect(JSON.stringify(chat.data.pulseNotes)).toContain("SECRET ACCEPTANCE");
    expect(JSON.stringify(networkPulse(store, "network", 30))).not.toContain(
      "SECRET",
    );
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
  });
  it("removes cooperation and private status data when either member is deleted", () => {
    const { store, chat } = fixture();
    updatePulse(store, chat, "a", {
      revision: 0,
      action: "status",
      stage: "accepted",
      comment: "PRIVATE",
      publicText: "Projekt",
    });
    updatePulse(store, chat, "b", { revision: 1, action: "confirm" });
    removeNetworkUser(store, "network", "b", "b@test.invalid");
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
    expect(pulseState(chat)).toBeUndefined();
    expect(store.networkMemberships.some((m) => m.userId === "other")).toBe(
      true,
    );
  });
  it("enforces network access and rejects forged state through ordinary content edits", () => {
    const { store, chat } = fixture(),
      auth = new AuthService(store),
      service = new NetworksService(store, auth, new EmailService());
    store.users.set("owner", {
      ...store.users.get("a")!,
      id: "owner",
      accountRole: "platform_admin",
    });
    vi.spyOn(auth, "authenticate").mockImplementation((header) => {
      const user = store.users.get(String(header));
      if (!user) throw new Error("Unauthenticated");
      return user;
    });
    const network = service.create("owner", {
      name: "Pulse Test",
      slug: "pulse-test",
    });
    service.setAccess("owner", network.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    chat.networkId = network.id;
    chat.data.category = "Sonstiger Austausch";
    store.networkMemberships
      .filter((m) => m.networkId === "network")
      .forEach((m) => (m.networkId = network.id));
    expect(() => service.pulse("other", network.id)).toThrow();
    expect(() =>
      service.updateChatPulse("other", network.id, "chat", {
        action: "visibility",
        visible: true,
        revision: 0,
      }),
    ).toThrow();
    service.updateContent("a", network.id, "chat", {
      data: { networkPulse: { enabled: true, stage: "accepted" } },
    });
    expect(pulseState(chat)).toBeUndefined();
    service.updateChatPulse("a", network.id, "chat", {
      action: "status",
      stage: "accepted",
      comment: "PRIVATE",
      publicText: "Gemeinsames Projekt",
      revision: 0,
      amountNet: 2500,
    });
    expect(service.pulse("b", network.id)[0].stage).toBe("chat");
    service.updateChatPulse("b", network.id, "chat", {
      action: "confirm",
      revision: 1,
    });
    expect(
      service
        .listContent("b", network.id, "noticeboard")
        .some((r) => r.title === "Kooperation vereinbart"),
    ).toBe(true);
    expect(JSON.stringify(service.pulse("b", network.id))).not.toMatch(
      /PRIVATE|2500|SECRET/,
    );
    expect(() => service.pulse("b", network.id, "999")).toThrow();
    service.updateChatPulse("a", network.id, "chat", {
      action: "status",
      stage: "declined",
      comment: "Nicht passend",
      revision: 2,
    });
    expect(
      service
        .listContent("b", network.id, "noticeboard")
        .some((r) => r.title === "Kooperation vereinbart"),
    ).toBe(false);
  });
  it("does not retroactively disclose existing chats and redacts message content", () => {
    const { store, chat } = fixture();
    expect(networkPulse(store, "network", 30)).toEqual([]);
    updatePulse(store, chat, "a", {
      revision: 0,
      action: "visibility",
      visible: true,
    });
    expect(networkPulse(store, "network", 30)[0].stage).toBe("chat");
    expect(JSON.stringify(networkPulse(store, "network", 30))).not.toMatch(
      /SECRET/,
    );
    expect(networkPulse(store, "other", 30)).toEqual([]);
  });
  it("requires comments, exact revision and participating active members", () => {
    const { store, chat } = fixture();
    expect(() =>
      updatePulse(store, chat, "other", {
        revision: 0,
        action: "status",
        stage: "offer",
        comment: "x",
      }),
    ).toThrow();
    expect(() =>
      updatePulse(store, chat, "a", {
        revision: 0,
        action: "status",
        stage: "offer",
        comment: "",
      }),
    ).toThrow();
    updatePulse(store, chat, "a", {
      revision: 0,
      action: "status",
      stage: "offer",
      comment: "PRIVATE",
      publicText: "Website",
    });
    expect(() =>
      updatePulse(store, chat, "b", { revision: 0, action: "confirm" }),
    ).toThrow(/inzwischen/);
    expect(networkPulse(store, "network", 30)[0].stage).toBe("chat");
    updatePulse(store, chat, "b", { revision: 1, action: "confirm" });
    expect(networkPulse(store, "network", 30)[0]).toMatchObject({
      stage: "offer",
      text: "Website",
    });
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
  });
  it("publishes only bilateral accepted cooperation, once; hiding withdraws it", () => {
    const { store, chat } = fixture();
    updatePulse(store, chat, "a", {
      revision: 0,
      action: "status",
      stage: "accepted",
      comment: "PRIVATE ACCEPTANCE",
      publicText: "Gemeinsames Website-Projekt",
    });
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
    updatePulse(store, chat, "b", { revision: 1, action: "confirm" });
    expect(store.networkContents.get("cooperation:chat")).toMatchObject({
      networkId: "network",
      title: "Kooperation vereinbart",
    });
    expect(
      JSON.stringify(store.networkContents.get("cooperation:chat")),
    ).not.toContain("PRIVATE ACCEPTANCE");
    updatePulse(store, chat, "a", { revision: 2, action: "confirm" });
    expect(
      [...store.networkContents.values()].filter((r) => r.type === "topic"),
    ).toHaveLength(1);
    updatePulse(store, chat, "b", {
      revision: 3,
      action: "visibility",
      visible: false,
    });
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
    expect(networkPulse(store, "network", 30)).toEqual([]);
    updatePulse(store, chat, "a", {
      revision: 4,
      action: "visibility",
      visible: true,
    });
    expect(networkPulse(store, "network", 30)).toEqual([]);
  });
  it("never publishes declines and persists state across snapshots", () => {
    const { store, chat } = fixture();
    updatePulse(store, chat, "a", {
      revision: 0,
      action: "status",
      stage: "declined",
      comment: "PRIVATE DECLINE",
      publicText: "must not appear",
    });
    expect(networkPulse(store, "network", 30)[0]).toMatchObject({
      stage: "chat",
      text: "",
    });
    expect(store.networkContents.has("cooperation:chat")).toBe(false);
    const copy = new PortalStore();
    (copy as unknown as { hydrate: (value: unknown) => void }).hydrate(
      JSON.parse(store.snapshot()),
    );
    expect(pulseState(copy.networkContents.get("chat")!)?.stage).toBe(
      "declined",
    );
    chat.data.networkPulse = {
      ...pulseState(chat),
      updatedAt: new Date(Date.now() - 61 * 86400000).toISOString(),
    };
    expect(networkPulse(store, "network", 60)).toEqual([]);
    expect(networkPulse(store, "network", 90)).toHaveLength(1);
    store.networkMemberships[1].status = "suspended";
    expect(networkPulse(store, "network", 180)).toEqual([]);
  });
});
