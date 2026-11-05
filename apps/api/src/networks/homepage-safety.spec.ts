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
        return [{revision:payloads.length}];
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
  it("a failed database write keeps public reads unavailable until recovery", async () => {
    const store = new PortalStore();
    (store as any).sql = {
      unsafe: async () => {
        throw Error("synthetic database failure");
      },
    };
    await expect(store.persist()).rejects.toThrow();
    expect(store.homepageReadsSafe()).toBe(false);
  });
  it("coalesces 200 simultaneous persistence barriers without retaining 200 snapshots", async () => {
    const store=new PortalStore();let writes=0;let persisted="";
    (store as any).sql={unsafe:async(_sql:string,p:string[])=>{writes++;persisted=p[0];return [{revision:writes}];}};
    const pending=[];
    for(let i=0;i<200;i++){store.notifications.push({id:String(i)} as any);pending.push(store.persist());}
    await Promise.all(pending);
    expect(writes).toBe(1);
    expect(JSON.parse(persisted).notifications).toHaveLength(200);
    expect(store.homepageReadsSafe()).toBe(true);
    await store.persist();expect(writes).toBe(2);
  });
  it("recovers the persistence queue after a transient failure and never acknowledges a failed write", async () => {
    const store=new PortalStore();let fail=true;
    (store as any).sql={unsafe:async()=>{if(fail)throw Error("temporary");return [{revision:1}];}};
    await expect(store.persist()).rejects.toThrow("temporary");
    expect(store.persistenceReady()).toBe(false);
    fail=false;await store.persist();
    expect(store.persistenceReady()).toBe(true);
    expect(store.homepageReadsSafe()).toBe(true);
  });
  it("refuses a stale writer rather than replacing another process's newer database revision", async () => {
    const store=new PortalStore();let writes=0;
    (store as any).sql={unsafe:async(sql:string,args:unknown[])=>{writes++;expect(sql).toContain("WHERE portal_state.revision=$2");expect(args[1]).toBe(0);return [];}};
    await expect(store.persist()).rejects.toThrow(/Paralleler/);
    await expect(store.persist()).rejects.toThrow(/parallel/);
    expect(writes).toBe(1);expect(store.persistenceReady()).toBe(false);
  });
});
