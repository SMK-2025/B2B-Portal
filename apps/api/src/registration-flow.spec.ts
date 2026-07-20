import { describe, expect, it } from "vitest";
import { AuthService } from "./auth/auth.service";
import { hashPassword } from "./auth/password";
import { PortalStore } from "./core/portal.store";
import { OrganizationsService } from "./organizations/organizations.service";
import { AdminService } from "./admin/admin.service";
import { ServicesService } from "./services/services.service";

describe("registration and organization approval", () => {
  it("provisions the platform owner without public registration", async () => {
    const store = new PortalStore();
    const auth = new AuthService(store);
    const admin = await auth.ensurePlatformAdmin({
      email: "owner@b2bmatching.de",
      password: "Ein-sehr-sicheres-Admin-Passwort-2026",
      firstName: "Martin",
      lastName: "Kelm",
    });
    expect(admin).toMatchObject({
      accountRole: "platform_admin",
      emailVerified: true,
    });
    const login = await auth.login({
      email: "owner@b2bmatching.de",
      password: "Ein-sehr-sicheres-Admin-Passwort-2026",
    });
    expect(auth.authenticate(`Bearer ${login.token}`).accountRole).toBe(
      "platform_admin",
    );
  });
  it("keeps an organization out of approval until email verification and explicit review", async () => {
    const store = new PortalStore();
    const auth = new AuthService(store);
    const organizations = new OrganizationsService(store, auth);
    const services = new ServicesService(store, auth);
    const admin = new AdminService(store, auth, services);

    const registration = await auth.register({
      email: "owner@example.de",
      password: "Sehr-Sicher-2026!",
      firstName: "Mara",
      lastName: "Klein",
    });
    expect(registration.user.emailVerified).toBe(false);
    auth.verifyEmail(registration.verificationToken);
    const login = await auth.login({
      email: "owner@example.de",
      password: "Sehr-Sicher-2026!",
    });
    const bearer = `Bearer ${login.token}`;
    const organization = organizations.create(bearer, {
      legalName: "Beispiel GmbH",
      displayName: "Beispiel",
      role: "both",
      websiteUrl: "https://example.de",
    });
    expect(organization.reviewStatus).toBe("draft");
    organizations.submit(bearer, organization.id);
    expect(organization.reviewStatus).toBe("submitted");

    const reviewerId = "reviewer-1";
    store.users.set(reviewerId, {
      id: reviewerId,
      email: "review@example.de",
      passwordHash: await hashPassword("Sehr-Sicher-2026!"),
      firstName: "Prüf",
      lastName: "Team",
      accountRole: "reviewer",
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    store.userByEmail.set("review@example.de", reviewerId);
    const reviewerLogin = await auth.login({
      email: "review@example.de",
      password: "Sehr-Sicher-2026!",
    });
    expect(admin.queue(`Bearer ${reviewerLogin.token}`)).toHaveLength(1);
    const result = admin.decide(
      `Bearer ${reviewerLogin.token}`,
      organization.id,
      {
        decision: "approved",
        reason: "Pflichtangaben und Homepage sind plausibel.",
      },
    );
    expect(result.organization.reviewStatus).toBe("approved");
    expect(result.organization.approvedAt).not.toBeNull();

    const service = services.create(bearer, organization.id, {
      title: "Penetrationstests für Webanwendungen",
      summary:
        "Strukturierte Sicherheitsprüfung geschäftskritischer Webanwendungen.",
      description:
        "Wir prüfen Webanwendungen auf technische Schwachstellen, dokumentieren nachvollziehbare Befunde und priorisieren konkrete Maßnahmen für Entwicklung und Betrieb.",
      categoryId: "it-security",
      skills: ["OWASP", "Web Security"],
      targetIndustries: ["Industrie"],
      serviceRegions: ["Deutschland"],
      deliveryModes: ["online", "hybrid"],
    });
    services.submit(bearer, service.id);
    expect(service.matchingEligible).toBe(false);
    admin.decideService(`Bearer ${reviewerLogin.token}`, service.id, {
      decision: "approved",
      reason: "Leistung ist eindeutig, plausibel und vollständig beschrieben.",
    });
    expect(service.matchingEligible).toBe(true);
    expect(service.publicVisibility).toBe(true);
  });

  it("resets the password once and invalidates existing sessions", async () => {
    const store = new PortalStore();
    const auth = new AuthService(store);
    const registration = await auth.register({
      email: "reset@example.de",
      password: "Sehr-Sicher-2026!",
      firstName: "Mara",
      lastName: "Klein",
    });
    auth.verifyEmail(registration.verificationToken);
    const login = await auth.login({
      email: "reset@example.de",
      password: "Sehr-Sicher-2026!",
    });
    expect(auth.authenticate(`Bearer ${login.token}`).email).toBe(
      "reset@example.de",
    );

    const request = auth.requestPasswordReset({ email: "reset@example.de" });
    expect(request.accepted).toBe(true);
    expect(request.resetToken).toBeTypeOf("string");
    await auth.resetPassword({
      token: request.resetToken,
      password: "Noch-Sicherer-2027!",
    });
    expect(() => auth.authenticate(`Bearer ${login.token}`)).toThrow();
    await expect(
      auth.login({ email: "reset@example.de", password: "Sehr-Sicher-2026!" }),
    ).rejects.toThrow();
    await expect(
      auth.login({
        email: "reset@example.de",
        password: "Noch-Sicherer-2027!",
      }),
    ).resolves.toHaveProperty("token");
    await expect(
      auth.resetPassword({
        token: request.resetToken,
        password: "Weiter-Sicher-2028!",
      }),
    ).rejects.toThrow();
  });
});
