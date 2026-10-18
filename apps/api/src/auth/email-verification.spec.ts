import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";
import { PortalStore } from "../core/portal.store";
import { tokenHash } from "./password";

describe("registration email confirmation retries", () => {
  it("accepts repeated confirmation without creating sessions; still rejects expiry and unknown tokens", async () => {
    const store = new PortalStore();
    const auth = new AuthService(store);
    const registration = await auth.register({
      email: "retry@example.de",
      password: "Sicher-Portal-2026!",
      firstName: "Test",
      lastName: "Partner",
    });
    const token = registration.verificationToken!;
    expect(auth.verifyEmail(token)).toEqual({ verified: true });
    expect(auth.verifyEmail(token)).toEqual({ verified: true });
    expect(store.sessions.size).toBe(0);
    expect(() =>
      auth.verifyEmail("unknown-confirmation-token-123456789"),
    ).toThrow(/ungültig/);
    store.verificationTokens.get(tokenHash(token))!.expiresAt = new Date(
      0,
    ).toISOString();
    expect(() => auth.verifyEmail(token)).toThrow(/abgelaufen/);
  });
});
