import { describe, it, expect, beforeAll } from "vitest";
import { HomepagePublicationController } from "./homepage-publication.controller";
import { PortalStore } from "../core/portal.store";
import { projectHomepage } from "./homepage-publication";
import type {
  NetworkMembershipRecord,
  NetworkPartnerProfile,
} from "../core/domain";
import type { NetworkContentRecord } from "../core/domain";
beforeAll(() => {
  process.env.PUBLIC_HOMEPAGE_MEDIA_ORIGIN = "https://api.example.test";
});
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
const member = {
  id: "member",
  networkId: "n",
  organizationId: "o",
  userId: "u",
  role: "partner",
  status: "active",
  updatedAt: "2026-10-27",
  homepageGrants: {
    members: {
      enabled: true,
      fields: ["title", "description"],
      rightsConfirmed: true,
      approvedBy: "u",
      consentUserId: "u",
      consentMembershipId: "member",
      updatedAt: "2026-10-27",
    },
  },
} as unknown as NetworkMembershipRecord;
const profile = {
  companyName: "TESTDATEN – Testunternehmen",
  description: "Fiktiver Testeintrag",
  status: "published",
  contactEmail: "secret@example.org",
  contactPhone: "secret",
} as NetworkPartnerProfile;
describe("homepage publication", () => {
  it("keeps cancellation and updates live, hides internal and incomplete events", () => {
    const event = {
      id: "event",
      networkId: "n",
      type: "event",
      title: "TEST",
      description: "Test event",
      status: "published",
      visibility: "members",
      startsAt: "2026-11-10T08:00:00Z",
      data: {
        publicEventKind: "breakfast",
        publicAttendanceMode: "offline",
        publicVenueName: "Öffentlicher Testort",
        publicStreetAddress: "Teststraße 1",
        publicPostalCode: "00000",
        publicAddressLocality: "Teststadt",
        publicAddressCountry: "DE",
        imageUrl: png,
        timezone: "Europe/Berlin",
        publicLocation: "Testort",
        location: "SECRET MEETING LINK",
        organizer: "Test",
        participationTerms: "Test",
        cost: "10 EUR",
        eventStatus: "cancelled",
        participantUserIds: ["private"],
      },
      homepageGrants: {
        events: {
          enabled: true,
          fields: [
            "title",
            "description",
            "image",
            "startsAt",
            "timezone",
            "location",
            "organizer",
            "terms",
            "cost",
            "status",
          ],
          rightsConfirmed: true,
          updatedAt: "2026-10-27",
          approvedBy: "admin",
        },
      },
    } as unknown as NetworkContentRecord;
    expect(projectHomepage("events", event)?.status).toBe("cancelled");
    expect(projectHomepage("events", event)?.venue).toBeUndefined();
    expect(projectHomepage("events", event)?.eventKind).toBeUndefined();
    event.homepageGrants!.events!.fields.push(
      "venue",
      "eventKind",
      "attendanceMode",
    );
    expect(projectHomepage("events", event)?.venue).toEqual({
      name: "Öffentlicher Testort",
      streetAddress: "Teststraße 1",
      postalCode: "00000",
      addressLocality: "Teststadt",
      addressCountry: "DE",
    });
    expect(projectHomepage("events", event)?.eventKind).toBe("breakfast");
    expect(JSON.stringify(projectHomepage("events", event))).not.toMatch(
      /SECRET|private|participant/,
    );
    event.title = "Geändert";
    expect(projectHomepage("events", event)?.title).toBe("Geändert");
    expect(
      projectHomepage("events", { ...event, visibility: "administrators" }),
    ).toBeNull();
    expect(
      projectHomepage("events", {
        ...event,
        data: { ...event.data, cost: "" },
      }),
    ).toBeNull();
  });
  it("member consent, persistence snapshot and revocation use the source record", () => {
    const store = new PortalStore();
    store.networks.set("n", {
      id: "n",
      slug: "unternehmerfreunde",
      status: "active",
    } as never);
    store.networkBySlug.set("unternehmerfreunde", "n");
    store.organizations.set("o", { id: "o", networkProfile: profile } as never);
    store.networkMemberships.push({ ...member, homepageGrants: undefined });
    const controller = new HomepagePublicationController(store, {
      authenticate: () => ({ id: "u", accountRole: "user" }),
    } as never);
    expect(
      controller.feed("unternehmerfreunde", { ip: "test" }).members,
    ).toHaveLength(0);
    controller.consentProfile("unternehmerfreunde", "member", "Bearer x", {
      enabled: true,
      fields: ["title", "description"],
      rightsConfirmed: true,
    });
    expect(
      controller.feed("unternehmerfreunde", { ip: "test" }).members,
    ).toHaveLength(1);
    expect(store.snapshot()).toContain("homepageGrants");
    controller.consentProfile("unternehmerfreunde", "member", "Bearer x", {
      enabled: false,
    });
    expect(
      controller.feed("unternehmerfreunde", { ip: "test" }).members,
    ).toHaveLength(0);
    expect(store.activities.at(-1)?.type).toBe("homepage.member.revoked");
  });
  it("defaults to private and requires rights confirmation", () => {
    expect(
      projectHomepage(
        "members",
        { ...member, homepageGrants: undefined },
        profile,
      ),
    ).toBeNull();
    expect(
      projectHomepage(
        "members",
        {
          ...member,
          homepageGrants: {
            members: {
              ...member.homepageGrants!.members!,
              rightsConfirmed: false,
            },
          },
        },
        profile,
      ),
    ).toBeNull();
  });
  it("projects an allowlist without private metadata", () => {
    const result = projectHomepage("members", member, profile);
    expect(result?.title).toContain("TESTDATEN");
    expect(JSON.stringify(result)).not.toMatch(
      /secret|approvedBy|organizationId|userId|networkId/,
    );
  });
  it("removes a revoked or inactive member immediately", () => {
    expect(
      projectHomepage("members", { ...member, status: "suspended" }, profile),
    ).toBeNull();
    expect(
      projectHomepage(
        "members",
        {
          ...member,
          homepageGrants: {
            members: { ...member.homepageGrants!.members!, enabled: false },
          },
        },
        profile,
      ),
    ).toBeNull();
  });
  it("isolates networks and blocks unauthenticated management", () => {
    const store = new PortalStore();
    store.networks.set("n", {
      id: "n",
      slug: "unternehmerfreunde",
      status: "active",
    } as never);
    store.networkBySlug.set("unternehmerfreunde", "n");
    store.networkMemberships.push({ ...member, networkId: "other" });
    const auth = {
      authenticate() {
        throw Error("Unauthenticated");
      },
    };
    const controller = new HomepagePublicationController(store, auth as never);
    expect(
      controller.feed("unternehmerfreunde", { ip: "test" }).members,
    ).toEqual([]);
    expect(() => controller.feed("other", { ip: "test" })).toThrow();
    expect(() => controller.manage("unternehmerfreunde", undefined)).toThrow();
  });
  it("rejects regular members and unauthorized fields", () => {
    const store = new PortalStore();
    store.networks.set("n", {
      id: "n",
      slug: "unternehmerfreunde",
      status: "active",
    } as never);
    store.networkBySlug.set("unternehmerfreunde", "n");
    store.networkMemberships.push(member);
    const controller = new HomepagePublicationController(store, {
      authenticate: () => ({ id: "u", accountRole: "member" }),
    } as never);
    expect(() =>
      controller.consentProfile("unternehmerfreunde", "member", "Bearer x", {
        enabled: true,
        fields: ["title", "description"],
        rightsConfirmed: true,
      }),
    ).toThrow();
    const admin = new HomepagePublicationController(store, {
      authenticate: () => ({ id: "admin", accountRole: "platform_admin" }),
    } as never);
    expect(() =>
      admin.update("unternehmerfreunde", "members", "member", "Bearer x", {
        enabled: true,
        fields: ["privateMessages"],
        rightsConfirmed: true,
      }),
    ).toThrow();
  });
});
