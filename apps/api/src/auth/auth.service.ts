import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PortalStore } from "../core/portal.store";
import { emailAddress, requiredText } from "../core/validation";
import { hashPassword, opaqueToken, tokenHash, verifyPassword } from "./password";

@Injectable()
export class AuthService {
  constructor(private readonly store: PortalStore) {}

  async register(input: Record<string, unknown>) {
    const email = emailAddress(input.email);
    if (this.store.userByEmail.has(email)) throw new ConflictException("Für diese E-Mail-Adresse besteht bereits ein Konto.");
    const password = requiredText(input.password, "Passwort", 12, 200);
    const user = { id: randomUUID(), email, passwordHash: await hashPassword(password), firstName: requiredText(input.firstName, "Vorname", 2, 100), lastName: requiredText(input.lastName, "Nachname", 2, 100), accountRole: "user" as const, emailVerifiedAt: null, createdAt: new Date().toISOString() };
    this.store.users.set(user.id, user); this.store.userByEmail.set(email, user.id);
    const verificationToken = opaqueToken(); this.store.verificationTokens.set(tokenHash(verificationToken), { tokenHash: tokenHash(verificationToken), userId: user.id, expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(), usedAt: null });
    return { user: this.publicUser(user), verificationToken };
  }

  verifyEmail(token: unknown) {
    const raw = requiredText(token, "Bestätigungscode", 20, 200); const record = this.store.verificationTokens.get(tokenHash(raw));
    if (!record || record.usedAt || Date.parse(record.expiresAt) <= Date.now()) throw new BadRequestException("Der Bestätigungslink ist ungültig oder abgelaufen.");
    const user = this.store.users.get(record.userId); if (!user) throw new BadRequestException("Das Konto wurde nicht gefunden.");
    user.emailVerifiedAt = new Date().toISOString(); record.usedAt = user.emailVerifiedAt; return { verified: true };
  }

  async login(input: Record<string, unknown>) {
    const email = emailAddress(input.email); const password = requiredText(input.password, "Passwort", 1, 200);
    const userId = this.store.userByEmail.get(email); const user = userId ? this.store.users.get(userId) : undefined;
    if (!user || !(await verifyPassword(password, user.passwordHash))) throw new UnauthorizedException("E-Mail-Adresse oder Passwort ist falsch.");
    if (!user.emailVerifiedAt) throw new UnauthorizedException("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.");
    const token = opaqueToken(); this.store.sessions.set(tokenHash(token), { tokenHash: tokenHash(token), userId: user.id, expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString() });
    return { token, expiresInSeconds: 28_800, user: this.publicUser(user) };
  }

  requestPasswordReset(input: Record<string, unknown>) {
    const email = emailAddress(input.email); const userId = this.store.userByEmail.get(email);
    if (!userId) return { accepted: true };
    const resetToken = opaqueToken();
    this.store.passwordResetTokens.set(tokenHash(resetToken), { tokenHash: tokenHash(resetToken), userId, expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(), usedAt: null });
    return { accepted: true, resetToken };
  }

  async resetPassword(input: Record<string, unknown>) {
    const raw = requiredText(input.token, "Zurücksetzungscode", 20, 200);
    const password = requiredText(input.password, "Passwort", 12, 200);
    const record = this.store.passwordResetTokens.get(tokenHash(raw));
    if (!record || record.usedAt || Date.parse(record.expiresAt) <= Date.now()) throw new BadRequestException("Der Link zum Zurücksetzen ist ungültig oder abgelaufen.");
    const user = this.store.users.get(record.userId); if (!user) throw new BadRequestException("Das Konto wurde nicht gefunden.");
    user.passwordHash = await hashPassword(password); record.usedAt = new Date().toISOString();
    for (const [key,session] of this.store.sessions) if (session.userId === user.id) this.store.sessions.delete(key);
    return { changed: true };
  }

  authenticate(header: string | undefined) {
    const token = header?.startsWith("Bearer ") ? header.slice(7) : ""; const session = this.store.sessions.get(tokenHash(token));
    if (!session || Date.parse(session.expiresAt) <= Date.now()) throw new UnauthorizedException("Die Sitzung ist ungültig oder abgelaufen.");
    const user = this.store.users.get(session.userId); if (!user) throw new UnauthorizedException(); return user;
  }

  private publicUser(user: { id: string; email: string; firstName: string; lastName: string; accountRole: string; emailVerifiedAt: string | null }) {
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, accountRole: user.accountRole, emailVerified: Boolean(user.emailVerifiedAt) };
  }
}
