import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { randomUUID, createPublicKey, verify } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { opaqueToken, tokenHash } from "../auth/password";
import { PortalStore } from "../core/portal.store";
import { decodePublicImage } from "../networks/homepage-media";
import {
  STORY_BODY,
  STORY_SUBJECT,
  cityFromNetwork,
  personalizeMail,
  plainMail,
  renderMailingTemplate,
} from "./mailing-template";
import { emailAddress, requiredText } from "../core/validation";
import type {
  MailingCampaign,
  MailingConsent,
  MailingDelivery,
  MailingEvent,
  MailingLead,
} from "./mailing.types";

@Injectable()
export class MailingsService implements OnModuleInit, OnModuleDestroy {
  private readonly sending = new Set<string>();
  private retentionTimer?: ReturnType<typeof setInterval>;
  onModuleInit() {
    const sweep = async () => {
      let changed = false;
      for (const c of this.store.mailingCampaigns.values())
        for (const d of Object.values(c.deliveries)) {
          const events = d.events.filter(
            (e) => Date.parse(e.at) > Date.now() - 180 * 86400000,
          );
          if (events.length !== d.events.length) {
            d.events = events;
            changed = true;
          }
        }
      if (changed) await this.store.persist();
    };
    const run = () =>
      void sweep().catch(() =>
        new Logger(MailingsService.name).error(
          "Mailing-Aufbewahrungsprüfung fehlgeschlagen.",
        ),
      );
    run();
    this.retentionTimer = setInterval(run, 3600000);
    this.retentionTimer.unref();
  }
  onModuleDestroy() {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
  }
  constructor(
    private readonly store: PortalStore,
    private readonly auth: AuthService,
    private readonly email: EmailService,
  ) {}
  private owner(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    if (user.accountRole !== "platform_admin")
      throw new ForbiddenException(
        "Nur der Plattformbetreiber hat Zugriff auf Mailings und Leads.",
      );
    return user;
  }
  private network(id: string) {
    const n = this.store.networks.get(id);
    if (!n) throw new NotFoundException("Netzwerk nicht gefunden.");
    return n;
  }
  private campaign(id: string) {
    const c = this.store.mailingCampaigns.get(id);
    if (!c) throw new NotFoundException("Mailing nicht gefunden.");
    return c;
  }
  private web() {
    const url = (
      process.env.PUBLIC_WEB_URL ||
      process.env.WEB_ORIGIN ||
      process.env.WEB_ORIGINS?.split(",")[0] ||
      "https://b2b-matching.de"
    ).replace(/\/$/, "");
    if (!/^https:\/\//.test(url) && process.env.NODE_ENV === "production")
      throw new ServiceUnavailableException("Öffentliche Webadresse fehlt.");
    return url;
  }
  private api() {
    const url = (
      process.env.PUBLIC_MAILING_API_URL ||
      process.env.PUBLIC_API_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "") ||
      ""
    ).replace(/\/$/, "");
    if (!/^https:\/\//.test(url))
      throw new ServiceUnavailableException(
        "PUBLIC_MAILING_API_URL für Tracking und Abmeldung konfigurieren.",
      );
    return url;
  }
  private consent(value: unknown): MailingConsent | undefined {
    if (!value) return undefined;
    const v = value as Record<string, unknown>;
    const date = Date.parse(String(v.at || ""));
    if (!Number.isFinite(date) || date > Date.now())
      throw new BadRequestException(
        "Bitte den tatsächlichen Zeitpunkt der Zustimmung angeben.",
      );
    return {
      at: new Date(date).toISOString(),
      source: requiredText(
        v.source,
        "Nachweis / Quelle der Zustimmung",
        5,
        1000,
      ),
    };
  }
  private suppressed(lead: MailingLead) {
    return this.store.mailingSuppressions.has(tokenHash(lead.email));
  }
  list(authorization: string | undefined, networkId: string) {
    this.owner(authorization);
    this.network(networkId);
    return {
      leads: [...this.store.mailingLeads.values()]
        .filter((l) => l.networkId === networkId)
        .map((l) => ({ ...l, suppressed: this.suppressed(l) })),
      campaigns: [...this.store.mailingCampaigns.values()]
        .filter((c) => c.networkId === networkId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          subject: c.subject,
          body: c.body,
          revision: c.revision,
          createdAt: c.createdAt,
          locked: Object.keys(c.deliveries).length > 0,
          ...this.reportData(c),
        })),
      defaults: { subject: STORY_SUBJECT, body: STORY_BODY },
      readiness: {
        mail: !!(process.env.SENDGRID_API_KEY && process.env.MAIL_FROM_EMAIL),
        tracking: !!(
          process.env.PUBLIC_MAILING_API_URL ||
          process.env.PUBLIC_API_URL ||
          process.env.RAILWAY_PUBLIC_DOMAIN
        ),
        deliveryWebhook: !!process.env.SENDGRID_EVENT_PUBLIC_KEY,
      },
    };
  }
  importLeads(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    this.owner(authorization);
    this.network(networkId);
    if (
      !Array.isArray(input.rows) ||
      input.rows.length > 500 ||
      !input.rows.length
    )
      throw new BadRequestException(
        "Bitte 1 bis 500 CSV-Zeilen pro Import übergeben.",
      );
    const marketing = this.consent(input.marketing),
      tracking = this.consent(input.tracking);
    if (tracking && !marketing)
      throw new BadRequestException(
        "Tracking ersetzt keine Versandzustimmung.",
      );
    const issues: string[] = [];
    let imported = 0,
      duplicate = 0,
      blocked = 0;
    for (const [index, row] of input.rows.entries()) {
      try {
        if (!row || typeof row !== "object") throw new Error("Ungültige Zeile");
        const r = row as Record<string, unknown>,
          email = emailAddress(r.email);
        if (this.store.mailingSuppressions.has(tokenHash(email))) {
          blocked++;
          continue;
        }
        if (
          [...this.store.mailingLeads.values()].some(
            (l) => l.networkId === networkId && l.email === email,
          )
        ) {
          duplicate++;
          continue;
        }
        const clean = (v: unknown) =>
          typeof v === "string" ? v.trim().slice(0, 200) : "";
        const now = new Date().toISOString();
        const lead: MailingLead = {
          id: randomUUID(),
          networkId,
          email,
          firstName: clean(r.firstName),
          lastName: clean(r.lastName),
          company: clean(r.company),
          source: clean(input.source || r.source || "CSV-Import"),
          ...(marketing ? { marketing } : {}),
          ...(tracking ? { tracking } : {}),
          createdAt: now,
          updatedAt: now,
        };
        this.store.mailingLeads.set(lead.id, lead);
        imported++;
      } catch {
        issues.push(`Zeile ${index + 2}: ungültige E-Mail-Adresse oder Daten.`);
      }
    }
    return { imported, duplicate, blocked, issues };
  }
  updateLead(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    this.owner(authorization);
    const lead = this.store.mailingLeads.get(id);
    if (!lead) throw new NotFoundException();
    const marketing = this.consent(input.marketing),
      tracking = this.consent(input.tracking);
    if (tracking && !marketing)
      throw new BadRequestException(
        "Bitte beide Freigaben getrennt dokumentieren.",
      );
    lead.marketing = marketing;
    lead.tracking = tracking;
    lead.updatedAt = new Date().toISOString();
    return { updated: true };
  }
  removeLead(authorization: string | undefined, id: string) {
    this.owner(authorization);
    if (this.sending.size)
      throw new BadRequestException("Bitte den laufenden Versand abwarten.");
    const lead = this.store.mailingLeads.get(id);
    if (!lead) throw new NotFoundException();
    this.store.mailingSuppressions.set(tokenHash(lead.email), {
      at: new Date().toISOString(),
      reason: "operator_deleted",
    });
    for (const c of this.store.mailingCampaigns.values())
      delete c.deliveries[id];
    this.store.mailingLeads.delete(id);
    return { removed: true };
  }
  saveCampaign(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    this.owner(authorization);
    this.network(networkId);
    let campaign: MailingCampaign;
    if (input.id) {
      campaign = this.campaign(String(input.id));
      if (campaign.networkId !== networkId) throw new ForbiddenException();
      if (Object.keys(campaign.deliveries).length)
        throw new BadRequestException(
          "Bereits gestartete Mailings bleiben unverändert. Bitte ein neues Mailing anlegen.",
        );
      if (input.revision !== campaign.revision)
        throw new BadRequestException(
          "Mailing wurde zwischenzeitlich geändert.",
        );
    } else
      campaign = {
        id: randomUUID(),
        networkId,
        name: "",
        subject: "",
        body: "",
        createdAt: new Date().toISOString(),
        updatedAt: "",
        revision: 0,
        deliveries: {},
      };
    campaign.name = requiredText(input.name, "Mailingname", 3, 150);
    campaign.subject = requiredText(input.subject, "Betreff", 3, 180).replace(
      /[\r\n]/g,
      " ",
    );
    campaign.body = requiredText(input.body, "Mailtext", 30, 15000);
    campaign.revision++;
    campaign.updatedAt = new Date().toISOString();
    this.store.mailingCampaigns.set(campaign.id, campaign);
    return { id: campaign.id };
  }
  private targets(c: MailingCampaign) {
    const n = this.network(c.networkId),
      web = this.web();
    let landing: string | undefined;
    try {
      const url = new URL(n.websiteUrl || "");
      if (
        url.origin === new URL(web).origin &&
        /^\/[a-zA-Z0-9ÄÖÜäöüß_-]+\/?$/.test(url.pathname) &&
        !url.search &&
        !url.hash &&
        !/^\/(portal|registrieren|anmelden|passwort)/i.test(url.pathname)
      )
        landing = url.href;
    } catch {
      /* Without an own landing page, retain the network registration link. */
    }
    return {
      homepage: web + "/",
      landing:
        landing ||
        web +
          (n.slug === "unternehmernetzwerkleverkusen"
            ? "/Leverkusen"
            : n.slug === "unternehmernetzwerkkoeln"
              ? "/Koeln"
              : `/registrieren?network=${encodeURIComponent(n.slug)}`),
      register: web + `/registrieren?network=${encodeURIComponent(n.slug)}`,
    };
  }
  private eligible(c: MailingCampaign) {
    return [...this.store.mailingLeads.values()].filter(
      (l) =>
        l.networkId === c.networkId &&
        l.marketing &&
        !this.suppressed(l) &&
        !c.deliveries[l.id],
    );
  }
  private render(
    c: MailingCampaign,
    lead: MailingLead,
    delivery?: MailingDelivery,
  ) {
    const n = this.network(c.networkId),
      targets = this.targets(c),
      api = delivery ? this.api() : "";
    const links = Object.fromEntries(
      Object.entries(targets).map(([kind, target]) => [
        kind,
        delivery && lead.tracking
          ? `${api}/api/mailings/public/click/${delivery.token}/${kind}`
          : target,
      ]),
    ) as typeof targets;
    const unsubscribe = delivery
      ? `${api}/api/mailings/public/unsubscribe/${delivery.token}`
      : this.web() + "/datenschutz/unternehmen";
    const values = {
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      company: lead.company || "",
      networkName: n.name,
      city: cityFromNetwork(n.name),
    };
    const body = personalizeMail(c.body, values);
    let logo = this.web() + "/images/b2b-matching-logo-brand.png";
    if (decodePublicImage(n.logoUrl))
      logo =
        this.api() + "/api/mailings/public/brand/" + encodeURIComponent(n.id);
    else if (n.logoUrl === "/images/unternehmernetzwerk-koeln.svg")
      logo = this.web() + "/images/b2b-matching-logo-brand.png";
    else if (
      n.logoUrl &&
      /^\/images\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(n.logoUrl) &&
      !n.logoUrl.includes("..")
    )
      logo = this.web() + n.logoUrl;
    const html = renderMailingTemplate({
      body,
      networkName: n.name,
      color: n.primaryColor,
      logo,
      web: this.web(),
      links,
      unsubscribe,
      pixel:
        lead.tracking && delivery
          ? api + "/api/mailings/public/image/" + delivery.token + ".gif"
          : undefined,
    });
    return {
      subject: personalizeMail(c.subject, values).replace(/[\r\n]/g, " "),
      html,
      text:
        plainMail(body) +
        "\n\nNetzwerk kennenlernen: " +
        links.landing +
        "\nDirekt zur Teilnahmeanfrage: " +
        links.register +
        "\nB2B Matching: " +
        links.homepage +
        "\n\nMedia Online Innovations Group, Inhaber Martin Kelm\nIm Weidenblech 25, 51371 Leverkusen\nAbmelden: " +
        unsubscribe +
        "\nDatenschutz: " +
        this.web() +
        "/datenschutz/unternehmen",
    };
  }
  brandLogo(id: string) {
    const network = this.network(id);
    const image =
      network.status === "active" ? decodePublicImage(network.logoUrl) : null;
    if (!image) throw new NotFoundException("Netzwerklogo nicht gefunden.");
    return image;
  }
  preview(authorization: string | undefined, id: string) {
    const actor = this.owner(authorization),
      c = this.campaign(id);
    return {
      ...this.render(c, {
        id: "preview",
        networkId: c.networkId,
        email: actor.email,
        firstName: "",
        lastName: "",
        company: "Ihr Unternehmen",
        source: "preview",
        createdAt: "",
        updatedAt: "",
      }),
      eligible: this.eligible(c).length,
      revision: c.revision,
    };
  }
  async test(authorization: string | undefined, id: string) {
    const actor = this.owner(authorization);
    await this.email.sendCampaignMail({
      to: actor.email,
      ...this.preview(authorization, id),
      subject: "[Test] " + this.campaign(id).subject,
    });
    return { sentTo: actor.email };
  }
  async sendBatch(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.owner(authorization),
      c = this.campaign(id),
      n = this.network(c.networkId);
    this.api();
    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM_EMAIL)
      throw new ServiceUnavailableException(
        "Mailversand ist noch nicht eingerichtet.",
      );
    if (n.status !== "active")
      throw new BadRequestException("Netzwerk ist nicht aktiv.");
    if (
      input.confirmName !== c.name ||
      input.revision !== c.revision ||
      input.expectedCount !== this.eligible(c).length
    )
      throw new BadRequestException(
        "Bitte aktuellen Versandumfang prüfen und erneut freigeben.",
      );
    if (this.sending.size)
      throw new BadRequestException("Ein Versandlauf läuft bereits.");
    const sentToday = [...this.store.mailingCampaigns.values()]
      .flatMap((x) => Object.values(x.deliveries))
      .filter(
        (d) =>
          d.startedAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
      ).length;
    if (sentToday >= 200)
      throw new BadRequestException("Tageslimit von 200 Empfängern erreicht.");
    // Persisted attempts across ALL networks/campaigns count, including uncertain
    // provider outcomes. A sliding window prevents a double burst at the hour.
    const startedInHour = [...this.store.mailingCampaigns.values()]
      .flatMap((campaign) => Object.values(campaign.deliveries))
      .filter((delivery) => Date.parse(delivery.startedAt) > Date.now() - 3_600_000).length;
    if (startedInHour >= 30)
      throw new BadRequestException("Stundenlimit erreicht: maximal 30 Mailing-E-Mails innerhalb von 60 Minuten. Bitte später erneut freigeben.");
    const rows = this.eligible(c).slice(0, Math.min(20, 30 - startedInHour, 200 - sentToday));
    this.sending.add(id);
    let submitted = 0,
      uncertain = 0;
    try {
      for (const lead of rows) {
        if (!lead.marketing || this.suppressed(lead)) continue;
        const d: MailingDelivery = {
          token: opaqueToken(),
          state: "sending",
          startedAt: new Date().toISOString(),
          events: [],
        };
        c.deliveries[lead.id] = d;
        await this.store.persist();
        try {
          await this.email.sendCampaignMail({
            to: lead.email,
            ...this.render(c, lead, d),
            customArgs: { mailingCampaignId: c.id, mailingLeadId: lead.id },
            unsubscribe: `${this.api()}/api/mailings/public/unsubscribe/${d.token}`,
          });
          d.state = "submitted";
          d.submittedAt = new Date().toISOString();
          submitted++;
        } catch {
          d.state = "uncertain";
          d.error =
            "Versandstatus unklar oder Anbieter hat abgelehnt. Kein automatischer Neuversand.";
          uncertain++;
        }
        await this.store.persist();
      }
      this.store.activities.push({
        id: randomUUID(),
        matchId: null,
        organizationId: null,
        actorUserId: actor.id,
        type: "mailing.batch.submitted",
        visibility: "platform_internal",
        data: { campaignId: id, networkId: c.networkId, submitted, uncertain },
        createdAt: new Date().toISOString(),
      });
      return { submitted, uncertain, remaining: this.eligible(c).length };
    } finally {
      this.sending.delete(id);
    }
  }
  private reportData(c: MailingCampaign) {
    for (const d of Object.values(c.deliveries))
      d.events = d.events.filter(
        (e) => Date.parse(e.at) > Date.now() - 180 * 86400000,
      );
    const recipients = Object.entries(c.deliveries).map(([leadId, d]) => {
      const lead = this.store.mailingLeads.get(leadId);
      const count = (kind: MailingEvent["kind"], link?: string) =>
        d.events.filter(
          (e) => e.kind === kind && (!link || e.link === link) && !e.automated,
        ).length;
      return {
        leadId,
        email: lead?.email || "Gelöscht",
        company: lead?.company || "",
        state: d.state,
        submittedAt: d.submittedAt || null,
        error: d.error,
        tracking: !!lead?.tracking,
        suppressed: lead ? this.suppressed(lead) : true,
        imageRequests: count("image"),
        homepageClicks: count("click", "homepage"),
        landingClicks: count("click", "landing"),
        registerClicks: count("click", "register"),
        views: count("view"),
        registered: count("registered") > 0,
        verified: count("verified") > 0,
        delivered: count("delivered") > 0,
        bounced: count("bounce") > 0,
        automatedSignals: d.events.filter((e) => e.automated).length,
        events: d.events,
      };
    });
    return {
      eligible: this.eligible(c).length,
      stats: {
        submitted: recipients.filter((r) => r.state === "submitted").length,
        delivered: recipients.filter((r) => r.delivered).length,
        uncertain: recipients.filter((r) => r.state !== "submitted").length,
        clicked: recipients.filter(
          (r) => r.homepageClicks + r.landingClicks + r.registerClicks > 0,
        ).length,
        registered: recipients.filter((r) => r.registered).length,
        verified: recipients.filter((r) => r.verified).length,
      },
      recipients,
    };
  }
  report(authorization: string | undefined, id: string) {
    this.owner(authorization);
    return this.reportData(this.campaign(id));
  }
  private findToken(token: string) {
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) throw new NotFoundException();
    for (const c of this.store.mailingCampaigns.values())
      for (const [leadId, d] of Object.entries(c.deliveries))
        if (d.token === token) {
          const lead = this.store.mailingLeads.get(leadId);
          if (lead) return { c, d, lead };
        }
    throw new NotFoundException();
  }
  private event(token: string, event: MailingEvent) {
    const found = this.findToken(token);
    if (
      found.lead.tracking &&
      !this.suppressed(found.lead) &&
      Date.parse(found.c.createdAt) > Date.now() - 180 * 86400000
    ) {
      found.d.events = found.d.events
        .filter((e) => Date.parse(e.at) > Date.now() - 180 * 86400000)
        .slice(-499);
      if (
        !found.d.events.some(
          (e) =>
            e.kind === event.kind &&
            e.link === event.link &&
            e.automated === event.automated &&
            Date.parse(e.at) > Date.now() - 3000,
        )
      )
        found.d.events.push(event);
    }
    return found;
  }
  click(token: string, link: string, automated: boolean) {
    if (!["homepage", "landing", "register"].includes(link))
      throw new NotFoundException();
    const found = this.event(token, {
      kind: "click",
      at: new Date().toISOString(),
      link: link as "homepage",
      automated,
    });
    const target = new URL(this.targets(found.c)[link as "homepage"]);
    if (
      found.lead.tracking &&
      !this.suppressed(found.lead) &&
      !automated &&
      Date.parse(found.c.createdAt) > Date.now() - 180 * 86400000
    )
      target.searchParams.set("ml", token);
    return target.toString();
  }
  image(token: string, automated: boolean) {
    try {
      this.event(token, {
        kind: "image",
        at: new Date().toISOString(),
        automated,
      });
    } catch {}
  }
  view(token: string, path: string, automated: boolean) {
    const found = this.findToken(token),
      targets = this.targets(found.c);
    const valid = Object.entries(targets).find(
      ([, target]) => new URL(target).pathname === path,
    );
    if (!valid) return { recorded: false };
    this.event(token, {
      kind: "view",
      at: new Date().toISOString(),
      link: valid[0] as "homepage",
      automated,
    });
    return { recorded: true };
  }
  unsubscribe(token: string) {
    const { lead } = this.findToken(token);
    this.store.mailingSuppressions.set(tokenHash(lead.email), {
      at: new Date().toISOString(),
      reason: "recipient_unsubscribed",
    });
    lead.marketing = undefined;
    lead.tracking = undefined;
    return { unsubscribed: true };
  }
  webhook(
    raw: Buffer | undefined,
    signature: string | undefined,
    timestamp: string | undefined,
  ) {
    const publicKey = process.env.SENDGRID_EVENT_PUBLIC_KEY;
    if (
      !publicKey ||
      !raw ||
      !signature ||
      !timestamp ||
      !/^\d{10}$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
    )
      throw new ForbiddenException("Webhook nicht verifiziert.");
    let valid = false;
    try {
      valid = verify(
        "sha256",
        Buffer.concat([Buffer.from(timestamp), raw]),
        createPublicKey({
          key: Buffer.from(publicKey, "base64"),
          format: "der",
          type: "spki",
        }),
        Buffer.from(signature, "base64"),
      );
    } catch {}
    if (!valid) throw new ForbiddenException("Ungültige Webhook-Signatur.");
    let events: unknown;
    try {
      events = JSON.parse(raw.toString("utf8"));
    } catch {
      throw new BadRequestException("Ungültiges Ereignisformat.");
    }
    if (!Array.isArray(events) || events.length > 1000)
      throw new BadRequestException();
    for (const e of events) {
      if (!e || typeof e !== "object") continue;
      const c = this.store.mailingCampaigns.get(
          String(e.mailingCampaignId || ""),
        ),
        d = c?.deliveries[String(e.mailingLeadId || "")];
      if (
        !d ||
        !["delivered", "bounce", "dropped", "spamreport", "deferred"].includes(
          e.event,
        ) ||
        !Number.isFinite(e.timestamp) ||
        e.timestamp < 0 ||
        e.timestamp > Date.now() / 1000 + 300 ||
        typeof e.sg_event_id !== "string" ||
        d.events.some((x) => x.providerId === e.sg_event_id)
      )
        continue;
      d.events.push({
        kind: e.event,
        at: new Date(e.timestamp * 1000).toISOString(),
        providerId: e.sg_event_id,
      });
      if (d.events.length > 1000) d.events = d.events.slice(-1000);
      if (["bounce", "dropped", "spamreport"].includes(e.event)) {
        const lead = this.store.mailingLeads.get(String(e.mailingLeadId));
        if (lead)
          this.store.mailingSuppressions.set(tokenHash(lead.email), {
            at: new Date().toISOString(),
            reason: e.event,
          });
      }
    }
    return { accepted: true };
  }
}
