import { describe, it, expect } from "vitest";
import { PortalStore } from "../core/portal.store";
import { decodePublicImage, publicImageUrl } from "./homepage-media";
import { assertContract } from "./contracts/validate";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
describe("public homepage safety boundaries", () => {
  it("only accepts bounded raster bytes; no remote requests or signed URLs", () => {
    expect(decodePublicImage(png)?.type).toBe("image/png");
    for (const v of [
      "https://127.0.0.1/private.png",
      "https://cdn.example.test/a.png?signature=private",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/png;base64,PHNjcmlwdD4=",
      "data:image/png;base64," + "A".repeat(2_000_001),
    ])
      expect(decodePublicImage(v)).toBeNull();
    process.env.PUBLIC_HOMEPAGE_MEDIA_ORIGIN = "https://api.example.test";
    expect(publicImageUrl(png, "members", "member", "image")).toMatch(
      /\/members\/member\/media\/image$/,
    );
    process.env.PUBLIC_HOMEPAGE_MEDIA_ORIGIN = "https://127.0.0.1";
    expect(publicImageUrl(png, "members", "member", "image")).toBeNull();
  });
  it("differentiates contract envelope and record failures", () => {
    expect(() =>
      assertContract({
        version: 1,
        network: "unternehmerfreunde",
        members: [],
      }),
    ).toThrow("ENVELOPE");
    expect(() =>
      assertContract({
        version: 1,
        network: "unternehmerfreunde",
        members: [{}],
        events: [],
        recaps: [],
      }),
    ).toThrow("RECORD");
    expect(() =>
      assertContract({
        version: 1,
        network: "unternehmerfreunde",
        members: [],
        events: [],
        recaps: [],
      }),
    ).not.toThrow();
  });
  it("queues snapshots in process order and blocks public reads during persistence", async () => {
    const store = new PortalStore();
    const payloads: string[] = [];
    let complete: (() => void) | undefined;
    (store as any).sql = {
      unsafe: async (_query: string, params: string[]) => {
        payloads.push(params[0]);
        if (payloads.length === 1)
          await new Promise<void>((resolve) => {
            complete = resolve;
          });
      },
    };
    store.networkMemberships.push({
      id: "member",
      homepageHidden: false,
    } as any);
    const first = store.persist();
    await Promise.resolve();
    expect(store.homepageReadsSafe()).toBe(false);
    store.networkMemberships[0].homepageHidden = true;
    const second = store.persist();
    complete!();
    await Promise.all([first, second]);
    expect(JSON.parse(payloads[0]).networkMemberships[0].homepageHidden).toBe(
      false,
    );
    expect(JSON.parse(payloads[1]).networkMemberships[0].homepageHidden).toBe(
      true,
    );
    expect(store.homepageReadsSafe()).toBe(true);
  });
  it("a failed database write keeps public reads unavailable until restart", async () => {
    const store = new PortalStore();
    (store as any).sql = {
      unsafe: async () => {
        throw Error("synthetic database failure");
      },
    };
    await expect(store.persist()).rejects.toThrow();
    expect(store.homepageReadsSafe()).toBe(false);
  });
});
