import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { MailingsService } from "./mailings.service";
import { PortalStore } from "../core/portal.store";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { NetworksService } from "../networks/networks.service";
import { opaqueToken, tokenHash } from "../auth/password";
import {
  attributeMailingRegistration,
  attributeMailingVerification,
} from "./mailing-attribution";
import { parseMailingCsv } from "../../../web/src/app/lib/mailing-csv";
const evidence = {
  at: new Date(Date.now() - 60000).toISOString(),
  source: "Dokumentierte Formularfreigabe",
};
function setup() {
  const store = new PortalStore();
  const actor = {
    id: "owner",
    email: "owner@example.de",
    firstName: "Owner",
    lastName: "Test",
    accountRole: "platform_admin",
  };
  const auth = { authenticate: vi.fn(() => actor) } as unknown as AuthService;
  store.users.set(actor.id, {
    ...actor,
    accountRole: "platform_admin",
    passwordHash: "unused",
    emailVerifiedAt: evidence.at,
    createdAt: evidence.at,
  });
  const email = {
    sendCampaignMail: vi.fn(async () => {}),
  } as unknown as EmailService;
  const ns = new NetworksService(store, auth, email);
  const a = ns.create("owner", {
    name: "Unternehmernetzwerk Leverkusen",
    slug: "unternehmernetzwerkleverkusen",
  });
  const b = ns.create("owner", { name: "Anderes Netzwerk", slug: "anderes" });
  store.networks.get(a.id)!.status = "active";
  const service = new MailingsService(store, auth, email);
  function lead(tracking = true, marketing = true, network = a.id) {
    service.importLeads("owner", network, {
      rows: [
        {
          email: "lead@example.de",
          firstName: "Ada",
          company: "Test <script>",
        },
      ],
      ...(marketing ? { marketing: evidence } : {}),
      ...(tracking ? { tracking: evidence } : {}),
    });
    return [...store.mailingLeads.values()].find(
      (l) => l.networkId === network,
    )!;
  }
  function campaign() {
    return service.saveCampaign("owner", a.id, {
      name: "Erstes Mailing",
      subject: "Vernetzen in Leverkusen",
      body: "Guten Tag {{firstName}},\nunsere Einladung zum lokalen Netzwerken.",
    }).id;
  }
  async function send(id: string) {
    return service.sendBatch("owner", id, {
      confirmName: "Erstes Mailing",
      revision: 1,
      expectedCount: service.report("owner", id).eligible,
    });
  }
  return { store, actor, auth, email, service, a, b, lead, campaign, send };
}
beforeEach(() => {
  vi.stubEnv("PUBLIC_MAILING_API_URL", "https://api.example.de");
  vi.stubEnv("PUBLIC_WEB_URL", "https://b2b-matching.de");
  vi.stubEnv("SENDGRID_API_KEY", "test-not-real");
  vi.stubEnv("MAIL_FROM_EMAIL", "owner@example.de");
});
afterEach(() => vi.unstubAllEnvs());
describe("owner mailing system", () => {
  it("limits all campaigns to 30 persisted delivery attempts in a rolling hour", async () => {
    const s = setup();
    s.service.importLeads('owner', s.a.id, {
      rows: Array.from({length: 40}, (_, i) => ({email: `lead${i}@example.de`})),
      marketing: evidence,
    });
    const id = s.campaign();
    expect((await s.send(id)).submitted).toBe(20);
    expect((await s.send(id)).submitted).toBe(10);
    await expect(s.send(id)).rejects.toThrow('Stundenlimit');
    const second = s.service.saveCampaign('owner', s.a.id, {name:'Andere Kampagne',subject:'Weitere Einladung',body:'Ein weiterer ausreichend langer Einladungstext.'});
    await expect(s.service.sendBatch('owner',second.id,{confirmName:'Andere Kampagne',revision:1,expectedCount:s.service.report('owner',second.id).eligible})).rejects.toThrow('Stundenlimit');
    for (const delivery of Object.values(s.store.mailingCampaigns.get(id)!.deliveries)) delivery.startedAt = new Date(Date.now() - 3_600_001).toISOString();
    expect((await s.send(id)).submitted).toBe(10);
    expect(s.email.sendCampaignMail).toHaveBeenCalledTimes(40);
  });
  it.each([
    [
      "Unternehmernetzwerk-Leverkusen",
      "unternehmernetzwerkleverkusen",
      "#0723f2",
      "Leverkusen",
      "/Leverkusen",
    ],
    [
      "Unternehmernetzwerk Köln",
      "unternehmernetzwerkkoeln",
      "#c8102e",
      "Köln",
      "/Koeln",
    ],
    [
      "Unternehmernetzwerk Bonn",
      "unternehmernetzwerkbonn",
      "#008040",
      "Bonn",
      "/Bonn",
    ],
  ])(
    "personalizes the shared story and branding for %s",
    (name, slug, color, city, path) => {
      const s = setup();
      Object.assign(s.a, {
        name,
        slug,
        primaryColor: color,
        websiteUrl: "https://b2b-matching.de" + path,
      });
      const defaults = s.service.list("owner", s.a.id).defaults;
      const id = s.service.saveCampaign("owner", s.a.id, {
        name: "Lokales Storytelling",
        ...defaults,
      }).id;
      const preview = s.service.preview("owner", id);
      expect(preview.html).toContain(name);
      expect(preview.html).toContain(`bgcolor="${color}"`);
      expect(preview.html).toContain(`href="https://b2b-matching.de${path}"`);
      expect(preview.html).toContain(`network=${slug}`);
      expect(preview.html).toContain("Ein Getränk in der Hand");
      expect(preview.html).not.toContain("<h1");
      expect(preview.html).not.toContain("{{");
      expect(preview.text).toContain("Guten Tag,");
      expect(preview.text).not.toContain("**");
      expect(preview.text).toContain("\n\n");
      expect(preview.html).not.toContain(
        "Datenschutz zu Mailings und Auswertung",
      );
      const customized = s.service.saveCampaign("owner", s.a.id, {
        name: "Ortsbezug",
        subject: "Neue Kontakte in {{city}}",
        body: "Guten Tag {{firstName}} {{lastName}},\n\nWillkommen in {{city}} bei {{networkName}}.",
      }).id;
      expect(s.service.preview("owner", customized).subject).toBe(
        "Neue Kontakte in " + city,
      );
      expect(s.email.sendCampaignMail).not.toHaveBeenCalled();
    },
  );
  it("ignores external or private landing targets and exposes only public raster logos", () => {
    const s = setup();
    s.a.websiteUrl = "https://foreign.example/Phishing";
    const id = s.campaign();
    expect(s.service.preview("owner", id).html).not.toContain(
      "foreign.example",
    );
    s.a.websiteUrl = "https://b2b-matching.de/portal";
    expect(s.service.preview("owner", id).html).toContain(
      "https://b2b-matching.de/Leverkusen",
    );
    s.a.logoUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII=";
    expect(s.service.brandLogo(s.a.id).type).toBe("image/png");
    expect(s.service.preview("owner", id).html).toContain(
      "/api/mailings/public/brand/" + s.a.id,
    );
    s.a.status = "draft";
    expect(() => s.service.brandLogo(s.a.id)).toThrow();
  });
  it("enforces owner-only access", () => {
    const s = setup();
    s.actor.accountRole = "user";
    expect(() => s.service.list("member", s.a.id)).toThrow(
      /Plattformbetreiber/,
    );
    expect(() => s.campaign()).toThrow();
  });
  it("isolates networks and deduplicates imports", () => {
    const s = setup();
    s.lead();
    s.lead();
    s.lead(true, true, s.b.id);
    expect(s.service.list("owner", s.a.id).leads).toHaveLength(1);
    expect(s.service.list("owner", s.b.id).leads).toHaveLength(1);
    const id = s.campaign();
    expect(() =>
      s.service.saveCampaign("owner", s.b.id, { id, revision: 1 }),
    ).toThrow();
  });
  it("accepts imports without consent but never sends them", async () => {
    const s = setup();
    s.lead(false, false);
    const id = s.campaign();
    expect(s.service.report("owner", id).eligible).toBe(0);
    await s.send(id);
    expect(s.email.sendCampaignMail).not.toHaveBeenCalled();
  });
  it("rejects tracking evidence without marketing evidence", () => {
    const s = setup();
    expect(() =>
      s.service.importLeads("owner", s.a.id, {
        rows: [{ email: "a@example.de" }],
        tracking: evidence,
      }),
    ).toThrow();
  });
  it("uses direct links and no pixel without tracking permission", async () => {
    const s = setup();
    const lead = s.lead(false);
    const id = s.campaign();
    await s.send(id);
    const mail = vi.mocked(s.email.sendCampaignMail).mock.calls[0][0];
    expect(mail.html).not.toContain("/public/image/");
    expect(mail.html).not.toContain("/public/click/");
    expect(mail.text).toContain("https://b2b-matching.de/Leverkusen");
    const token = s.store.mailingCampaigns.get(id)!.deliveries[lead.id].token;
    s.service.click(token, "landing", false);
    expect(s.service.report("owner", id).recipients[0].landingClicks).toBe(0);
  });
  it("requires current confirmation, sends once and locks the draft", async () => {
    const s = setup();
    s.lead();
    const id = s.campaign();
    await expect(
      s.service.sendBatch("owner", id, {
        confirmName: "wrong",
        revision: 1,
        expectedCount: 1,
      }),
    ).rejects.toThrow();
    await s.send(id);
    await s.send(id);
    expect(s.email.sendCampaignMail).toHaveBeenCalledTimes(1);
    expect(() =>
      s.service.saveCampaign("owner", s.a.id, { id, revision: 1 }),
    ).toThrow(/unverändert/);
  });
  it("keeps uncertain deliveries from automatic retries", async () => {
    const s = setup();
    s.lead();
    const id = s.campaign();
    vi.mocked(s.email.sendCampaignMail).mockRejectedValueOnce(
      new Error("timeout"),
    );
    expect((await s.send(id)).uncertain).toBe(1);
    await s.send(id);
    expect(s.email.sendCampaignMail).toHaveBeenCalledTimes(1);
  });
  it("fails closed when persistence fails before dispatch", async () => {
    const s = setup();
    s.lead();
    const id = s.campaign();
    vi.spyOn(s.store, "persist").mockRejectedValueOnce(new Error("db"));
    await expect(s.send(id)).rejects.toThrow("db");
    expect(s.email.sendCampaignMail).not.toHaveBeenCalled();
    expect(s.service.report("owner", id).eligible).toBe(0);
  });
  it("tracks fixed destinations and separates automated signals", async () => {
    const s = setup();
    const l = s.lead();
    const id = s.campaign();
    await s.send(id);
    const token = s.store.mailingCampaigns.get(id)!.deliveries[l.id].token;
    const url = s.service.click(token, "landing", false);
    expect(url).toBe(`https://b2b-matching.de/Leverkusen?ml=${token}`);
    s.service.click(token, "register", true);
    expect(() => s.service.click(token, "https://evil.test", false)).toThrow();
    expect(s.service.view(token, "/unrelated", false).recorded).toBe(false);
    s.service.view(token, "/Leverkusen", false);
    const r = s.service.report("owner", id).recipients[0];
    expect(r.landingClicks).toBe(1);
    expect(r.registerClicks).toBe(0);
    expect(r.automatedSignals).toBe(1);
    expect(r.views).toBe(1);
  });
  it("attributes registration only to the same email and network, once", async () => {
    const s = setup();
    const l = s.lead();
    const id = s.campaign();
    await s.send(id);
    const token = s.store.mailingCampaigns.get(id)!.deliveries[l.id].token;
    attributeMailingRegistration(
      s.store,
      token,
      "different@example.de",
      s.a.id,
      "u",
    );
    attributeMailingRegistration(s.store, token, l.email, s.b.id, "u");
    expect(s.service.report("owner", id).stats.registered).toBe(0);
    attributeMailingRegistration(s.store, token, l.email, s.a.id, "u");
    attributeMailingRegistration(s.store, token, l.email, s.a.id, "u");
    attributeMailingVerification(s.store, "u");
    attributeMailingVerification(s.store, "u");
    const events = s.service.report("owner", id).recipients[0].events;
    expect(events.filter((e) => e.kind === "registered")).toHaveLength(1);
    expect(events.filter((e) => e.kind === "verified")).toHaveLength(1);
  });
  it("applies unsubscribe across networks and stops all personal tracking", async () => {
    const s = setup();
    const l = s.lead();
    s.lead(true, true, s.b.id);
    const id = s.campaign();
    await s.send(id);
    const token = s.store.mailingCampaigns.get(id)!.deliveries[l.id].token;
    s.service.unsubscribe(token);
    s.service.image(token, false);
    s.service.click(token, "landing", false);
    expect(s.service.list("owner", s.b.id).leads[0].suppressed).toBe(true);
    expect(s.service.report("owner", id).recipients[0].imageRequests).toBe(0);
    expect(s.store.mailingSuppressions.has(tokenHash(l.email))).toBe(true);
  });
  it("renders safe preview with no personal tracking", () => {
    const s = setup();
    const id = s.service.saveCampaign("owner", s.a.id, {
      name: "Safe",
      subject: "Testmail",
      body: 'Ein Test mit <script>alert("x")</script> und genügend Text.',
    }).id;
    const p = s.service.preview("owner", id);
    expect(p.html).not.toContain("Datenschutz zu Mailings und Auswertung");
    expect(p.html).not.toContain("/datenschutz/mailings");
    expect(p.html).toContain("Keine weiteren Werbe-E-Mails erhalten");
    expect(p.html).not.toContain("<script>");
    expect(p.html).toContain("&lt;script&gt;");
    expect(p.html).not.toContain("/public/image/");
    expect(p.html).not.toContain("/public/click/");
  });
  it("verifies raw-body webhook signatures and deduplicates provider events", async () => {
    const s = setup();
    const l = s.lead();
    const id = s.campaign();
    await s.send(id);
    const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    vi.stubEnv(
      "SENDGRID_EVENT_PUBLIC_KEY",
      keys.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    );
    const timestamp = String(Math.floor(Date.now() / 1000));
    const raw = Buffer.from(
      JSON.stringify([
        {
          mailingCampaignId: id,
          mailingLeadId: l.id,
          event: "delivered",
          timestamp: Number(timestamp),
          sg_event_id: "one",
        },
      ]),
    );
    const signature = sign(
      "sha256",
      Buffer.concat([Buffer.from(timestamp), raw]),
      keys.privateKey,
    ).toString("base64");
    expect(() => s.service.webhook(raw, "invalid", timestamp)).toThrow();
    expect(() => s.service.webhook(raw, signature, "1000000000")).toThrow();
    s.service.webhook(raw, signature, timestamp);
    s.service.webhook(raw, signature, timestamp);
    expect(
      s.service
        .report("owner", id)
        .recipients[0].events.filter((e) => e.kind === "delivered"),
    ).toHaveLength(1);
  });
  it("survives store serialization and does not expose tokens in reports", async () => {
    const s = setup();
    const l = s.lead();
    const id = s.campaign();
    await s.send(id);
    const token = s.store.mailingCampaigns.get(id)!.deliveries[l.id].token;
    expect(s.store.snapshot()).toContain(token);
    expect(JSON.stringify(s.service.report("owner", id))).not.toContain(token);
  });
});
describe("CSV import", () => {
  it("handles semicolons, BOM, quotes, commas, and multi-line fields", () => {
    expect(
      parseMailingCsv(
        '\uFEFFE-Mail;Vorname;Firma\r\nada@example.de;Ada;"Firma; Nord"',
      )[0].company,
    ).toBe("Firma; Nord");
    expect(
      parseMailingCsv('email,company\na@example.de,"Zeile 1\nZeile 2"')[0]
        .company,
    ).toBe("Zeile 1\nZeile 2");
  });
  it("rejects missing addresses and malformed quotes", () => {
    expect(() => parseMailingCsv("Firma\nTest")).toThrow();
    expect(() => parseMailingCsv('email,firma\na@example.de,"offen')).toThrow();
  });
});
