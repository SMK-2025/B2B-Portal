import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const db = process.env.HOMEPAGE_TEST_DATABASE_URL;
if (db) {
  const u = new URL(db);
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname),
    "Only local isolated test databases allowed",
  );
  assert.match(
    u.pathname,
    /^\/uf_homepage_test_[a-z0-9_]+$/,
    "Dedicated test database name required",
  );
}
// Never inherit production credentials or bootstrap users into any external database.
delete process.env.DATABASE_URL;
delete process.env.PLATFORM_ADMIN_EMAIL;
delete process.env.PLATFORM_ADMIN_PASSWORD;
process.env.NODE_ENV = "test";
process.env.WEB_ORIGINS = "http://127.0.0.1:3011";
process.env.PUBLIC_HOMEPAGE_MEDIA_ORIGIN = "https://api.example.test";
if (db) process.env.DATABASE_URL = db;
const { createPortalApp } = require("../dist/bootstrap.js");
const { PortalStore } = require("../dist/core/portal.store.js");
const { AuthService } = require("../dist/auth/auth.service.js");
let app, base, store, homepage;
const password = "Synthetic-only-" + randomUUID();
async function start() {
  app = await createPortalApp();
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  store = app.get(PortalStore);
}
async function request(path, { token, body } = {}) {
  const r = await fetch(base + "/api" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, headers: r.headers, body: await r.json() };
}
const feed = "/networks/homepage/unternehmerfreunde/feed",
  prefix = "/networks/homepage/unternehmerfreunde";
async function account(email, role = "user") {
  const auth = app.get(AuthService);
  await auth.ensurePlatformAdmin({
    email,
    password,
    firstName: "Synthetic",
    lastName: "Test",
  });
  const id = store.userByEmail.get(email);
  store.users.get(id).accountRole = role;
  const login = await request("/auth/login", { body: { email, password } });
  assert.equal(login.status, 201);
  return { id, token: login.body.token };
}
const now = new Date().toISOString();
const grant = {
  enabled: true,
  fields: ["title", "description"],
  rightsConfirmed: true,
  updatedAt: now,
  approvedBy: "legacy-admin",
};
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
try {
  await start();
  assert.equal(
    store.users.size,
    0,
    "Test database must be empty; do not reuse a database",
  );
  const owner = await account("owner@example.test"),
    manager = await account("manager@example.test"),
    foreign = await account("foreign@example.test"),
    regular = await account("regular@example.test"),
    platform = await account("platform@example.test", "platform_admin");
  for (const [id, slug] of [
    ["n", "unternehmerfreunde"],
    ["other", "other"],
  ]) {
    store.networks.set(id, {
      id,
      slug,
      status: "active",
      enabledModules: ["profiles", "events"],
      name: "Synthetic network",
    });
    store.networkBySlug.set(slug, id);
  }
  const profile = {
    companyName: "TESTDATEN Example",
    description: "Synthetic profile only",
    industries: "Text industry",
    services: "Text services",
    status: "published",
    logoUrl: png,
    contactEmail: "PRIVATE_MARKER@example.test",
    contactPhone: "PRIVATE_MARKER",
    updatedAt: now,
  };
  store.organizations.set("o", {
    id: "o",
    displayName: "TEST",
    networkProfile: profile,
  });
  for (const [id, networkId, userId, role] of [
    ["member", "n", owner.id, "partner"],
    ["second", "other", owner.id, "partner"],
    ["manager", "n", manager.id, "network_admin"],
    ["foreign", "other", foreign.id, "network_admin"],
    ["regular", "n", regular.id, "partner"],
  ])
    store.networkMemberships.push({
      id,
      networkId,
      userId,
      organizationId: "o",
      role,
      status: "active",
      updatedAt: now,
      homepageGrants: { members: grant },
    });
  await store.persist();
  assert.equal(
    (await request(feed)).body.members.length,
    0,
    "Legacy administrator grants are not consent",
  );
  assert.equal((await request(prefix + "/manage")).status, 401);
  assert.equal(
    (await request(prefix + "/manage", { token: foreign.token })).status,
    403,
  );
  assert.equal(
    (await request(prefix + "/manage", { token: regular.token })).status,
    403,
  );
  const consent = {
    enabled: true,
    fields: ["title", "description", "industry", "services", "image"],
    rightsConfirmed: true,
  };
  assert.equal(
    (
      await request(prefix + "/members/member", {
        token: platform.token,
        body: consent,
      })
    ).status,
    403,
    "Even platform admins cannot consent for a member",
  );
  assert.equal(
    (
      await request(prefix + "/members/member/consent", {
        token: manager.token,
        body: consent,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(prefix + "/members/second/consent", {
        token: owner.token,
        body: consent,
      })
    ).status,
    404,
    "Other membership excluded",
  );
  assert.equal(
    (
      await request(prefix + "/members/member/preview", {
        token: owner.token,
        body: consent,
      })
    ).status,
    201,
  );
  assert.equal(
    (await request(feed)).body.members.length,
    0,
    "Preview does not save consent",
  );
  assert.equal(
    (
      await request(prefix + "/members/member/consent", {
        token: owner.token,
        body: consent,
      })
    ).status,
    201,
  );
  let publicFeed = await request(feed);
  assert.equal(publicFeed.status, 200);
  assert.equal(publicFeed.body.members.length, 1);
  assert.equal(publicFeed.body.members[0].services, "Text services");
  assert.doesNotMatch(
    JSON.stringify(publicFeed.body),
    /PRIVATE_MARKER|base64|passwordHash|approvedBy/,
  );
  assert.match(publicFeed.headers.get("cache-control"), /no-store/);
  const mediaUrl = new URL(publicFeed.body.members[0].image);
  let media = await fetch(base + mediaUrl.pathname);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");
  assert.ok(Number(media.headers.get("content-length")) < 1500000);
  assert.equal(
    (
      await request(prefix + "/members/member/moderation", {
        token: foreign.token,
        body: { hidden: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(prefix + "/members/member/moderation", {
        token: manager.token,
        body: { hidden: true, fields: ["email"] },
      })
    ).status,
    400,
  );
  await request(prefix + "/members/member/moderation", {
    token: manager.token,
    body: { hidden: true },
  });
  assert.equal((await request(feed)).body.members.length, 0);
  await request(prefix + "/members/member/consent", {
    token: owner.token,
    body: consent,
  });
  assert.equal(
    (await request(feed)).body.members.length,
    0,
    "Consent cannot undo moderation",
  );
  await request(prefix + "/members/member/moderation", {
    token: manager.token,
    body: { hidden: false },
  });
  assert.equal((await request(feed)).body.members.length, 1);
  profile.description = "Synthetic changed description";
  profile.updatedAt = new Date().toISOString();
  await store.persist();
  assert.equal(
    (await request(feed)).body.members[0].description,
    profile.description,
  );
  // Database-backed run restarts the real app and real PostgreSQL connection.
  if (db) {
    await app.close();
    await start();
    assert.equal(
      (await request(feed)).body.members.length,
      1,
      "Consent restored after restart",
    );
  }
  const event = {
    id: "event",
    networkId: "n",
    type: "event",
    title: "TESTDATEN Event",
    description: "Synthetic public event",
    status: "published",
    visibility: "members",
    createdByUserId: platform.id,
    startsAt: "2026-11-10T08:00:00Z",
    updatedAt: now,
    data: {
      category: "Netzwerkveranstaltung",
      imageUrl: png,
      timezone: "Europe/Berlin",
      publicLocation: "Synthetic location",
      organizer: "Synthetic organizer",
      participationTerms: "Synthetic terms",
      cost: "Synthetic cost",
      eventStatus: "scheduled",
    },
  };
  store.networkContents.set("event", event);
  const eventFields = [
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
  ];
  assert.equal(
    (
      await request(prefix + "/events/event", {
        token: foreign.token,
        body: { enabled: true, fields: eventFields, rightsConfirmed: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(prefix + "/events/event", {
        token: platform.token,
        body: { enabled: true, fields: eventFields, rightsConfirmed: true },
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request("/networks/n/content/event", {
        token: manager.token,
        body: {
          description: "Changed via actual HTTP editor",
          data: {
            recapSummary: "Synthetic public recap text",
            recapResults: "PRIVATE_MARKER_RESULTS",
            recapImages: [png],
            eventStatus: "cancelled",
          },
        },
      })
    ).status,
    201,
  );
  let eventFeed = (await request(feed)).body;
  assert.equal(
    eventFeed.events[0].description,
    "Changed via actual HTTP editor",
  );
  assert.equal(eventFeed.events[0].status, "cancelled");
  assert.equal(eventFeed.recaps.length, 0);
  assert.equal(
    (
      await request(prefix + "/recaps/event", {
        token: platform.token,
        body: {
          enabled: true,
          fields: ["title", "description", "date", "images"],
          rightsConfirmed: true,
        },
      })
    ).status,
    201,
  );
  eventFeed = (await request(feed)).body;
  assert.equal(eventFeed.recaps[0].description, "Synthetic public recap text");
  assert.doesNotMatch(JSON.stringify(eventFeed), /PRIVATE_MARKER|base64/);
  assert.equal(
    (
      await request("/networks/n/content/event/delete", {
        token: manager.token,
        body: {},
      })
    ).status,
    201,
  );
  assert.equal((await request(feed)).body.recaps.length, 0);
  const checkout = process.env.HOMEPAGE_CHECKOUT;
  if (checkout) {
    assert.equal(
      readFileSync(resolve(checkout, "contracts/homepage-v1.json"), "utf8"),
      readFileSync(resolve("src/networks/contracts/homepage-v1.json"), "utf8"),
      "Portal and homepage must use identical v1 schemas",
    );
    homepage = spawn(
      process.execPath,
      [
        "--import",
        pathToFileURL(resolve(checkout, "tests/helpers/mock-portal.mjs")).href,
        resolve(checkout, "node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3012",
      ],
      {
        cwd: checkout,
        env: {
          ...process.env,
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          SITE_INDEXABLE: "true",
          SITE_URL: "https://www.unternehmerfreunde-nrw.de",
          HOMEPAGE_TEST_DATA: "false",
          PORTAL_PUBLIC_API_URL: "https://api.example.test/public-feed",
          ACCEPTANCE_LOCAL_API: base,
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let output = "";
    homepage.stdout.on("data", (x) => (output += x));
    homepage.stderr.on("data", (x) => (output += x));
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (homepage.exitCode !== null) throw Error(output);
      try {
        const r = await fetch("http://127.0.0.1:3012/mitglieder/member");
        if (r.status === 200) {
          const html = await r.text();
          assert.match(html, /TESTDATEN Example/);
          assert.match(html, /application\/ld\+json/);
          assert.doesNotMatch(html, /PRIVATE_MARKER|passwordHash|approvedBy/);
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Actual portal feed renders in built homepage");
    const sitemap = await (
      await fetch("http://127.0.0.1:3012/sitemap.xml")
    ).text();
    assert.match(sitemap, /mitglieder\/member/);
    assert.doesNotMatch(sitemap, /PRIVATE_MARKER/);
  }
  const revoked = await request(prefix + "/members/member/consent", {
    token: owner.token,
    body: { enabled: false },
  });
  assert.equal(revoked.status, 201);
  assert.equal((await request(feed)).body.members.length, 0);
  assert.equal(
    (await fetch(base + mediaUrl.pathname)).status,
    404,
    "Withdrawn media unavailable",
  );
  if (checkout) {
    assert.equal(
      (await fetch("http://127.0.0.1:3012/mitglieder/member")).status,
      404,
    );
    assert.doesNotMatch(
      await (await fetch("http://127.0.0.1:3012/sitemap.xml")).text(),
      /mitglieder\/member/,
    );
  }
  if (db) {
    await app.close();
    await start();
    assert.equal(
      (await request(feed)).body.members.length,
      0,
      "Revocation survives restart",
    );
  }
  assert.equal((await request("/networks/homepage/other/feed")).status, 404);
  store.networkMemberships.splice(
    store.networkMemberships.findIndex((m) => m.id === "member"),
    1,
  );
  await store.persist();
  assert.equal(
    (
      await request(prefix + "/members/member/consent", {
        token: owner.token,
        body: consent,
      })
    ).status,
    404,
  );
  let limited = false;
  for (let i = 0; i < 125; i++) {
    const r = await request(feed);
    if (r.status === 429) {
      limited = true;
      break;
    }
  }
  assert.ok(
    limited,
    "Same server IP is rate-limited; do not trust arbitrary forwarded identifiers",
  );
  console.log(
    JSON.stringify(
      {
        http: "passed",
        auth: "real password login and session verification",
        middleware: "production bootstrap and PersistenceInterceptor",
        database: db
          ? "isolated local PostgreSQL; restart and revocation tested"
          : "NOT TESTED: memory-only, no PostgreSQL configured",
        localPortalToHomepage: checkout
          ? "passed via test-only loopback transport adapter"
          : "NOT TESTED: set HOMEPAGE_CHECKOUT",
        staging: "NOT TESTED",
      },
      null,
      2,
    ),
  );
} finally {
  if (homepage && homepage.exitCode === null)
    await new Promise((r) => {
      homepage.once("exit", r);
      homepage.kill();
    });
  await app?.close();
}
