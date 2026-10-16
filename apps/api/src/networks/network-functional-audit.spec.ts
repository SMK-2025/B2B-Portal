import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { hashPassword } from "../auth/password";
import { PortalStore } from "../core/portal.store";
import { OrganizationsService } from "../organizations/organizations.service";
import { NetworksService } from "./networks.service";

// Isolated audit fixture: never starts persistence or sends invitations.
describe("functional audit with 50 partners", () => {
  it("records current capabilities and reproducible gaps without touching live data", async () => {
    const store = new PortalStore(),
      auth = new AuthService(store),
      email = new EmailService(),
      orgs = new OrganizationsService(store, auth, email),
      networks = new NetworksService(store, auth, email);
    const now = new Date().toISOString(),
      password = "Audit-Sicher-2026!",
      passwordHash = await hashPassword(password);
    async function account(label: string, platform = false) {
      const id = randomUUID(),
        address = label + "@example.invalid";
      store.users.set(id, {
        id,
        email: address,
        passwordHash,
        firstName: label,
        lastName: "Test",
        accountRole: platform ? "platform_admin" : "user",
        emailVerifiedAt: now,
        createdAt: now,
      });
      store.userByEmail.set(address, id);
      const bearer =
        "Bearer " + (await auth.login({ email: address, password })).token;
      const organization = orgs.create(bearer, {
        legalName: label + " GmbH",
        displayName: label,
        role: "both",
        websiteUrl: "https://example.invalid",
      });
      return { id, bearer, organization };
    }
    const owner = await account("owner", true),
      initiator = await account("initiator"),
      first = await account("partner01"),
      second = await account("partner02");
    const network = networks.create(owner.bearer, {
      name: "Audit 50",
      slug: "audit-50",
    });
    networks.addMember(owner.bearer, network.id, {
      organizationId: initiator.organization.id,
      userId: initiator.id,
      role: "network_admin",
    });
    networks.setAccess(owner.bearer, network.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    for (const person of [first, second])
      networks.addMember(owner.bearer, network.id, {
        organizationId: person.organization.id,
        userId: person.id,
        role: "organization_admin",
      });
    for (let index = 3; index <= 50; index++) {
      const userId = randomUUID(),
        organizationId = randomUUID();
      store.users.set(userId, {
        id: userId,
        email: "partner" + index + "@example.invalid",
        passwordHash,
        firstName: "Partner" + index,
        lastName: "Test",
        accountRole: "user",
        emailVerifiedAt: now,
        createdAt: now,
      });
      store.organizations.set(organizationId, {
        ...first.organization,
        id: organizationId,
        displayName: "Partner " + index,
        legalName: "Partner " + index + " GmbH",
      });
      store.memberships.push({ organizationId, userId, role: "admin" });
      networks.addMember(owner.bearer, network.id, {
        organizationId,
        userId,
        role: "organization_admin",
      });
    }
    expect(networks.listMembers(initiator.bearer, network.id)).toHaveLength(50);
    expect(networks.listMembers(first.bearer, network.id)).toHaveLength(50);
    expect(() => networks.ownProfile(initiator.bearer, network.id)).toThrow(
      /keine eigene Partnerseite/,
    );
    const other = networks.create(owner.bearer, {
      name: "Anderes Netzwerk",
      slug: "audit-other",
    });
    networks.setAccess(owner.bearer, other.id, {
      status: "active",
      billingMode: "cooperation_free",
    });
    expect(() => networks.listMembers(first.bearer, other.id)).toThrow();
    // Regressions and the complete partner-to-partner workflow.
    const draft = networks.createContent(initiator.bearer, network.id, {
      type: "topic",
      title: "Unfertiger Entwurf",
      description: "Nicht freigegebener Inhalt",
      status: "draft",
      data: { category: "Austausch & Ideen" },
    });
    expect(
      networks
        .listContent(first.bearer, network.id, "topic")
        .some((item) => item.id === draft.id),
    ).toBe(false);
    expect(() => networks.thread(first.bearer, network.id, draft.id)).toThrow();
    expect(() =>
      networks.createContent(first.bearer, network.id, {
        type: "conversation",
        title: "Ohne Empfänger",
        description: "Nicht erlaubt",
        data: { category: "Geschäftliche Anfrage" },
      }),
    ).toThrow();
    const conversation = networks.createContent(first.bearer, network.id, {
      type: "conversation",
      title: "Anfrage an Partner zwei",
      description: "Vertrauliche Kooperation",
      participantUserIds: [second.id],
      data: { category: "Geschäftliche Anfrage" },
    });
    expect(
      networks
        .listContent(second.bearer, network.id, "conversation")
        .some((item) => item.id === conversation.id),
    ).toBe(true);
    expect(
      networks.listContent(initiator.bearer, network.id, "conversation"),
    ).toHaveLength(0);
    expect(
      networks.listContent(owner.bearer, network.id, "conversation"),
    ).toHaveLength(0);
    expect(() =>
      networks.thread(initiator.bearer, network.id, conversation.id),
    ).toThrow();
    expect(() =>
      networks.reply(initiator.bearer, network.id, conversation.id, {
        body: "Darf nicht mitlesen",
      }),
    ).toThrow();
    expect(
      networks
        .networkNotifications(initiator.bearer, network.id)
        .some((n) => n.data.contentId === conversation.id),
    ).toBe(false);
    expect(() =>
      networks.updateContent(initiator.bearer, network.id, conversation.id, {
        description: "Übernahme",
      }),
    ).toThrow();
    expect(() =>
      networks.deleteContent(initiator.bearer, network.id, conversation.id),
    ).toThrow();
    expect(() =>
      networks.createContent(first.bearer, network.id, {
        type: "topic",
        title: "Gefälschte Mitteilung",
        description: "Unzulässig",
        data: { category: "Neuigkeit des Initiators" },
      }),
    ).toThrow();
    const bytes = Buffer.from("%PDF-1.7\nPortfolio");
    networks.reply(first.bearer, network.id, conversation.id, {
      body: "Unser Leistungsportfolio",
      file: {
        name: "portfolio.pdf",
        mimeType: "application/pdf",
        size: bytes.length,
        dataUrl: "data:application/pdf;base64," + bytes.toString("base64"),
      },
    });
    expect(
      (
        networks.thread(second.bearer, network.id, conversation.id).data
          .messages as any[]
      )[0].attachments[0].name,
    ).toBe("portfolio.pdf");
    expect(() =>
      networks.reply(first.bearer, network.id, conversation.id, {
        body: "Falsche Datei",
        file: {
          name: "bad.pdf",
          mimeType: "application/pdf",
          size: 1,
          dataUrl: "data:application/pdf;base64,AA==",
        },
      }),
    ).toThrow();
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    let thread = networks.reply(first.bearer, network.id, conversation.id, {
      kind: "meeting",
      body: "Projekt besprechen",
      startsAt: future,
      durationMinutes: 30,
      location: "Online",
    });
    const meeting = (thread.data.messages as any[]).at(-1);
    networks.respond(second.bearer, network.id, conversation.id, meeting.id, {
      status: "accepted",
    });
    expect(
      (
        networks.thread(first.bearer, network.id, conversation.id).data
          .messages as any[]
      ).at(-1).responses[second.id],
    ).toBe("accepted");
    thread = networks.reply(first.bearer, network.id, conversation.id, {
      kind: "action",
      body: "Angebot erstellen",
      assignedToUserId: second.id,
      deadline: future,
    });
    const action = (thread.data.messages as any[]).at(-1);
    networks.respond(second.bearer, network.id, conversation.id, action.id, {
      status: "completed",
    });
    expect(
      (
        networks.thread(first.bearer, network.id, conversation.id).data
          .messages as any[]
      ).at(-1).status,
    ).toBe("completed");
    networks.updateContent(first.bearer, network.id, conversation.id, {
      data: { participantUserIds: [initiator.id], messages: [] },
    });
    expect(
      (
        networks.thread(second.bearer, network.id, conversation.id).data
          .messages as any[]
      ).length,
    ).toBe(3);
    expect(() =>
      networks.thread(initiator.bearer, network.id, conversation.id),
    ).toThrow();
    const group = networks.createContent(first.bearer, network.id, {
      type: "conversation",
      title: "Gemeinsame Runde",
      description: "Initiator ausdrücklich beteiligt",
      participantUserIds: [second.id, initiator.id],
      data: { category: "Kooperation" },
    });
    expect(
      networks.thread(initiator.bearer, network.id, group.id).participants,
    ).toHaveLength(3);
    const topic = networks.createContent(first.bearer, network.id, {
      type: "topic",
      title: "Kooperation gesucht",
      description: "Gemeinsames Vorhaben",
      data: { category: "Austausch & Ideen" },
    });
    expect(
      networks.reply(second.bearer, network.id, topic.id, {
        body: "Wir unterstützen gern.",
      }).data.messages as any[],
    ).toHaveLength(1);
    networks.updateContent(first.bearer, network.id, topic.id, {
      data: { options: "Frühstück\nAbendveranstaltung" },
    });
    networks.vote(second.bearer, network.id, topic.id, { option: 0 });
    expect(
      networks.vote(second.bearer, network.id, topic.id, { option: 1 }).data
        .votes,
    ).toEqual({ [second.id]: 1 });
    expect(() =>
      networks.vote(second.bearer, network.id, topic.id, { option: 5 }),
    ).toThrow();
    const event = networks.createContent(initiator.bearer, network.id, {
      type: "event",
      title: "Nur ein Platz",
      description: "Kapazität prüfen",
      startsAt: future,
      data: {
        category: "Netzwerkveranstaltung",
        capacity: 1,
        recapSummary: "Audit Rückblick",
      },
    });
    networks.updateOwnAttendance(first.bearer, network.id, event.id, {
      response: "registered",
    });
    expect(() =>
      networks.updateOwnAttendance(second.bearer, network.id, event.id, {
        response: "registered",
      }),
    ).toThrow(/ausgebucht/);
    networks.updateOwnAttendance(first.bearer, network.id, event.id, {
      response: "declined",
    });
    networks.updateOwnAttendance(second.bearer, network.id, event.id, {
      response: "registered",
    });
    const past = networks.createContent(initiator.bearer, network.id, {
      type: "event",
      title: "Frist vorbei",
      description: "Frist prüfen",
      startsAt: future,
      data: { category: "Netzwerkveranstaltung", deadline: "2020-01-01" },
    });
    expect(() =>
      networks.updateOwnAttendance(first.bearer, network.id, past.id, {
        response: "registered",
      }),
    ).toThrow(/Anmeldefrist/);
    const proposal = networks.createContent(first.bearer, network.id, {
      type: "event",
      title: "Partnerfrühstück",
      description: "Unser Vorschlag",
      startsAt: future,
      data: { category: "Geschäftstreffen" },
    });
    expect(proposal.status).toBe("draft");
    expect(() =>
      networks.updateContent(first.bearer, network.id, proposal.id, {
        status: "published",
      }),
    ).toThrow();
    networks.updateContent(initiator.bearer, network.id, proposal.id, {
      status: "published",
    });
    expect(
      networks
        .listContent(second.bearer, network.id, "event")
        .some((i) => i.id === proposal.id),
    ).toBe(true);
    networks.createContent(first.bearer, network.id, {
      type: "document",
      title: "Partnerportfolio",
      description: "Leistungsübersicht",
      data: {
        category: "Angebot & Partnerleistung",
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          size: bytes.length,
          dataUrl: "data:application/pdf;base64," + bytes.toString("base64"),
        },
      },
    });
    networks.deleteContent(initiator.bearer, network.id, event.id);
    expect(
      networks
        .dashboard(initiator.bearer, network.id)
        .eventRecaps.some((item) => item.id === event.id),
    ).toBe(false);
    expect(
      [...store.networkAttendances.values()].some(
        (item) => item.eventId === event.id,
      ),
    ).toBe(false);
    expect(
      networks
        .dashboard(initiator.bearer, network.id)
        .recent.some((item) => item.id === conversation.id),
    ).toBe(false);
    expect(() =>
      networks.reply(first.bearer, other.id, conversation.id, {
        body: "Fremder Mandant",
      }),
    ).toThrow();
    networks.deleteContent(first.bearer, network.id, conversation.id);
    expect(() =>
      networks.thread(second.bearer, network.id, conversation.id),
    ).toThrow();
    const forged = networks.createContent(first.bearer, network.id, {
      type: "topic",
      title: "Keine Systemeinladung",
      description: "Untrusted Daten",
      endsAt: future,
      data: {
        category: "Austausch & Ideen",
        kind: "network_invitation",
        role: "network_admin",
        email: "partner01@example.invalid",
        inviteTokenHash: "fake",
      },
    });
    expect(forged.data.kind).toBeUndefined();
    networks.updateContent(first.bearer, network.id, forged.id, {
      data: { kind: "network_invitation", role: "network_admin" },
    });
    expect(
      networks.thread(first.bearer, network.id, forged.id).data.kind,
    ).toBeUndefined();
    networks.setAccess(owner.bearer, network.id, { status: "suspended" });
    expect(() =>
      networks.reply(first.bearer, network.id, topic.id, {
        body: "Netzwerk gesperrt",
      }),
    ).toThrow();
    expect(() =>
      networks.updateContent(first.bearer, network.id, topic.id, {
        description: "Umgehung",
      }),
    ).toThrow();
  }, 30000);
});
