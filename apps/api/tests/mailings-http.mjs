// Isolated HTTP acceptance test: no database and no external email dispatch.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { generateKeyPairSync, sign } from "node:crypto";
const require = createRequire(import.meta.url);
process.env.NODE_ENV = "test";
delete process.env.DATABASE_URL;
process.env.WEB_ORIGINS = "http://localhost:3112";
process.env.PUBLIC_WEB_URL = "https://b2b-matching.de";
process.env.PUBLIC_MAILING_API_URL = "https://api.example.invalid";
process.env.SENDGRID_API_KEY = "isolated-test";
process.env.MAIL_FROM_EMAIL = "test@example.invalid";
const { createPortalApp } = require("../dist/bootstrap.js");
const { PortalStore } = require("../dist/core/portal.store.js");
const { AuthService } = require("../dist/auth/auth.service.js");
const { EmailService } = require("../dist/auth/email.service.js");
const { NetworksService } = require("../dist/networks/networks.service.js");
const app = await createPortalApp();
const store = app.get(PortalStore),
  auth = app.get(AuthService),
  email = app.get(EmailService);
const actor = {
  id: "qa-owner",
  email: "qa@example.invalid",
  firstName: "QA",
  lastName: "Owner",
  accountRole: "platform_admin",
  passwordHash: "unused",
  createdAt: new Date().toISOString(),
};
store.users.set(actor.id, actor);
const original = auth.authenticate.bind(auth);
auth.authenticate = (header) =>
  header === "Bearer qa-only" ? actor : original(header);
let dispatches = 0;
email.sendCampaignMail = async () => {
  dispatches++;
};
try {
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/mailings`;
  const network = app
    .get(NetworksService)
    .create("Bearer qa-only", { name: "QA Netzwerk", slug: "qa-network" });
  store.networks.get(network.id).status = "active";
  async function request(path, body, authenticated = true) {
    return fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(authenticated ? { authorization: "Bearer qa-only" } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  assert.equal(
    (await request(`/network/${network.id}`, undefined, false)).status,
    401,
  );
  const evidence = {
    at: new Date(Date.now() - 60000).toISOString(),
    source: "Isolierte Testfreigabe",
  };
  assert.equal(
    (
      await request(`/network/${network.id}/import`, {
        rows: [{ email: "lead@example.invalid" }],
        marketing: evidence,
        tracking: evidence,
      })
    ).status,
    201,
  );
  const campaign = await (
    await request(`/network/${network.id}/campaign`, {
      name: "QA Kampagne",
      subject: "QA Netzwerk Einladung",
      body: "Guten Tag, dies ist ein isolierter Abnahmetest ohne echte Empfänger.",
    })
  ).json();
  assert.equal(
    (
      await request(`/campaign/${campaign.id}/send`, {
        confirmName: "QA Kampagne",
        revision: 1,
        expectedCount: 1,
      })
    ).status,
    201,
  );
  assert.equal(dispatches, 1);
  const delivery = Object.values(
    store.mailingCampaigns.get(campaign.id).deliveries,
  )[0];
  const clicked = await fetch(
    `${base}/public/click/${delivery.token}/landing`,
    { redirect: "manual", headers: { "user-agent": "QA browser" } },
  );
  assert.equal(clicked.status, 302);
  assert.match(clicked.headers.get("location"), /ml=/);
  const pixel = await fetch(`${base}/public/image/${delivery.token}.gif`);
  assert.equal(pixel.status, 200);
  assert.match(pixel.headers.get("content-type"), /image\/gif/);
  const unsubscribe = `${base}/public/unsubscribe/${delivery.token}`;
  assert.equal((await fetch(unsubscribe)).status, 200);
  assert.equal(
    store.mailingSuppressions.size,
    0,
    "GET must not unsubscribe on scanner previews",
  );
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  process.env.SENDGRID_EVENT_PUBLIC_KEY = keys.publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify([
    {
      mailingCampaignId: campaign.id,
      mailingLeadId: [...store.mailingLeads.keys()][0],
      event: "delivered",
      timestamp: Number(timestamp),
      sg_event_id: "http-event",
    },
  ]);
  const signature = sign(
    "sha256",
    Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]),
    keys.privateKey,
  ).toString("base64");
  const hook = await fetch(`${base}/public/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-twilio-email-event-webhook-signature": signature,
      "x-twilio-email-event-webhook-timestamp": timestamp,
    },
    body,
  });
  assert.equal(hook.status, 200, await hook.text());
  assert.equal((await request(`/campaign/${campaign.id}/report`)).status, 200);
  const un = await fetch(unsubscribe, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
  });
  assert.equal(un.status, 200);
  assert.equal(store.mailingSuppressions.size, 1);
  console.log(
    "Mailing HTTP acceptance passed: authorization, import, mocked send, click, pixel, raw-body signature and one-click unsubscribe. No real emails.",
  );
} finally {
  await app.close();
}
