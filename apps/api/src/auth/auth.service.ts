import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PortalStore } from "../core/portal.store";
import { emailAddress, requiredText } from "../core/validation";
import {
  hashPassword,
  opaqueToken,
  tokenHash,
  validatePasswordStrength,
  verifyPassword,
} from "./password";
import { EmailService } from "./email.service";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly securityAttempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(
    private readonly store: PortalStore,
    @Optional() private readonly email: EmailService = new EmailService(),
  ) {}

  async onModuleInit() {
    const email = process.env.PLATFORM_ADMIN_EMAIL;
    const password = process.env.PLATFORM_ADMIN_PASSWORD;
    if (!email && !password) {
      this.logger.warn(
        "Kein Plattformadmin konfiguriert. PLATFORM_ADMIN_EMAIL und PLATFORM_ADMIN_PASSWORD vor dem Pilotbetrieb setzen.",
      );
      return;
    }
    if (!email || !password)
      throw new Error(
        "PLATFORM_ADMIN_EMAIL und PLATFORM_ADMIN_PASSWORD müssen gemeinsam gesetzt werden.",
      );
    await this.ensurePlatformAdmin({
      email,
      password,
      firstName: process.env.PLATFORM_ADMIN_FIRST_NAME || "Martin",
      lastName: process.env.PLATFORM_ADMIN_LAST_NAME || "Kelm",
    });
    await this.store.persist();
  }

  async ensurePlatformAdmin(input: Record<string, unknown>) {
    const email = emailAddress(input.email);
    const password = requiredText(input.password, "Admin-Passwort", 16, 200);
    const bootstrapAdminKey = tokenHash(email);
    const existingId =
      [...this.store.users.values()].find(
        (u) =>
          u.accountRole === "platform_admin" &&
          u.bootstrapAdminKey === bootstrapAdminKey,
      )?.id || this.store.userByEmail.get(email);
    const now = new Date().toISOString();
    if (existingId) {
      const existing = this.store.users.get(existingId);
      if (!existing) throw new Error("Inkonsistenter Benutzerindex.");
      existing.accountRole = "platform_admin";
      existing.emailVerifiedAt = existing.emailVerifiedAt || now;
      existing.bootstrapAdminKey = bootstrapAdminKey;
      return this.publicUser(existing);
    }
    const user = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      firstName: requiredText(input.firstName, "Vorname", 2, 100),
      lastName: requiredText(input.lastName, "Nachname", 2, 100),
      accountRole: "platform_admin" as const,
      bootstrapAdminKey,
      emailVerifiedAt: now,
      createdAt: now,
    };
    this.store.users.set(user.id, user);
    this.store.userByEmail.set(email, user.id);
    return this.publicUser(user);
  }

  async register(
    input: Record<string, unknown>,
    requireNetworkInvitation = false,
  ) {
    const email = emailAddress(input.email);
    const networkInviteToken =
      typeof input.networkInviteToken === "string"
        ? input.networkInviteToken
        : "";
    const networkInvitation = networkInviteToken
      ? [...this.store.networkContents.values()].find(
          (item) =>
            item.data.kind === "network_invitation" &&
            item.data.inviteTokenHash === tokenHash(networkInviteToken) &&
            !item.data.usedAt &&
            item.endsAt &&
            Date.parse(item.endsAt) > Date.now(),
        )
      : undefined;
    if (requireNetworkInvitation && !networkInviteToken)
      throw new BadRequestException(
        "Die Registrierung ist ausschließlich über eine persönliche Netzwerkeinladung möglich.",
      );
    if (
      networkInviteToken &&
      (!networkInvitation || networkInvitation.data.email !== email)
    )
      throw new BadRequestException(
        "Die Netzwerkeinladung ist ungültig, abgelaufen oder für eine andere E-Mail-Adresse ausgestellt.",
      );
    if (this.store.userByEmail.has(email))
      throw new ConflictException(
        "Für diese E-Mail-Adresse besteht bereits ein Konto.",
      );
    const password = requiredText(input.password, "Passwort", 12, 200);
    validatePasswordStrength(password);
    const user = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      firstName: requiredText(input.firstName, "Vorname", 2, 100),
      lastName: requiredText(input.lastName, "Nachname", 2, 100),
      accountRole: "user" as const,
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.store.users.set(user.id, user);
    this.store.userByEmail.set(email, user.id);
    const verificationToken = opaqueToken();
    this.store.verificationTokens.set(tokenHash(verificationToken), {
      tokenHash: tokenHash(verificationToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      usedAt: null,
    });
    try {
      await this.email.sendVerification({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
        ...(networkInviteToken ? { networkInviteToken } : {}),
        ...(networkInvitation
          ? {
              networkSlug: this.store.networks.get(networkInvitation.networkId)
                ?.slug,
            }
          : {}),
      });
    } catch (error) {
      this.store.verificationTokens.delete(tokenHash(verificationToken));
      this.store.userByEmail.delete(email);
      this.store.users.delete(user.id);
      throw error;
    }
    return {
      user: this.publicUser(user),
      verificationRequired: true,
      ...(this.email.directLinksEnabled() ? { verificationToken } : {}),
    };
  }

  verifyEmail(token: unknown) {
    const raw = requiredText(token, "Bestätigungscode", 20, 200);
    const record = this.store.verificationTokens.get(tokenHash(raw));
    if (!record || record.usedAt || Date.parse(record.expiresAt) <= Date.now())
      throw new BadRequestException(
        "Der Bestätigungslink ist ungültig oder abgelaufen.",
      );
    const user = this.store.users.get(record.userId);
    if (!user) throw new BadRequestException("Das Konto wurde nicht gefunden.");
    user.emailVerifiedAt = new Date().toISOString();
    record.usedAt = user.emailVerifiedAt;
    return { verified: true };
  }

  async login(input: Record<string, unknown>) {
    const email = emailAddress(input.email);
    const password = requiredText(input.password, "Passwort", 1, 200);
    const userId = this.store.userByEmail.get(email);
    const user = userId ? this.store.users.get(userId) : undefined;
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new UnauthorizedException(
        "E-Mail-Adresse oder Passwort ist falsch.",
      );
    if (!user.emailVerifiedAt)
      throw new UnauthorizedException(
        "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.",
      );
    const token = opaqueToken();
    this.store.sessions.set(tokenHash(token), {
      tokenHash: tokenHash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    });
    return { token, expiresInSeconds: 28_800, user: this.publicUser(user) };
  }

  async requestPasswordReset(input: Record<string, unknown>) {
    const email = emailAddress(input.email);
    const userId = this.store.userByEmail.get(email);
    if (!userId) return { accepted: true };
    const user = this.store.users.get(userId);
    if (!user) return { accepted: true };
    const resetToken = opaqueToken();
    this.store.passwordResetTokens.set(tokenHash(resetToken), {
      tokenHash: tokenHash(resetToken),
      userId,
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      usedAt: null,
    });
    try {
      await this.email.sendPasswordReset({
        email: user.email,
        firstName: user.firstName,
        token: resetToken,
      });
    } catch (error) {
      this.store.passwordResetTokens.delete(tokenHash(resetToken));
      throw error;
    }
    return {
      accepted: true,
      ...(this.email.directLinksEnabled() ? { resetToken } : {}),
    };
  }

  async resetPassword(input: Record<string, unknown>) {
    const raw = requiredText(input.token, "Zurücksetzungscode", 20, 200);
    const password = requiredText(input.password, "Passwort", 12, 200);
    validatePasswordStrength(password);
    const record = this.store.passwordResetTokens.get(tokenHash(raw));
    if (!record || record.usedAt || Date.parse(record.expiresAt) <= Date.now())
      throw new BadRequestException(
        "Der Link zum Zurücksetzen ist ungültig oder abgelaufen.",
      );
    const user = this.store.users.get(record.userId);
    if (!user) throw new BadRequestException("Das Konto wurde nicht gefunden.");
    user.passwordHash = await hashPassword(password);
    record.usedAt = new Date().toISOString();
    delete user.pendingEmailChange;
    this.revokeUserTokens(user.id);
    return { changed: true };
  }

  account(authorization: string | undefined) {
    const user = this.authenticate(authorization),
      pending = user.pendingEmailChange;
    return {
      ...this.publicUser(user),
      pendingEmail:
        pending && Date.parse(pending.expiresAt) > Date.now()
          ? pending.email
          : null,
    };
  }
  private async reauthenticate(
    user: { id: string; passwordHash: string },
    password: unknown,
  ) {
    const attempt = this.securityAttempts.get(user.id);
    if (attempt && attempt.until > Date.now() && attempt.count >= 5)
      throw new UnauthorizedException(
        "Zu viele fehlgeschlagene Sicherheitsabfragen. Bitte nach 15 Minuten erneut versuchen.",
      );
    if (
      typeof password !== "string" ||
      password.length > 200 ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      const count =
        attempt && attempt.until > Date.now() ? attempt.count + 1 : 1;
      this.securityAttempts.set(user.id, {
        count,
        until: Date.now() + 15 * 60_000,
      });
      throw new UnauthorizedException(
        "Das aktuelle Passwort ist nicht korrekt.",
      );
    }
    this.securityAttempts.delete(user.id);
  }
  private revokeUserTokens(userId: string) {
    for (const [key, value] of this.store.sessions)
      if (value.userId === userId) this.store.sessions.delete(key);
    for (const [key, value] of this.store.passwordResetTokens)
      if (value.userId === userId) this.store.passwordResetTokens.delete(key);
    for (const [key, value] of this.store.verificationTokens)
      if (value.userId === userId) this.store.verificationTokens.delete(key);
  }
  private async securityNotice(email: string, message: string) {
    try {
      await this.email.sendAccountSecurityNotice(email, message);
    } catch {
      this.logger.warn(
        "Sicherheitsbenachrichtigung konnte nicht zugestellt werden.",
      );
    }
  }
  async changePassword(
    authorization: string | undefined,
    input: Record<string, unknown>,
  ) {
    const user = this.authenticate(authorization),
      previous = user.passwordHash;
    await this.reauthenticate(user, input.currentPassword);
    const password = requiredText(input.newPassword, "Neues Passwort", 12, 200);
    if (password !== input.confirmPassword)
      throw new BadRequestException(
        "Die neuen Passwörter stimmen nicht überein.",
      );
    try {
      validatePasswordStrength(password);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "Ungültiges Passwort.",
      );
    }
    if (await verifyPassword(password, previous))
      throw new BadRequestException(
        "Bitte ein anderes neues Passwort verwenden.",
      );
    const next = await hashPassword(password);
    if (user.passwordHash !== previous)
      throw new ConflictException(
        "Die Zugangsdaten wurden zwischenzeitlich geändert. Bitte erneut anmelden.",
      );
    user.passwordHash = next;
    delete user.pendingEmailChange;
    this.revokeUserTokens(user.id);
    await this.store.persist();
    await this.securityNotice(
      user.email,
      "Das Passwort Ihres Partnerportal-Kontos wurde geändert. Alle angemeldeten Sitzungen wurden beendet.",
    );
    return { changed: true, reauthenticationRequired: true };
  }
  async requestEmailChange(
    authorization: string | undefined,
    input: Record<string, unknown>,
  ) {
    const user = this.authenticate(authorization),
      previous = user.passwordHash,
      previousEmail = user.email;
    await this.reauthenticate(user, input.currentPassword);
    const email = emailAddress(input.newEmail);
    if (email === user.email)
      throw new BadRequestException("Bitte eine neue E-Mail-Adresse eingeben.");
    if (this.store.userByEmail.has(email))
      throw new ConflictException(
        "Diese E-Mail-Adresse kann nicht verwendet werden.",
      );
    if (
      user.pendingEmailChange &&
      Date.parse(user.pendingEmailChange.requestedAt) > Date.now() - 60_000
    )
      throw new BadRequestException(
        "Bitte eine Minute warten, bevor Sie einen neuen Bestätigungslink anfordern.",
      );
    const token = opaqueToken(),
      requestedAt = new Date().toISOString(),
      pending = {
        email,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        requestedAt,
        passwordFingerprint: tokenHash(previous),
      };
    const network = this.store.networkMemberships.find(
        (m) => m.userId === user.id && m.status === "active",
      ),
      slug = network
        ? this.store.networks.get(network.networkId)?.slug
        : undefined;
    await this.email.sendEmailChange({
      email,
      firstName: user.firstName,
      token,
      networkSlug: slug,
    });
    if (user.passwordHash !== previous || user.email !== previousEmail)
      throw new ConflictException(
        "Die Zugangsdaten wurden zwischenzeitlich geändert. Bitte erneut anmelden.",
      );
    user.pendingEmailChange = pending;
    await this.store.persist();
    await this.securityNotice(
      user.email,
      "Eine Änderung Ihrer Login-E-Mail-Adresse auf " +
        email +
        " wurde angefordert. Ohne Bestätigung bleibt Ihre bisherige Adresse gültig.",
    );
    return {
      requested: true,
      ...(this.email.directLinksEnabled() ? { confirmationToken: token } : {}),
    };
  }
  async cancelEmailChange(
    authorization: string | undefined,
    input: Record<string, unknown>,
  ) {
    const user = this.authenticate(authorization);
    await this.reauthenticate(user, input.currentPassword);
    delete user.pendingEmailChange;
    await this.store.persist();
    return { cancelled: true };
  }
  async confirmEmailChange(input: Record<string, unknown>) {
    const raw = requiredText(input.token, "Bestätigungscode", 20, 200),
      hash = tokenHash(raw),
      user = [...this.store.users.values()].find(
        (u) => u.pendingEmailChange?.tokenHash === hash,
      ),
      pending = user?.pendingEmailChange;
    if (
      !user ||
      !pending ||
      Date.parse(pending.expiresAt) <= Date.now() ||
      pending.passwordFingerprint !== tokenHash(user.passwordHash)
    )
      throw new BadRequestException(
        "Der Bestätigungslink ist ungültig oder abgelaufen.",
      );
    const previous = user.passwordHash;
    await this.reauthenticate(user, input.currentPassword);
    if (
      user.pendingEmailChange?.tokenHash !== hash ||
      user.passwordHash !== previous
    )
      throw new BadRequestException(
        "Der Bestätigungslink ist nicht mehr gültig.",
      );
    if (this.store.userByEmail.has(pending.email))
      throw new ConflictException(
        "Diese E-Mail-Adresse kann nicht verwendet werden.",
      );
    const oldEmail = user.email;
    this.store.userByEmail.delete(oldEmail);
    user.email = pending.email;
    user.emailVerifiedAt = new Date().toISOString();
    this.store.userByEmail.set(user.email, user.id);
    delete user.pendingEmailChange;
    this.revokeUserTokens(user.id);
    await this.store.persist();
    await this.securityNotice(
      oldEmail,
      "Ihre Login-E-Mail-Adresse wurde auf " +
        user.email +
        " geändert. Alle Sitzungen wurden beendet.",
    );
    return { changed: true, reauthenticationRequired: true };
  }
  authenticate(header: string | undefined) {
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const session = this.store.sessions.get(tokenHash(token));
    if (!session || Date.parse(session.expiresAt) <= Date.now())
      throw new UnauthorizedException(
        "Die Sitzung ist ungültig oder abgelaufen.",
      );
    const user = this.store.users.get(session.userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private publicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    accountRole: string;
    emailVerifiedAt: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountRole: user.accountRole,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }
}
