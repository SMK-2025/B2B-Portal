import { describe, it, expect, vi } from "vitest";
import { PortalStore } from "./portal.store";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { OperatorMailService } from "../auth/operator-mail.service";
import { enqueueOperatorMail, OPERATOR_EMAIL } from "./operator-mail";
import {
  retireLegacyInitiator,
  resetTestMember,
} from "./retire-legacy-initiator";

describe("targeted account maintenance and durable operator notices", () => {
  it("resets the named test identity once without removing a later registration", async () => {
    const { store, auth } = await fixture();
    const input = {
      email: "mk@hey-five.de",
      password: "Sicher-Portal-2026!",
      firstName: "Test",
      lastName: "Partner",
    };
    const registration = await auth.register(input);
    expect(resetTestMember(store).state).toBe("removed");
    expect(store.users.has(registration.user.id)).toBe(false);
    const replacement = await auth.register(input);
    resetTestMember(store);
    expect(store.users.has(replacement.user.id)).toBe(true);
    expect(store.userByEmail.has("service@b2b-matching.de")).toBe(true);
  });
  async function fixture() {
    const store = new PortalStore(),
      email = new EmailService();
    vi.spyOn(email, "sendVerification").mockResolvedValue();
    const auth = new AuthService(store, email);
    await auth.ensurePlatformAdmin({
      email: OPERATOR_EMAIL,
      password: "Sicher-Portal-2026!",
      firstName: "Martin",
      lastName: "Kelm",
    });
    const target = await auth.register({
      email: "service@b2b-matching.de",
      password: "Sicher-Portal-2026!",
      firstName: "Alter",
      lastName: "Initiator",
    });
    return { store, email, auth, target };
  }
  it("removes the obsolete identity and tokens, preserves the owner, and runs only once", async () => {
    const { store, auth, target } = await fixture();
    expect(retireLegacyInitiator(store).state).toBe("removed");
    expect(store.users.has(target.user.id)).toBe(false);
    expect(store.userByEmail.has("service@b2b-matching.de")).toBe(false);
    expect(
      [...store.verificationTokens.values()].some(
        (t) => t.userId === target.user.id,
      ),
    ).toBe(false);
    expect(
      [...store.users.values()].some((u) => u.email === OPERATOR_EMAIL),
    ).toBe(true);
    const replacement = await auth.register({
      email: "service@b2b-matching.de",
      password: "Sicher-Portal-2026!",
      firstName: "Neuer",
      lastName: "Nutzer",
    });
    retireLegacyInitiator(store);
    expect(store.users.has(replacement.user.id)).toBe(true);
  });
  it("refuses to delete a platform administrator", async () => {
    const { store, target } = await fixture();
    store.users.get(target.user.id)!.accountRole = "platform_admin";
    expect(retireLegacyInitiator(store).state).toBe("blocked");
    expect(store.users.has(target.user.id)).toBe(true);
  });
  it("keeps a failed notice for retry and marks successful provider acceptance", async () => {
    const store = new PortalStore(),
      email = new EmailService();
    const send = vi
      .spyOn(email, "sendOperatorInformation")
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue();
    enqueueOperatorMail(store, "test", "Einladung", "Netzwerk");
    enqueueOperatorMail(store, "test", "duplicate", "duplicate");
    const worker = new OperatorMailService(store, email);
    await worker.flush();
    expect(store.operatorMails.size).toBe(1);
    const record = store.operatorMails.get("test")!;
    expect(record.sentAt).toBeNull();
    expect(record.lastError).toBeTruthy();
    record.nextAttemptAt = new Date(0).toISOString();
    await worker.flush();
    expect(record.sentAt).toBeTruthy();
    expect(record.attempts).toBe(2);
    expect(send).toHaveBeenLastCalledWith("Einladung", "Netzwerk");
  });
});
