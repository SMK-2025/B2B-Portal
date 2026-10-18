import { describe, it, expect, vi } from "vitest";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { PortalStore } from "../core/portal.store";
describe("personal account security", () => {
  async function fixture() {
    const store = new PortalStore(),
      email = new EmailService();
    email.sendVerification = vi.fn().mockResolvedValue(undefined);
    email.sendPasswordReset = vi.fn().mockResolvedValue(undefined);
    email.sendEmailChange = vi.fn().mockResolvedValue(undefined);
    email.sendAccountSecurityNotice = vi.fn().mockResolvedValue(undefined);
    const auth = new AuthService(store, email),
      password = "Sicher-Alt-2026!",
      next = "Sicher-Neu-2026!";
    async function user(address: string) {
      const registered = await auth.register({
        email: address,
        password,
        firstName: "Test",
        lastName: "Person",
      });
      auth.verifyEmail(registered.verificationToken);
      const session = await auth.login({ email: address, password });
      return { id: registered.user.id, bearer: "Bearer " + session.token };
    }
    return { store, email, auth, password, next, user };
  }
  it("requires the current password and matching strong new passwords; revokes all sessions and reset links", async () => {
    const f = await fixture(),
      u = await f.user("one@example.invalid"),
      other = await f.user("two@example.invalid");
    const second = await f.auth.login({
      email: "one@example.invalid",
      password: f.password,
    });
    await f.auth.requestPasswordReset({ email: "one@example.invalid" });
    await expect(
      f.auth.changePassword(u.bearer, {
        currentPassword: "wrong",
        newPassword: f.next,
        confirmPassword: f.next,
      }),
    ).rejects.toThrow(/aktuelle Passwort/);
    await expect(
      f.auth.changePassword(u.bearer, {
        currentPassword: f.password,
        newPassword: f.next,
        confirmPassword: "different",
      }),
    ).rejects.toThrow(/überein/);
    await expect(
      f.auth.changePassword(u.bearer, {
        currentPassword: f.password,
        newPassword: "aaaaaaaaaaaa",
        confirmPassword: "aaaaaaaaaaaa",
      }),
    ).rejects.toThrow();
    await f.auth.changePassword(u.bearer, {
      currentPassword: f.password,
      newPassword: f.next,
      confirmPassword: f.next,
    });
    expect(() => f.auth.authenticate(u.bearer)).toThrow();
    expect(() => f.auth.authenticate("Bearer " + second.token)).toThrow();
    expect(f.auth.authenticate(other.bearer).id).toBe(other.id);
    expect(f.store.passwordResetTokens.size).toBe(0);
    await expect(
      f.auth.login({ email: "one@example.invalid", password: f.password }),
    ).rejects.toThrow();
    await expect(
      f.auth.login({ email: "one@example.invalid", password: f.next }),
    ).resolves.toHaveProperty("token");
  });
  it("keeps old email until a single-use email proof plus password; preserves identity and invalidates sessions", async () => {
    const f = await fixture(),
      u = await f.user("old@example.invalid"),
      requested = await f.auth.requestEmailChange(u.bearer, {
        newEmail: "new@example.invalid",
        currentPassword: f.password,
      });
    expect(f.auth.account(u.bearer).email).toBe("old@example.invalid");
    expect(f.email.sendEmailChange).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.invalid" }),
    );
    expect(JSON.stringify(f.auth.account(u.bearer))).not.toContain("tokenHash");
    await expect(
      f.auth.confirmEmailChange({
        token: requested.confirmationToken,
        currentPassword: "wrong",
      }),
    ).rejects.toThrow();
    await f.auth.confirmEmailChange({
      token: requested.confirmationToken,
      currentPassword: f.password,
    });
    expect(f.store.userByEmail.get("new@example.invalid")).toBe(u.id);
    expect(f.store.userByEmail.has("old@example.invalid")).toBe(false);
    expect(() => f.auth.authenticate(u.bearer)).toThrow();
    await expect(
      f.auth.confirmEmailChange({
        token: requested.confirmationToken,
        currentPassword: f.password,
      }),
    ).rejects.toThrow(/ungültig/);
    await expect(
      f.auth.login({ email: "new@example.invalid", password: f.password }),
    ).resolves.toHaveProperty("token");
  });
  it("rejects occupied addresses and expired tokens and allows secure cancellation", async () => {
    const f = await fixture(),
      u = await f.user("old@example.invalid");
    await f.user("taken@example.invalid");
    await expect(
      f.auth.requestEmailChange(u.bearer, {
        newEmail: "taken@example.invalid",
        currentPassword: f.password,
      }),
    ).rejects.toThrow(/verwendet/);
    const requested = await f.auth.requestEmailChange(u.bearer, {
      newEmail: "new@example.invalid",
      currentPassword: f.password,
    });
    f.store.users.get(u.id)!.pendingEmailChange!.expiresAt =
      "2020-01-01T00:00:00Z";
    await expect(
      f.auth.confirmEmailChange({
        token: requested.confirmationToken,
        currentPassword: f.password,
      }),
    ).rejects.toThrow(/abgelaufen/);
    await f.auth.cancelEmailChange(u.bearer, { currentPassword: f.password });
    expect(f.store.users.get(u.id)!.pendingEmailChange).toBeUndefined();
  });
  it("does not change anything if the confirmation email cannot be sent", async () => {
    const f = await fixture(),
      u = await f.user("old@example.invalid");
    f.email.sendEmailChange = vi
      .fn()
      .mockRejectedValue(new Error("Mail unavailable"));
    await expect(
      f.auth.requestEmailChange(u.bearer, {
        newEmail: "new@example.invalid",
        currentPassword: f.password,
      }),
    ).rejects.toThrow("Mail unavailable");
    expect(f.store.users.get(u.id)!.pendingEmailChange).toBeUndefined();
    expect(f.auth.account(u.bearer).email).toBe("old@example.invalid");
  });
  it("blocks repeated incorrect security passwords", async () => {
    const f = await fixture(),
      u = await f.user("old@example.invalid");
    for (let i = 0; i < 5; i++)
      await expect(
        f.auth.changePassword(u.bearer, { currentPassword: "wrong" }),
      ).rejects.toThrow();
    await expect(
      f.auth.changePassword(u.bearer, {
        currentPassword: f.password,
        newPassword: f.next,
        confirmPassword: f.next,
      }),
    ).rejects.toThrow(/15 Minuten/);
  });
  it("does not overwrite changed admin credentials or recreate the old admin email on restart", async () => {
    const f = await fixture(),
      configuration = {
        email: "admin@example.invalid",
        password: "Admin-Sicher-Alt-2026!",
        firstName: "Admin",
        lastName: "Test",
      };
    const admin = await f.auth.ensurePlatformAdmin(configuration);
    let bearer =
      "Bearer " +
      (
        await f.auth.login({
          email: configuration.email,
          password: configuration.password,
        })
      ).token;
    await f.auth.changePassword(bearer, {
      currentPassword: configuration.password,
      newPassword: f.next,
      confirmPassword: f.next,
    });
    await f.auth.ensurePlatformAdmin(configuration);
    bearer =
      "Bearer " +
      (await f.auth.login({ email: configuration.email, password: f.next }))
        .token;
    const request = await f.auth.requestEmailChange(bearer, {
      newEmail: "admin-new@example.invalid",
      currentPassword: f.next,
    });
    await f.auth.confirmEmailChange({
      token: request.confirmationToken,
      currentPassword: f.next,
    });
    expect((await f.auth.ensurePlatformAdmin(configuration)).id).toBe(admin.id);
    expect(f.store.users.size).toBe(1);
    expect(f.store.userByEmail.has(configuration.email)).toBe(false);
  });
});
