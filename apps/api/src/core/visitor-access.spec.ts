import { describe, it, expect } from "vitest";
import { of, firstValueFrom } from "rxjs";
import { PersistenceInterceptor } from "./persistence.interceptor";
import { PortalStore } from "./portal.store";
import { tokenHash } from "../auth/password";
import type { ExecutionContext } from "@nestjs/common";

describe("visitor API boundary", () => {
  it("blocks all data mutations before handlers while allowing authenticated read endpoints", async () => {
    const store = new PortalStore();
    store.users.set("visitor", {
      id: "visitor",
      email: "visitor@example.de",
      passwordHash: "unused",
      firstName: "Visitor",
      lastName: "",
      accountRole: "user",
      emailVerifiedAt: "now",
      createdAt: "now",
      visitorNetworkId: "network",
    });
    store.sessions.set(tokenHash("test"), {
      tokenHash: tokenHash("test"),
      userId: "visitor",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const interceptor = new PersistenceInterceptor(store);
    let called = false;
    const next = {
      handle: () => {
        called = true;
        return of("ok");
      },
    };
    const context = (method: string, path: string, networkId = "network") =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            path,
            headers: { authorization: "Bearer test" },
            params: { networkId },
          }),
        }),
      }) as unknown as ExecutionContext;
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() =>
        interceptor.intercept(
          context(method, "/api/networks/network/content"),
          next,
        ),
      ).toThrow();
      expect(called).toBe(false);
    }
    expect(() =>
      interceptor.intercept(
        context("GET", "/api/networks/other/content", "other"),
        next,
      ),
    ).toThrow();
    expect(
      await firstValueFrom(
        interceptor.intercept(
          context("GET", "/api/networks/network/content"),
          next,
        ),
      ),
    ).toBe("ok");
    expect(
      await firstValueFrom(
        interceptor.intercept(context("POST", "/api/auth/session/check"), next),
      ),
    ).toBe("ok");
  });
});
