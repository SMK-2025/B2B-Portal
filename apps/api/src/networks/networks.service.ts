import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { networkPulse, updatePulse, visibleCooperation, activatePulseOnReply } from './network-pulse';
import { companyDomain, sameCompanyDomain } from "./company-page-domain";
import { publicLaunchOffer, launchSettings, validateLaunchBilling } from "./launch-promotion";
import { attributeMailingRegistration } from "../mailings/mailing-attribution";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import {
  opaqueToken,
  tokenHash,
  hashPassword,
  validatePasswordStrength,
} from "../auth/password";
import type { OrganizationRecord } from "../core/domain";
import type {
  NetworkAttendanceRecord,
  NetworkContentRecord,
  NetworkContentType,
  NetworkMembershipRecord,
  NetworkModule,
  NetworkOrderRecord,
  NetworkPartnerProfile,
  NetworkRecord,
  NetworkRevenueRecord,
  NetworkRole,
} from "../core/domain";
import { PortalStore } from "../core/portal.store";
import { emailAddress, requiredText, safeUrl } from "../core/validation";
import { CompanyImport } from "./company-import";
import { bundesligaSnapshot, refreshBundesliga } from "./bundesliga-data";
import {
  BUNDESLIGA_LOGOS,
  BUNDESLIGA_SEASON,
  BUNDESLIGA_SOURCE,
  BUNDESLIGA_TABLE_SOURCE,
} from "./bundesliga-schedule";
import { partnerHero, partnerSections } from "./partner-onepager";
import { homepageFields, projectHomepage } from "./homepage-publication";
import { decodePublicImage, mediaOrigin } from "./homepage-media";
import { addCalendarDays, invoiceSchedule } from "./invoice-schedule";
import { memberBillingSettings } from "./member-billing-settings";
import {
  PROB_TABLE,
  PROB_TABLE_SOURCE,
  PROB_AS_OF,
  PROB_LOGOS,
} from "./prob-table";
import { enqueueOperatorMail } from "../core/operator-mail";
import {
  fullPortalModules,
  pricing,
  validMemberPrice,
  memberPrice,
  annualOrder,
} from "./annual-membership";
import {
  allProductModuleIds,
  expandNetworkModules,
  NETWORK_COMPLETE_UNIT_NET_CENTS,
  NETWORK_INCLUDED_MODULES,
  NETWORK_MODULE_CATALOG,
  NETWORK_SETUP_NET_CENTS,
} from "./network-module-catalog";
import {
  PROB_GAMES,
  PROB_SEASON,
  PROB_SOURCE_URL,
  type ProBGame,
} from "./prob-schedule";

const NETWORK_CONTENT_CATEGORIES: Partial<
  Record<NetworkContentType, string[]>
> = {
  event: [
    "Geschäftstreffen",
    "Netzwerkveranstaltung",
    "Workshop & Wissen",
    "Sport & Gemeinschaft",
    "Externer Termin",
  ],
  service: [
    "Geschäftsanfrage & Bedarf",
    "Produkt & Leistung",
    "Kooperationsangebot",
    "Sonderkondition für Partner",
    "Empfehlung & Kontakt",
    "Sponsoring & Unterstützung",
  ],
  conversation: [
    "Geschäftliche Anfrage",
    "Vorstellung & Kennenlernen",
    "Kooperation",
    "Erfahrungsaustausch",
    "Sonstiger Austausch",
  ],
  topic: [
    "Neuigkeit des Initiators",
    "Partnerportal & Entwicklung",
    "Austausch & Ideen",
    "Erfolge & Empfehlungen",
    "Umfrage & Feedback",
  ],
  task: [
    "Gemeinsames Projekt",
    "Veranstaltungsorganisation",
    "Kontakt & Nachverfolgung",
    "Inhalt & Kommunikation",
    "Sonstiger nächster Schritt",
  ],
  document: [
    "Protokoll & Ergebnis",
    "Präsentation & Information",
    "Vorlage & Arbeitshilfe",
    "Angebot & Partnerleistung",
    "Bild & Veranstaltungsdokumentation",
    "Richtlinie & Organisation",
  ],
};

@Injectable()
export class NetworksService {
  operatorMailStatus(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    return {
      recipient: "mk@media-online-innovations.group",
      pending: [...this.store.operatorMails.values()].filter((m) => !m.sentAt)
        .length,
      messages: [...this.store.operatorMails.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20)
        .map(({ text, ...m }) => m),
    };
  }
  private operatorAudit(
    userId: string,
    networkId: string,
    type: string,
    data: Record<string, unknown> = {},
  ) {
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: userId,
      type,
      visibility: "platform_internal",
      data: { networkId, ...data },
      createdAt: new Date().toISOString(),
    });
  }
  operatorAccess(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    const network = this.raw(networkId);
    this.operatorAudit(user.id, networkId, "operator.network.opened");
    return { networkId: network.id, slug: network.slug };
  }
  systemMessages(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.raw(networkId);
    this.requireNetworkAccess(user.id, networkId);
    return [...this.store.networkSystemMessages.values()]
      .filter((m) => m.networkId === networkId && !m.archivedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ createdByUserId, ...message }) => message);
  }
  createSystemMessage(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    this.raw(networkId);
    const record = {
      id: randomUUID(),
      networkId,
      title: requiredText(input.title, "Titel", 2, 160),
      message: requiredText(input.message, "System-Meldung", 2, 5000),
      severity:
        input.severity === "warning" ? ("warning" as const) : ("info" as const),
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      archivedAt: null,
    };
    this.store.networkSystemMessages.set(record.id, record);
    this.operatorAudit(user.id, networkId, "operator.system-message.created", {
      messageId: record.id,
    });
    return { id: record.id };
  }
  archiveSystemMessage(
    authorization: string | undefined,
    networkId: string,
    id: string,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    this.raw(networkId);
    const record = this.store.networkSystemMessages.get(id);
    if (!record || record.networkId !== networkId)
      throw new NotFoundException("System-Meldung nicht gefunden.");
    record.archivedAt = new Date().toISOString();
    this.operatorAudit(user.id, networkId, "operator.system-message.archived", {
      messageId: id,
    });
    return { archived: true };
  }
  invitationQuote(input: Record<string, unknown>) {
    const hash = tokenHash(requiredText(input.invite, "Einladung", 20, 200)),
      invite = [...this.store.networkContents.values()].find(
        (i) =>
          i.data.kind === "network_invitation" &&
          i.data.inviteTokenHash === hash &&
          !i.data.usedAt &&
          i.endsAt &&
          Date.parse(i.endsAt) > Date.now(),
      );
    if (!invite)
      throw new BadRequestException(
        "Die Einladung ist ungültig oder abgelaufen.",
      );
    const network = this.raw(invite.networkId);
    if (
      invite.data.admissionStatus &&
      invite.data.admissionStatus !== "approved"
    )
      throw new ForbiddenException(
        "Deine Teilnahme wird geprüft. Vor der Freigabe sind keine Buchung und keine Unternehmensanlage möglich.",
      );
    if (invite.data.role !== "network_admin" && network.status !== "active")
      throw new BadRequestException(
        "Das Partnernetzwerk ist noch nicht für kostenpflichtige Mitgliedschaften aktiviert.",
      );
    return {
      networkName: network.name,
      networkSlug: network.slug,
      initiator: invite.data.role === "network_admin",
      memberPaymentModel: network.settings.memberPaymentModel || "individual",
      launchPromotion: publicLaunchOffer(network,this.store.launchUsed(network.id),this.store.launchReserved(network.id,this.store.userByEmail.get(String(invite.data.email)) || "")),
      ...(network.settings.memberPaymentModel === "network"
        ? {}
        : pricing(network)),
    };
  }
  memberPricing(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    const network = this.raw(id);
    if (
      input.memberPaymentModel !== undefined &&
      !["individual", "network"].includes(String(input.memberPaymentModel))
    )
      throw new BadRequestException("Ungültiges Zahlungsmodell.");
    const cents = validMemberPrice(input.monthlyNetCents);
    const nextSettings = {...network.settings,memberMonthlyNetCents:cents};
    if (input.billing && typeof input.billing === "object") {
      nextSettings.memberBilling = memberBillingSettings(
        input.billing,
        network.slug,
      );
    }
    if (input.memberPaymentModel !== undefined)
      nextSettings.memberPaymentModel = input.memberPaymentModel as
        "individual" | "network";
    if(input.launchPromotion) nextSettings.launchPromotion=launchSettings(input.launchPromotion,network.settings.launchPromotion,this.store.launchUsed(id));
    validateLaunchBilling({...network,settings:nextSettings});
    network.settings=nextSettings;
    network.updatedAt = new Date().toISOString();
    this.operatorAudit(user.id, id, "operator.billing.updated");
    return { ...network, memberPrice: pricing(network) };
  }
  adminBilling(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    return {
      networkName: network.name,
      memberPaymentModel: network.settings.memberPaymentModel || "individual",
      cooperationFree: network.settings.billingMode === "cooperation_free",
      launchPromotion: network.settings.launchPromotion || null,
      launchCounter: network.settings.launchPromotion ? {used:this.store.launchUsed(network.id)} : null,
      ...pricing(network),
      schedule: network.settings.memberBilling?.freeUntil
        ? invoiceSchedule(network.settings.memberBilling.freeUntil)
        : null,
      orders: [...this.store.networkOrders.values()]
        .filter((o) => o.networkId === networkId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    };
  }
  memberRegistrations(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    return [...this.store.networkOrders.values()]
      .filter((o) => o.kind === "member_annual")
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((o) => ({
        ...o,
        networkName: this.store.networks.get(o.networkId)?.name || "",
        user: this.publicUser(o.orderedByUserId),
        endingSoon:
          !!o.serviceEndsAt &&
          Date.parse(o.serviceEndsAt) <= Date.now() + 42 * 86400000,
        expired: !!o.serviceEndsAt && Date.parse(o.serviceEndsAt) <= Date.now(),
      }));
  }
  referralAccountId(auth: string | undefined) {
    return this.auth.authenticate(auth).id;
  }
  myBillingNetworks(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    const ids = new Set(
      [...this.store.networkOrders.values()]
        .filter(
          (o) =>
            o.orderedByUserId === user.id &&
            o.kind === "member_annual" &&
            o.status === "accepted",
        )
        .map((o) => o.networkId),
    );
    return [...ids].map((id) => ({
      id,
      name: this.store.networks.get(id)?.name || "Netzwerk",
    }));
  }
  myBilling(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    // Own accepted orders stay available after the membership ends. Never return network-wide records.
    return [...this.store.networkOrders.values()]
      .filter(
        (o) =>
          o.networkId === networkId &&
          o.orderedByUserId === user.id &&
          o.kind === "member_annual" &&
          o.status === "accepted",
      )
      .sort((a, b) =>
        (b.serviceEndsAt || "").localeCompare(a.serviceEndsAt || ""),
      );
  }
  billingOffer(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const network = this.raw(networkId);
    return {
      networkName: network.name,
      complimentaryAccess: this.store.networkMemberships.some(
        (m) =>
          m.userId === user.id &&
          m.networkId === networkId &&
          m.complimentaryAccess,
      ),
      ...pricing(network),
      centrallyFunded: network.settings.memberPaymentModel === "network",
    };
  }
  acceptBillingPolicy(
    authorization: string | undefined,
    networkId: string,
    orderId: string,
    input: Record<string, unknown>,
  ) {
    const orders = this.myBilling(authorization, networkId),
      source = orders.find((o) => o.id === orderId);
    const network = this.raw(networkId);
    if (
      !source ||
      source.billingPolicy ||
      !network.settings.memberBilling ||
      network.settings.memberPaymentModel === "network"
    )
      throw new BadRequestException(
        "Für diese Buchung ist keine Umstellung verfügbar.",
      );
    if (
      source.paymentStatus === "paid" ||
      source.invoiceSentAt ||
      source.invoiceReference
    )
      throw new BadRequestException(
        "Für diese Buchung besteht bereits eine Zahlung oder Rechnung. Bitte den Betreiber zur individuellen Umstellung kontaktieren; es wird keine weitere Rechnung ausgelöst.",
      );
    const next = annualOrder(network, source.orderedByUserId, {
      ...input,
      legalName: source.invoiceCompany,
      invoiceContact: source.invoiceContact,
      invoiceEmail: source.invoiceEmail,
      invoiceStreet: source.invoiceStreet,
      invoicePostalCode: source.invoicePostalCode,
      invoiceCity: source.invoiceCity,
      invoiceCountry: source.invoiceCountry,
      invoiceVatId: source.invoiceVatId,
    });
    next.membershipId = source.membershipId;
    next.organizationId = source.organizationId;
    next.billingPolicy!.sourceOrderId = source.id;
    source.status = "cancelled";
    this.store.networkOrders.set(next.id, next);
    this.operatorAudit(
      source.orderedByUserId,
      networkId,
      "billing.policy.accepted",
      {
        oldOrderId: source.id,
        newOrderId: next.id,
        version: next.billingPolicy!.version,
      },
    );
    return next;
  }
  changeRenewal(
    authorization: string | undefined,
    networkId: string,
    orderId: string,
    input: Record<string, unknown>,
  ) {
    const order = this.myBilling(authorization, networkId).find(
      (o) => o.id === orderId,
    );
    if (!order?.billingPolicy)
      throw new BadRequestException(
        "Für diese Buchung ist keine automatische Verlängerung vereinbart.",
      );
    if (input.enabled !== false)
      throw new BadRequestException(
        "Automatische Verlängerungen sind für alle Mitgliedschaften deaktiviert.",
      );
    order.billingPolicy.autoRenew=false;
    order.billingPolicy.renewalDisabledAt=new Date().toISOString();
    order.billingPolicy.renewalDeadline=null;
    order.billingPolicy.renewalInvoiceDate=null;
    return order;
  }
  updateMemberInvoice(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    const order = this.store.networkOrders.get(id);
    if (!order || order.kind !== "member_annual")
      throw new NotFoundException("Mitgliedsbuchung nicht gefunden.");
    if (input.invoiceSent === true) {
      if (order.manualServiceInvoice)
        throw new BadRequestException(
          "Bitte die Rechnung über den Serviceauftrag in der Nutzerübersicht versenden.",
        );
      const reference = requiredText(
        input.invoiceReference,
        "Rechnungsnummer",
        1,
        100,
      );
      order.invoiceSentAt = new Date().toISOString();
      order.invoiceReference = reference;
    }
    if (input.paid === true) {
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
    }
    return order;
  }
  private readonly companyImport = new CompanyImport();
  private canEditCompany(userId: string, organizationId: string, role: string) {
    return (
      role === "organization_admin" ||
      role === "network_admin" ||
      this.store.memberships.some(
        (m) =>
          m.userId === userId &&
          m.organizationId === organizationId &&
          m.role === "admin",
      )
    );
  }
  async importOwnProfile(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const own = this.ownProfile(authorization, networkId);
    if (!own.canEdit)
      throw new ForbiddenException(
        "Sie können nur Ihre eigene Unternehmensseite bearbeiten.",
      );
    this.requireEnabledModule(
      networkId,
      "profiles",
      this.auth.authenticate(authorization).id,
    );
    if (input.consent !== true)
      throw new BadRequestException(
        "Bitte die optionale Analyse der öffentlichen Homepage bestätigen.",
      );
    return this.companyImport.generate(
      this.auth.authenticate(authorization).id,
      input.websiteUrl,
    );
  }
  constructor(
    @Inject(PortalStore) private readonly store: PortalStore,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  create(authorization: string | undefined, input: Record<string, unknown>) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    const slug = requiredText(
      input.slug,
      "Netzwerk-Kennung",
      3,
      80,
    ).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new BadRequestException(
        "Die Netzwerk-Kennung darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.",
      );
    if (this.store.networkBySlug.has(slug))
      throw new ConflictException(
        "Diese Netzwerk-Kennung ist bereits vergeben.",
      );
    const now = new Date().toISOString();
    const network: NetworkRecord = {
      id: randomUUID(),
      slug,
      name: requiredText(input.name, "Netzwerkname", 2, 160),
      legalName:
        typeof input.legalName === "string" && input.legalName.trim()
          ? input.legalName.trim()
          : null,
      websiteUrl:
        typeof input.websiteUrl === "string" && input.websiteUrl.trim()
          ? input.websiteUrl.trim()
          : null,
      logoUrl: null,
      primaryColor: "#536bdb",
      secondaryColor: "#30264f",
      status: "draft",
      trialEndsAt: null,
      enabledModules: fullPortalModules(),
      settings: {
        ...(input.launchPromotion ? {launchPromotion:launchSettings(input.launchPromotion,undefined,0)} : {}),
        ...(input.billing
          ? { memberBilling: memberBillingSettings(input.billing, slug) }
          : {}),
        closedNetwork: true,
        selfRegistration: false,
        crossNetworkMatching: false,
        admissionRules: null,
        setupCompletedAt: null,
        billingMode: "standard",
        memberPaymentModel:
          input.memberPaymentModel === "network" ? "network" : "individual",
        memberMonthlyNetCents:
          input.memberMonthlyNetCents === undefined
            ? 6900
            : validMemberPrice(input.memberMonthlyNetCents),
      },
      createdAt: now,
      updatedAt: now,
    };
    validateLaunchBilling(network);
    this.store.networks.set(network.id, network);
    this.store.networkBySlug.set(network.slug, network.id);
    return network;
  }

  private operatorActivityItems(networkId: string, seenAt: string | undefined) {
    const items: Array<{
      id: string;
      title: string;
      createdAt: string;
      kind: string;
      pending: boolean;
      unread: boolean;
      area: string;
    }> = [];
    const pendingUsers = new Set<string>();
    for (const content of this.store.networkContents.values()) {
      if (content.networkId !== networkId) continue;
      if (content.data.admissionStatus === "pending") {
        pendingUsers.add(content.createdByUserId);
        items.push({
          id: `request:${content.id}`,
          title: `Teilnahmeanfrage: ${String(content.data.company || content.title).slice(0, 200)}`,
          createdAt: content.createdAt,
          kind: "request",
          pending: true,
          unread: !seenAt || content.createdAt > seenAt,
          area: "users",
        });
      } else if (
        ["event", "topic", "announcement"].includes(content.type) &&
        ["draft", "published", "active", "completed"].includes(
          content.status,
        ) &&
        !["network_invitation", "participation_referral"].includes(
          String(content.data.kind || ""),
        ) &&
        !content.data.admissionStatus
      ) {
        const changed =
          Date.parse(content.updatedAt) > Date.parse(content.createdAt) + 1000;
        const date = changed ? content.updatedAt : content.createdAt;
        items.push({
          id: `content:${content.id}`,
          title: `${content.type === "event" ? (changed ? "Veranstaltung aktualisiert" : "Neue Veranstaltung") : "Neuer Beitrag"}${content.status === "draft" ? " (Entwurf)" : ""}: ${content.title}`,
          createdAt: date,
          kind: content.type === "event" ? "event" : "post",
          pending: false,
          unread: !seenAt || date > seenAt,
          area: content.type === "event" ? "veranstaltungen" : "themen",
        });
      }
    }
    for (const member of this.store.networkMemberships) {
      if (member.networkId !== networkId || member.role === "visitor") continue;
      const user = this.store.users.get(member.userId);
      if (!user || user.accountRole === "platform_admin") continue;
      const organization = this.store.organizations.get(member.organizationId);
      for(const page of organization?.additionalCompanyPages || []){
        if(page.networkId!==networkId||page.ownerUserId!==member.userId||page.reviewStatus!=='pending')continue;
        const date=page.profile?.updatedAt||page.createdAt;
        items.push({id:'company-page:'+page.id,title:'Unternehmensseite prüfen: '+page.companyName,createdAt:date,kind:'request',pending:true,unread:!seenAt||date>seenAt,area:'users'});
      }
      const name =
        organization?.displayName || `${user.firstName} ${user.lastName}`;
      if (member.status === "pending" && !pendingUsers.has(member.userId)) {
        items.push({
          id: `member:${member.id}`,
          title: `Aufnahme prüfen: ${name}`,
          createdAt: member.createdAt,
          kind: "request",
          pending: true,
          unread: !seenAt || member.createdAt > seenAt,
          area: "users",
        });
      } else if (member.status === "active") {
        items.push({
          id: `member:${member.id}`,
          title: `Mitglied im Netzwerk: ${name}`,
          createdAt: member.createdAt,
          kind: "member",
          pending: false,
          unread: !seenAt || member.createdAt > seenAt,
          area: "users",
        });
      }
    }
    return items.sort(
      (a, b) =>
        Number(b.pending) - Number(a.pending) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  }

  operatorNetworkActivity(authorization: string | undefined, id: string) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    this.raw(id);
    const items = this.operatorActivityItems(
      id,
      actor.operatorNetworkSeenAt?.[id],
    );
    return {
      items: items.slice(0, 100),
      pendingCount: items.filter((item) => item.pending).length,
      unreadCount: items.filter((item) => item.pending || item.unread).length,
      asOf: new Date().toISOString(),
    };
  }

  markOperatorNetworkActivitySeen(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    this.raw(id);
    const asOf = typeof input.asOf === "string" ? Date.parse(input.asOf) : NaN;
    if (!Number.isFinite(asOf) || asOf > Date.now())
      throw new BadRequestException("Ungültiger Zeitpunkt.");
    const previous = actor.operatorNetworkSeenAt?.[id];
    actor.operatorNetworkSeenAt = {
      ...actor.operatorNetworkSeenAt,
      [id]: new Date(
        Math.max(asOf, previous ? Date.parse(previous) : 0),
      ).toISOString(),
    };
    return this.operatorNetworkActivity(authorization, id);
  }

  adminList(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    return [...this.store.networks.values()].map((network) => {
      const membership = this.store.networkMemberships.find(
          (item) =>
            item.networkId === network.id &&
            item.role === "network_admin" &&
            item.status === "active",
        ),
        orders = [...this.store.networkOrders.values()]
          .filter((item) => item.networkId === network.id)
          .map((item) => this.normalizeOrder(item))
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      return {
        ...network,
        activitySummary: (() => {
          const items = this.operatorActivityItems(
            network.id,
            user.operatorNetworkSeenAt?.[network.id],
          );
          return {
            pendingCount: items.filter((item) => item.pending).length,
            unreadCount: items.filter((item) => item.pending || item.unread)
              .length,
          };
        })(),
        memberCount: this.store.networkMemberships.filter(
          (item) =>
            item.networkId === network.id &&
            item.status === "active" &&
            item.role !== "visitor",
        ).length,
        memberPrice: pricing(network),
        centrallyFundedMembers: this.store.networkMemberships.filter(
          (m) =>
            m.networkId === network.id &&
            m.centrallyFunded &&
            m.status === "active",
        ).length,
        administrators: this.store.networkMemberships
          .filter(
            (m) =>
              m.networkId === network.id &&
              m.role === "network_admin" &&
              m.status === "active",
          )
          .map((m) => ({ user: this.publicUser(m.userId) })),
        administrator: membership
          ? { ...membership, user: this.publicUser(membership.userId) }
          : null,
        latestOrder: orders[0] || null,
      };
    });
  }

  async createVisitor(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    const email = emailAddress(input.email);
    if (this.store.userByEmail.has(email))
      throw new ConflictException(
        "Diese E-Mail-Adresse ist bereits registriert. Bestehende Konten werden nicht überschrieben.",
      );
    const password = `B2b!${opaqueToken()}a9`;
    const now = new Date().toISOString();
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    this.store.users.set(userId, {
      id: userId,
      email,
      passwordHash,
      firstName: "Besucher",
      lastName: network.name,
      accountRole: "user",
      emailVerifiedAt: now,
      createdAt: now,
      visitorNetworkId: networkId,
    });
    this.store.userByEmail.set(email, userId);
    this.store.networkMemberships.push({
      id: randomUUID(),
      networkId,
      userId,
      organizationId: "",
      role: "visitor",
      status: "active",
      invitedByUserId: actor.id,
      reviewedByUserId: actor.id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    this.operatorAudit(actor.id, networkId, "operator.visitor.created");
    return {
      created: true,
      email,
      password,
      loginUrl: `/anmelden?network=${encodeURIComponent(network.slug)}`,
    };
  }
  copyPartner(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const target = this.raw(networkId);
    const email = emailAddress(input.email);
    const userId = this.store.userByEmail.get(email);
    const user = userId ? this.store.users.get(userId) : undefined;
    const sourceId = this.store.networkBySlug.get(String(input.sourceSlug));
    if (
      !user ||
      user.accountRole === "platform_admin" ||
      user.visitorNetworkId ||
      !sourceId ||
      sourceId === networkId
    )
      throw new BadRequestException(
        "Bitte ein bestehendes Partnerkonto und ein anderes Quellnetzwerk wählen.",
      );
    if (target.status !== "active")
      throw new BadRequestException("Das Zielnetzwerk muss aktiv sein.");
    if (
      this.store.networkMemberships.some(
        (m) => m.networkId === networkId && m.userId === user.id,
      )
    )
      throw new ConflictException(
        "Der Nutzer ist bereits im Zielnetzwerk vorhanden. Es wird nichts überschrieben.",
      );
    const source = this.store.networkMemberships.find(
      (m) =>
        m.networkId === sourceId &&
        m.userId === user.id &&
        m.status === "active" &&
        !["visitor", "network_admin"].includes(m.role),
    );
    const original = source
      ? this.store.organizations.get(source.organizationId)
      : undefined;
    if (
      !original?.networkProfile ||
      original.networkProfile.status !== "published"
    )
      throw new BadRequestException(
        "Keine veröffentlichte Partnerseite im Quellnetzwerk gefunden.",
      );
    const now = new Date().toISOString();
    const organization = structuredClone(original);
    organization.id = randomUUID();
    organization.createdAt = now;
    organization.networkProfile!.status = "published";
    this.store.organizations.set(organization.id, organization);
    this.store.memberships.push({
      organizationId: organization.id,
      userId: user.id,
      role: "admin",
    });
    this.store.networkMemberships.push({
      id: randomUUID(),
      networkId,
      organizationId: organization.id,
      userId: user.id,
      role: "member",
      status: "active",
      ...(target.settings.memberPaymentModel === "network"
        ? { centrallyFunded: true }
        : { complimentaryAccess: true }),
      invitedByUserId: actor.id,
      reviewedByUserId: actor.id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    this.operatorAudit(actor.id, networkId, "operator.partner.copied", {
      sourceNetworkId: sourceId,
      userId: user.id,
      complimentaryAccess: true,
    });
    return {
      copied: true,
      published: true,
      email,
      network: target.name,
      complimentaryAccess: true,
    };
  }
  adminUsers(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    const rows = new Map<
      string,
      {
        name: string;
        email: string;
        role: string;
        status: string;
        startsAt: string | null;
        endsAt: string | null;
        profile: string;
        orderId?: string;
        orderIds?: string[];
        userId?: string;
        paidAt?: string | null;
        paymentStatus?: string;
        centrallyFunded?: boolean;
        loginCount?: number;
        lastLoginAt?: string | null;
        loginTrackingStartedAt?: string | null;
        admissionStatus?: string;
        company?: string;
        affiliation?: string;
      }
    >();
    const addUser = (
      userId: string,
      role: string,
      status: string,
      organizationId?: string,
    ) => {
      const user = this.store.users.get(userId);
      if (!user || user.accountRole === "platform_admin") return;
      const order = [...this.store.networkOrders.values()]
        .filter(
          (o) =>
            o.networkId === networkId &&
            o.orderedByUserId === userId &&
            o.kind === "member_annual" &&
            o.status === "accepted",
        )
        .sort((a, b) =>
          (b.serviceEndsAt || "").localeCompare(a.serviceEndsAt || ""),
        )[0];
      const profile = organizationId
        ? this.store.organizations.get(organizationId)?.networkProfile
        : null;
      const complete =
        profile &&
        profile.status === "published" &&
        [
          profile.companyName,
          profile.tagline,
          profile.description,
          profile.services,
          profile.street,
          profile.postalCode,
          profile.city,
          profile.country,
          profile.contactName,
          profile.contactPosition,
          profile.contactEmail,
          profile.contactPhone,
        ].every((v) => Boolean(v?.trim()));
      rows.set(user.email.toLowerCase(), {
        centrallyFunded: this.store.networkMemberships.some(
          (m) =>
            m.networkId === networkId &&
            m.userId === userId &&
            m.centrallyFunded,
        ),
        orderId: order?.id,
        userId,
        orderIds: [...this.store.networkOrders.values()]
          .filter(
            (o) =>
              o.networkId === networkId &&
              o.orderedByUserId === userId &&
              o.kind === "member_annual",
          )
          .map((o) => o.id),
        paidAt: order?.paidAt,
        paymentStatus: order?.paymentStatus,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role,
        loginCount: user.loginCount || 0,
        lastLoginAt: user.lastLoginAt || null,
        loginTrackingStartedAt: user.loginTrackingStartedAt || null,
        status: !user.emailVerifiedAt
          ? "E-Mail unbestätigt"
          : order?.serviceEndsAt && Date.parse(order.serviceEndsAt) < Date.now()
            ? "Vertragslaufzeit abgelaufen"
            : status,
        startsAt: order?.serviceStartsAt || null,
        endsAt: order?.serviceEndsAt || null,
        profile:
          role === "visitor"
            ? "Keine eigene Partnerseite"
            : complete
              ? "Vollständig & veröffentlicht"
              : profile
                ? "Unvollständig / Entwurf"
                : "Nicht angelegt",
      });
    };
    for (const member of this.store.networkMemberships.filter(
      (m) => m.networkId === networkId,
    ))
      addUser(member.userId, member.role, member.status, member.organizationId);
    for (const user of this.store.users.values())
      if (
        user.serviceSetup?.networkId === networkId &&
        !user.serviceSetup.claimedAt
      )
        addUser(
          user.id,
          "member",
          "In Einrichtung",
          user.serviceSetup.organizationId,
        );
    const invitations = [...this.store.networkContents.values()]
      .filter(
        (i) =>
          i.networkId === networkId &&
          i.data.kind === "network_invitation" &&
          !i.data.usedAt,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const invitation of invitations) {
      const email = String(invitation.data.email || "").toLowerCase();
      if (!email || rows.has(email)) continue;
      const userId = this.store.userByEmail.get(email);
      if (userId)
        addUser(
          userId,
          String(invitation.data.role || "member"),
          "Registriert – Buchung offen",
        );
      else
        rows.set(email, {
          name: "Noch nicht registriert",
          email,
          role: String(invitation.data.role || "member"),
          status:
            invitation.endsAt && Date.parse(invitation.endsAt) < Date.now()
              ? "Einladung abgelaufen"
              : "Eingeladen",
          startsAt: null,
          endsAt: null,
          profile: "Nicht angelegt",
        });
    }
    return {
      networkName: network.name,
      users: [...rows.values()]
        .map((row) => {
          const user = row.userId
              ? this.store.users.get(row.userId)
              : undefined,
            s = user?.serviceSetup;
          if (s && s.networkId === networkId) {
            const o = this.store.networkOrders.get(s.orderId || "");
            return {
              ...row,
              company: this.store.organizations.get(s.organizationId)
                ?.displayName,
              complimentaryAccess: !!s.complimentaryAccess,
              centrallyFunded: !s.orderId && !s.complimentaryAccess,
              status: s.claimedAt
                ? row.status
                : s.sentAt
                  ? "Übergabe versendet"
                  : "In Einrichtung",
              service: {
                sentAt: s.sentAt,
                claimedAt: s.claimedAt,
                invoicedAt: o?.invoiceSentAt || null,
                individual: !!o,
                invoiceEmail: o?.invoiceEmail,
                grossCents: o?.grossCents,
                months: o?.minimumTermMonths,
              },
            };
          }
          const request = invitations.find(
            (i) => i.data.email === row.email && i.data.admissionStatus,
          );
          return request
            ? {
                ...row,
                admissionStatus: String(request.data.admissionStatus),
                company: String(request.data.company || ""),
                affiliation: String(request.data.affiliation || ""),
                status:
                  request.data.admissionStatus === "pending"
                    ? "Teilnahme wird geprüft"
                    : request.data.admissionStatus === "rejected"
                      ? "Anfrage abgelehnt"
                      : row.status,
              }
            : row;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    };
  }

  async referral(
    auth: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(auth);
    this.requireWritableNetwork(actor.id, id);
    const n = this.raw(id),
      m = this.store.networkMemberships.find(
        (m) =>
          m.networkId === id &&
          m.userId === actor.id &&
          m.status === "active" &&
          m.role !== "visitor",
      );
    if (!m || n.status !== "active")
      throw new ForbiddenException("Nur aktive Mitglieder können empfehlen.");
    const key = "ref:" + m.id,
      now = new Date().toISOString();
    let r = this.store.networkContents.get(key);
    if (!r || !r.endsAt || Date.parse(r.endsAt) <= Date.now()) {
      const token = opaqueToken(),
        isRequest = [
          "unternehmerfreunde",
          "bayer04leverkusen",
          "unternehmernetzwerkleverkusen",
          "unternehmernetzwerkkoeln",
        ].includes(n.slug);
      r = {
        id: key,
        networkId: id,
        type: "announcement",
        title: "Persönlicher Empfehlungslink",
        description: "",
        status: "active",
        visibility: "administrators",
        createdByUserId: actor.id,
        assignedToUserId: null,
        startsAt: null,
        endsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        createdAt: now,
        updatedAt: now,
        data: {
          kind: isRequest ? "participation_referral" : "network_invitation",
          shared: !isRequest,
          role: "member",
          referrer: actor.id,
          sharedToken: token,
          inviteTokenHash: tokenHash(token),
          usedAt: null,
        },
      };
      this.store.networkContents.set(key, r);
    }
    const path =
      "/registrieren?network=" +
      encodeURIComponent(n.slug) +
      "&" +
      ([
        "unternehmerfreunde",
        "bayer04leverkusen",
        "unternehmernetzwerkleverkusen",
        "unternehmernetzwerkkoeln",
      ].includes(n.slug)
        ? "ref"
        : "invite") +
      "=" +
      encodeURIComponent(String(r.data.sharedToken));
    if (input.email) {
      const email = emailAddress(input.email);
      if (input.permission !== true || email === actor.email)
        throw new BadRequestException(
          "Bitte bestätige die vorherige Einwilligung des Empfängers.",
        );
      const history = Array.isArray(r.data.deliveries)
        ? (r.data.deliveries as { hash: string; at: number }[])
        : [];
      const today = history.filter((d) => Date.now() - d.at < 86400000),
        hash = tokenHash(email);
      if (today.length >= 10 || today.some((d) => d.hash === hash))
        throw new ConflictException(
          "Versandlimit erreicht oder heute bereits eingeladen.",
        );
      r.data.deliveries = [...today, { hash, at: Date.now() }];
      await this.email.sendNetworkNote(
        email,
        n.name,
        "Persönliche Empfehlung",
        actor.firstName +
          " " +
          actor.lastName +
          " lädt dich ein, das Netzwerk " +
          n.name +
          " kennenzulernen.",
        "Zur Registrierung",
        path,
      );
    }
    return { path };
  }
  sharedInvitation(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    if (
      input.confirmName !== network.name ||
      input.confirmAgain !== network.name
    )
      throw new BadRequestException("Bitte das Netzwerk zweimal bestätigen.");
    if (network.status !== "active")
      throw new BadRequestException("Das Netzwerk muss aktiv sein.");
    let record = [...this.store.networkContents.values()].find(
      (i) =>
        i.networkId === networkId &&
        i.data.shared === true &&
        !i.data.referrer &&
        i.endsAt &&
        Date.parse(i.endsAt) > Date.now(),
    );
    if (!record) {
      const token = opaqueToken(),
        now = new Date().toISOString();
      record = {
        id: randomUUID(),
        networkId,
        type: "announcement",
        title: "Teilbarer Registrierungslink",
        description: "Registrierung als zahlungspflichtiger Partner",
        status: "active",
        createdByUserId: actor.id,
        assignedToUserId: null,
        startsAt: null,
        endsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        visibility: "administrators",
        data: {
          kind: "network_invitation",
          shared: true,
          sharedToken: token,
          inviteTokenHash: tokenHash(token),
          role: "member",
          usedAt: null,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.store.networkContents.set(record.id, record);
    }
    return {
      path: `/registrieren?network=${encodeURIComponent(network.slug)}&invite=${encodeURIComponent(String(record.data.sharedToken))}`,
      expiresAt: record.endsAt,
    };
  }
  participationQuote(slug: string) {
    const network = [...this.store.networks.values()].find(
      (n) => n.slug === slug && n.status === "active",
    );
    if (
      ![
        "unternehmerfreunde",
        "bayer04leverkusen",
        "unternehmernetzwerkleverkusen",
        "unternehmernetzwerkkoeln",
      ].includes(slug) ||
      !network
    )
      throw new BadRequestException(
        "Teilnahmeanfragen sind derzeit nicht verfügbar.",
      );
    const quote = pricing(network);
    const offer = {
      ...quote,
      launchPromotion: publicLaunchOffer(network,this.store.launchUsed(network.id)),
      centrallyFunded: network.settings.memberPaymentModel === "network",
      schedule: quote.billing?.freeUntil
        ? invoiceSchedule(quote.billing.freeUntil)
        : null,
      renewalDeadline:
        quote.billing?.autoRenew && quote.billing.paidThrough
          ? addCalendarDays(quote.billing.paidThrough, -15)
          : null,
      termsVersion: "agb-2026-11-05",
      privacyVersion: "datenschutz-2026-11-03",
    };
    return { ...offer, version: tokenHash(JSON.stringify(offer)) };
  }
  async refreshLaunchCounter() { await this.store.refreshLaunchPlaces(); }
  async requestParticipation(input: Record<string, unknown>) {
    if (
      ![
        "unternehmerfreunde",
        "bayer04leverkusen",
        "unternehmernetzwerkleverkusen",
        "unternehmernetzwerkkoeln",
      ].includes(String(input.network))
    )
      throw new ForbiddenException(
        "Teilnahmeanfragen sind für dieses Netzwerk nicht verfügbar.",
      );
    const network = [...this.store.networks.values()].find(
      (n) => n.slug === input.network && n.status === "active",
    );
    if (!network)
      throw new BadRequestException(
        "Das Netzwerk ist derzeit nicht verfügbar.",
      );
    const email = emailAddress(input.email);
    const offer = this.participationQuote(String(input.network));
    if (input.offerVersion !== offer.version)
      throw new BadRequestException(
        "Die Konditionen wurden aktualisiert. Bitte lade die Kostenübersicht erneut und bestätige sie.",
      );
    if (
      input.costsAccepted !== true ||
      input.termsAccepted !== true ||
      input.privacyAcknowledged !== true
    )
      throw new BadRequestException(
        "Bitte Kosten, AGB und Datenschutzhinweise bestätigen.",
      );
    const company = requiredText(input.company, "Unternehmen", 2, 200);
    const affiliation = requiredText(
      input.affiliation,
      "Zugehörigkeit",
      2,
      100,
    );
    if (
      !(
        ["unternehmernetzwerkleverkusen", "unternehmernetzwerkkoeln"].includes(
          network.slug,
        )
          ? [
              network.slug === "unternehmernetzwerkkoeln"
                ? "Unternehmenssitz in Köln"
                : "Unternehmenssitz in Leverkusen",
            ]
          : network.slug === "unternehmerfreunde"
            ? ["Mitglied der Unternehmerfreunde", "Interesse an einer Mitgliedschaft", "Sonstiger Bezug"]
          : [
              "Hospitality-/VIP-Gast",
              "Unternehmenspartner/Sponsor",
              "Sonstiger Bezug",
            ]
      ).includes(affiliation) ||
      input.accurate !== true
    )
      throw new BadRequestException(
        "Bitte Zugehörigkeit auswählen und die Richtigkeit der Angaben bestätigen.",
      );
    if (
      [...this.store.networkContents.values()].some(
        (i) =>
          i.networkId === network.id &&
          i.data.email === email &&
          i.data.admissionStatus &&
          !i.data.usedAt,
      )
    )
      throw new BadRequestException(
        "Für diese E-Mail liegt bereits eine Teilnahmeanfrage vor. Bitte melde dich an, um den Status zu sehen.",
      );
    const token = opaqueToken(),
      now = new Date().toISOString();
    const record: NetworkContentRecord = {
      id: randomUUID(),
      networkId: network.id,
      type: "announcement",
      title: `Teilnahmeanfrage: ${company}`,
      description: affiliation,
      status: "active",
      createdByUserId: "system:participation",
      assignedToUserId: null,
      startsAt: null,
      endsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      visibility: "administrators",
      data: {
        kind: "network_invitation",
        email,
        role: "member",
        inviteTokenHash: tokenHash(token),
        usedAt: null,
        admissionStatus: "pending",
        participationConsent: {
          offer,
          acceptedAt: now,
          costsAccepted: true,
          termsAccepted: true,
          privacyAcknowledged: true,
          renewalAccepted: input.renewalAccepted === true,
        },
        referrer: [...this.store.networkContents.values()].find(
          (r) =>
            r.networkId === network.id &&
            r.data.kind === "participation_referral" &&
            typeof input.referral === "string" &&
            r.data.sharedToken === input.referral &&
            r.endsAt &&
            Date.parse(r.endsAt) > Date.now(),
        )?.createdByUserId,
        company,
        affiliation,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.store.networkContents.set(record.id, record);
    try {
      await this.auth.register({ ...input, networkInviteToken: token }, true);
    } catch (error) {
      this.store.networkContents.delete(record.id);
      throw error;
    }
    record.createdByUserId = this.store.userByEmail.get(email)!;
    attributeMailingRegistration(
      this.store,
      input.mailingToken,
      email,
      network.id,
      record.createdByUserId,
    );
    enqueueOperatorMail(
      this.store,
      `participation:${record.id}`,
      "Neue Teilnahmeanfrage – Prüfung erforderlich",
      `Netzwerk: ${network.name}\nUnternehmen: ${company}\nE-Mail: ${email}\nZugehörigkeit: ${affiliation}\nBitte in der Nutzerübersicht prüfen und freigeben oder ablehnen. Noch kein Netzwerkzugriff und keine Buchung.`,
    );
    return { requested: true };
  }
  participationNetworks(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    const ids = new Set(
      [...this.store.networkContents.values()]
        .filter(
          (i) =>
            i.data.kind === "network_invitation" &&
            i.data.email === user.email &&
            i.data.admissionStatus &&
            !i.data.usedAt,
        )
        .map((i) => i.networkId),
    );
    return [...this.store.networks.values()]
      .filter((n) => ids.has(n.id))
      .map((n) => ({ slug: n.slug, name: n.name }));
  }
  participationStatus(authorization: string | undefined, slug: string) {
    const user = this.auth.authenticate(authorization);
    const network = [...this.store.networks.values()].find(
      (n) => n.slug === slug,
    );
    const request = [...this.store.networkContents.values()].find(
      (i) =>
        i.networkId === network?.id &&
        i.data.email === user.email &&
        i.data.admissionStatus &&
        !i.data.usedAt,
    );
    if (!request) return { status: null };
    return {
      status: request.data.admissionStatus,
      ...(network &&
      user.emailVerifiedAt &&
      request.data.admissionStatus === "pending"
        ? {
            preview: {
              slug: network.slug,
              name: network.name,
              logoUrl: network.logoUrl,
              primaryColor: network.primaryColor,
              secondaryColor: network.secondaryColor,
              modules: network.enabledModules,
              bannerImageUrl: network.settings.bannerImageUrl || null,
              bannerTitle:
                network.settings.welcomeTitle ||
                network.settings.bannerTitle ||
                null,
              bannerDescription:
                network.settings.welcomeIntro ||
                network.settings.bannerDescription ||
                null,
            },
          }
        : {}),
      ...(request.data.admissionStatus === "approved" && user.emailVerifiedAt
        ? { invite: request.data.admissionOnboardingToken }
        : {}),
    };
  }
  resolveSharedInvitation(input: Record<string, unknown>) {
    const hash = tokenHash(requiredText(input.invite, "Einladung", 20, 200)),
      email = emailAddress(input.email);
    const shared = [...this.store.networkContents.values()].find(
      (i) =>
        i.data.kind === "network_invitation" &&
        i.data.inviteTokenHash === hash &&
        !i.data.usedAt &&
        i.endsAt &&
        Date.parse(i.endsAt) > Date.now(),
    );
    if (!shared)
      throw new BadRequestException(
        "Der Netzwerklink ist ungültig oder abgelaufen.",
      );
    if (
      shared.data.admissionStatus &&
      shared.data.admissionStatus !== "approved"
    )
      throw new ForbiddenException(
        "Deine Teilnahme ist noch nicht freigegeben.",
      );
    if (
      shared.data.referrer &&
      !this.store.networkMemberships.some(
        (m) =>
          m.userId === shared.data.referrer &&
          m.networkId === shared.networkId &&
          m.status === "active" &&
          m.role !== "visitor",
      )
    )
      throw new ForbiddenException("Diese Empfehlung ist nicht mehr aktiv.");
    if (shared.data.shared !== true) {
      if (shared.data.email !== email)
        throw new ForbiddenException(
          "Die Einladung gehört zu einer anderen E-Mail-Adresse.",
        );
      return { invite: String(input.invite) };
    }
    if (this.raw(shared.networkId).status !== "active")
      throw new ForbiddenException("Das Netzwerk ist nicht aktiv.");
    const token = opaqueToken(),
      now = new Date().toISOString();
    const personal = {
      ...shared,
      id: randomUUID(),
      title: `Netzwerkeinladung ${email}`,
      data: {
        referrer: shared.data.referrer,
        kind: "network_invitation",
        email,
        role: "member",
        inviteTokenHash: tokenHash(token),
        usedAt: null,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.store.networkContents.set(personal.id, personal);
    return { invite: token };
  }
  async adminUserAction(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    this.raw(networkId);
    const email = emailAddress(input.email),
      userId = this.store.userByEmail.get(email);
    if (!userId || this.store.users.get(userId)?.accountRole !== "user")
      throw new BadRequestException("Kein verwaltbarer Nutzer.");
    const member = this.store.networkMemberships.find(
      (m) => m.networkId === networkId && m.userId === userId,
    );
    const invited = [...this.store.networkContents.values()].some(
      (i) =>
        i.networkId === networkId &&
        i.data.kind === "network_invitation" &&
        i.data.email === email,
    );
    const prepared = this.store.users.get(userId)?.serviceSetup;
    if (this.handingOver.has(userId))
      throw new ConflictException("Übergabe läuft bereits.");
    if (
      prepared?.networkId === networkId &&
      !prepared.claimedAt &&
      input.action !== "deleteUser" &&
      !(
        ["paid", "unpaid"].includes(String(input.action)) &&
        this.store.networkOrders.get(prepared.orderId || "")?.invoiceSentAt
      )
    )
      throw new BadRequestException(
        "Bitte die Aktionen für den Serviceauftrag verwenden.",
      );
    if (!member && !invited && prepared?.networkId !== networkId)
      throw new ForbiddenException("Nutzer gehört nicht zu diesem Netzwerk.");
    if (input.action === "deleteUser") {
      if (
        input.confirmEmail !== email ||
        input.confirmNetwork !== networkId ||
        input.confirmUserId !== userId
      )
        throw new BadRequestException(
          "Löschung nicht bestätigt oder Zugang inzwischen geändert.",
        );
      const result = removeNetworkUser(this.store, networkId, userId, email);
      this.operatorAudit(actor.id, networkId, "operator.user.removed");
      await this.store.persist();
      return result;
    }
    if (input.action === "approveRequest" || input.action === "rejectRequest") {
      const request = [...this.store.networkContents.values()].find(
        (i) =>
          i.networkId === networkId &&
          i.data.email === email &&
          i.data.admissionStatus === "pending",
      );
      if (!request)
        throw new BadRequestException(
          "Keine offene Teilnahmeanfrage gefunden.",
        );
      if (!this.store.users.get(userId)?.emailVerifiedAt)
        throw new BadRequestException(
          "Bitte zuerst die E-Mail-Bestätigung abwarten.",
        );
      if (input.action === "approveRequest") {
        const token = opaqueToken();
        await this.email.sendNetworkAccessGranted({
          email,
          networkName: this.raw(networkId).name,
          networkSlug: this.raw(networkId).slug,
        });
        request.data.inviteTokenHash = tokenHash(token);
        request.data.admissionOnboardingToken = token;
        request.endsAt = new Date(Date.now() + 90 * 86400000).toISOString();
        request.data.admissionStatus = "approved";
      } else request.data.admissionStatus = "rejected";
      request.data.reviewedBy = actor.id;
      request.updatedAt = new Date().toISOString();
    } else if (input.action === "role") {
      if (
        !["network_admin", "moderator", "member"].includes(String(input.role))
      )
        throw new BadRequestException("Ungültige Rolle.");
      if (!member) {
        if (input.role !== "network_admin")
          throw new BadRequestException(
            "Die Registrierung ist noch nicht abgeschlossen.",
          );
        return this.appointAdministrator(authorization, networkId, { email });
      }
      member.role = input.role as NetworkRole;
      member.updatedAt = new Date().toISOString();
    } else if (input.action === "suspend" || input.action === "activate") {
      if (!member)
        throw new BadRequestException("Noch kein Mitgliedszugang vorhanden.");
      member.status = input.action === "suspend" ? "suspended" : "active";
      member.updatedAt = new Date().toISOString();
    } else if (input.action === "paid" || input.action === "unpaid") {
      const order = this.store.networkOrders.get(String(input.orderId));
      if (
        !order ||
        order.networkId !== networkId ||
        order.orderedByUserId !== userId ||
        order.kind !== "member_annual"
      )
        throw new BadRequestException("Buchung nicht gefunden.");
      order.paymentStatus = input.action === "paid" ? "paid" : "open";
      order.paidAt = input.action === "paid" ? new Date().toISOString() : null;
    } else throw new BadRequestException("Ungültige Aktion.");
    this.operatorAudit(
      actor.id,
      networkId,
      `operator.user.${String(input.action)}`,
    );
    return { ok: true };
  }

  moduleCatalog() {
    return {
      modules: NETWORK_MODULE_CATALOG,
      completeUnitNetCents: NETWORK_COMPLETE_UNIT_NET_CENTS,
      setupNetCents: NETWORK_SETUP_NET_CENTS,
      currency: "EUR",
      billingUnit: "active_network_user",
      includedModules: NETWORK_INCLUDED_MODULES,
    };
  }

  interfaceTexts(slug: string) {
    this.branding(slug);
    const network = this.bySlug(slug);
    return {
      texts: network.settings.textOverrides || {},
      revision: network.settings.textRevision || 0,
    };
  }

  ownerInterfaceTexts(authorization: string | undefined, id: string) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(id);
    return {
      networkId: network.id,
      slug: network.slug,
      texts: network.settings.textOverrides || {},
      revision: network.settings.textRevision || 0,
    };
  }

  saveInterfaceText(
    authorization: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(id);
    if (
      typeof input.key !== "string" ||
      !/^ui\.[a-zA-Z0-9_.-]{1,120}$/.test(input.key)
    )
      throw new BadRequestException("Ungültiger Textschlüssel.");
    if (
      input.value !== null &&
      (typeof input.value !== "string" ||
        input.value.length > 4000 ||
        !input.value.trim() ||
        /[<>\u0000-\u0008]/.test(input.value))
    )
      throw new BadRequestException(
        "Bitte einen Text ohne HTML mit maximal 4.000 Zeichen eingeben.",
      );
    const revision = network.settings.textRevision || 0;
    if (input.revision !== revision)
      throw new BadRequestException(
        "Die Texte wurden zwischenzeitlich geändert. Bitte die Seite neu öffnen.",
      );
    const texts = { ...network.settings.textOverrides };
    if (input.value === null) delete texts[input.key];
    else texts[input.key] = (input.value as string).trim();
    if (Object.keys(texts).length > 3000)
      throw new BadRequestException(
        "Maximale Anzahl an Textanpassungen erreicht.",
      );
    network.settings.textOverrides = texts;
    network.settings.textRevision = revision + 1;
    network.updatedAt = new Date().toISOString();
    this.operatorAudit(actor.id, id, "operator.network.text.updated", {
      key: input.key,
      reset: input.value === null,
    });
    return { texts, revision: revision + 1 };
  }

  branding(slug: string) {
    const network = this.bySlug(slug);
    const accessible =
      network.status === "active" ||
      (network.status === "trial" &&
        Boolean(network.trialEndsAt) &&
        Date.parse(network.trialEndsAt!) > Date.now());
    if (!accessible)
      throw new NotFoundException("Netzwerkportal nicht gefunden.");
    return {
      slug: network.slug,
      name: network.name,
      logoUrl: network.logoUrl,
      primaryColor: network.primaryColor,
      secondaryColor: network.secondaryColor,
      websiteUrl: network.websiteUrl,
    };
  }

  setAccess(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(user.id);
    const network = this.raw(networkId);
    const status = input.status;
    if (!["draft", "trial", "active", "suspended"].includes(String(status)))
      throw new BadRequestException("Ungültiger Netzwerkstatus.");
    network.status = status as NetworkRecord["status"];
    network.trialEndsAt = null;
    if (status === "trial") {
      const days = Number(input.trialDays);
      if (!Number.isInteger(days) || days < 1 || days > 180)
        throw new BadRequestException(
          "Testzugänge müssen zwischen 1 und 180 Tagen laufen.",
        );
      network.trialEndsAt = new Date(
        Date.now() + days * 86_400_000,
      ).toISOString();
      network.enabledModules = expandNetworkModules(allProductModuleIds());
    }
    if (status === "active" && input.billingMode === "cooperation_free") {
      network.settings.billingMode = "cooperation_free";
      network.enabledModules = expandNetworkModules(allProductModuleIds());
    } else if (status === "active" && input.billingMode === "standard")
      network.settings.billingMode = "standard";
    network.settings.selfRegistration = false;
    network.updatedAt = new Date().toISOString();
    return network;
  }

  async appointAdministrator(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    const email = requiredText(
      input.email,
      "Geschäftliche E-Mail-Adresse",
      5,
      250,
    ).toLowerCase();
    const userId = this.store.userByEmail.get(email);
    if (!userId) {
      const inviteToken = opaqueToken(),
        now = new Date().toISOString(),
        invitation: NetworkContentRecord = {
          id: randomUUID(),
          networkId,
          type: "announcement",
          title: `Initiator-Einladung ${email}`,
          description:
            "Persönliche Einladung als Initiator und Netzwerkadministrator",
          status: "active",
          createdByUserId: actor.id,
          assignedToUserId: null,
          startsAt: null,
          endsAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          visibility: "administrators",
          data: {
            kind: "network_invitation",
            email,
            role: "network_admin",
            inviteTokenHash: tokenHash(inviteToken),
            usedAt: null,
          },
          createdAt: now,
          updatedAt: now,
        };
      this.store.networkContents.set(invitation.id, invitation);
      await this.email.sendNetworkInvitation({
        email,
        networkName: network.name,
        networkSlug: network.slug,
        inviteToken,
      });
      enqueueOperatorMail(
        this.store,
        `invitation:${invitation.id}`,
        "Neue Netzwerkeinladung versendet",
        `Netzwerk: ${network.name}\nEingeladene E-Mail-Adresse: ${email}\nRolle: Initiator\nDie Einladung wurde versendet.`,
      );
      return {
        invited: true,
        email,
        registrationRequired: true,
        role: "network_admin",
      };
    }
    let companyMembership = this.store.memberships.find(
      (item) => item.userId === userId,
    );
    if (!companyMembership) {
      const organization = this.createInitiatorOrganization(userId, network);
      companyMembership = {
        organizationId: organization.id,
        userId,
        role: "admin",
      };
    }
    const membership = this.addMember(authorization, networkId, {
      organizationId: companyMembership.organizationId,
      userId,
      role: "network_admin",
    });
    await this.email.sendNetworkAccessGranted({
      email,
      networkName: network.name,
      networkSlug: network.slug,
    });
    return membership;
  }

  remove(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId);
    if (input.confirmSlug !== network.slug)
      throw new BadRequestException(
        "Zur Bestätigung muss die exakte Netzwerk-Kennung angegeben werden.",
      );
    const networkMemberships = this.store.networkMemberships.filter(
      (item) => item.networkId === networkId,
    );
    const organizationIds = new Set(
      networkMemberships.map((item) => item.organizationId),
    );
    const userIds = new Set(
      networkMemberships
        .map((item) => item.userId)
        .filter(
          (userId) =>
            this.store.users.get(userId)?.accountRole !== "platform_admin",
        ),
    );
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const membership of this.store.memberships) {
        if (
          userIds.has(membership.userId) &&
          !organizationIds.has(membership.organizationId)
        ) {
          organizationIds.add(membership.organizationId);
          expanded = true;
        }
        if (
          organizationIds.has(membership.organizationId) &&
          this.store.users.get(membership.userId)?.accountRole !==
            "platform_admin" &&
          !userIds.has(membership.userId)
        ) {
          userIds.add(membership.userId);
          expanded = true;
        }
      }
    }
    const removedNetworkMembershipIds = new Set(
      this.store.networkMemberships
        .filter(
          (item) =>
            item.networkId === networkId ||
            organizationIds.has(item.organizationId) ||
            userIds.has(item.userId),
        )
        .map((item) => item.id),
    );
    const servicePageIds = new Set(
      [...this.store.servicePages.values()]
        .filter((item) => organizationIds.has(item.organizationId))
        .map((item) => item.id),
    );
    const needIds = new Set(
      [...this.store.needs.values()]
        .filter(
          (item) =>
            item.networkId === networkId ||
            organizationIds.has(item.organizationId),
        )
        .map((item) => item.id),
    );
    const matchIds = new Set(
      [...this.store.matches.values()]
        .filter(
          (item) =>
            needIds.has(item.needId) ||
            servicePageIds.has(item.servicePageId) ||
            organizationIds.has(item.buyerOrganizationId) ||
            organizationIds.has(item.providerOrganizationId),
        )
        .map((item) => item.id),
    );
    const conversationIds = new Set(
      [...this.store.conversations.values()]
        .filter((item) => matchIds.has(item.matchId))
        .map((item) => item.id),
    );
    for (const [id, item] of this.store.networkContents)
      if (
        item.networkId === networkId ||
        userIds.has(item.createdByUserId) ||
        userIds.has(item.assignedToUserId || "")
      )
        this.store.networkContents.delete(id);
    for (const [id, item] of this.store.networkAttendances)
      if (
        item.networkId === networkId ||
        removedNetworkMembershipIds.has(item.membershipId) ||
        userIds.has(item.userId) ||
        userIds.has(item.updatedByUserId)
      )
        this.store.networkAttendances.delete(id);
    for (const [id, item] of this.store.networkRevenues)
      if (
        item.networkId === networkId ||
        removedNetworkMembershipIds.has(item.referringMembershipId) ||
        removedNetworkMembershipIds.has(item.beneficiaryMembershipId) ||
        userIds.has(item.createdByUserId)
      )
        this.store.networkRevenues.delete(id);
    for (const [id, item] of this.store.networkOrders)
      if (item.networkId === networkId || userIds.has(item.orderedByUserId))
        this.store.networkOrders.delete(id);
    for (const [id, item] of this.store.servicePages)
      if (servicePageIds.has(id)) this.store.servicePages.delete(id);
    for (const [id] of this.store.needs)
      if (needIds.has(id)) this.store.needs.delete(id);
    for (const id of matchIds) this.store.matches.delete(id);
    for (const id of conversationIds) this.store.conversations.delete(id);
    for (const [id, item] of this.store.meetings)
      if (matchIds.has(item.matchId) || userIds.has(item.createdByUserId))
        this.store.meetings.delete(id);
    for (const [id, item] of this.store.teamInvitations)
      if (
        organizationIds.has(item.organizationId) ||
        userIds.has(item.invitedByUserId)
      )
        this.store.teamInvitations.delete(id);
    for (const [id, item] of this.store.favorites)
      if (
        userIds.has(item.userId) ||
        organizationIds.has(item.providerOrganizationId) ||
        matchIds.has(item.matchId)
      )
        this.store.favorites.delete(id);
    for (const [id, item] of this.store.userPreferences)
      if (userIds.has(item.userId)) this.store.userPreferences.delete(id);
    for (const [id, item] of this.store.sessions)
      if (userIds.has(item.userId)) this.store.sessions.delete(id);
    for (const [id, item] of this.store.verificationTokens)
      if (userIds.has(item.userId)) this.store.verificationTokens.delete(id);
    for (const [id, item] of this.store.passwordResetTokens)
      if (userIds.has(item.userId)) this.store.passwordResetTokens.delete(id);
    this.store.messages.splice(
      0,
      this.store.messages.length,
      ...this.store.messages.filter(
        (item) =>
          !conversationIds.has(item.conversationId) &&
          !userIds.has(item.senderUserId),
      ),
    );
    this.store.networkMemberships.splice(
      0,
      this.store.networkMemberships.length,
      ...this.store.networkMemberships.filter(
        (item) => !removedNetworkMembershipIds.has(item.id),
      ),
    );
    this.store.memberships.splice(
      0,
      this.store.memberships.length,
      ...this.store.memberships.filter(
        (item) =>
          !organizationIds.has(item.organizationId) &&
          !userIds.has(item.userId),
      ),
    );
    this.store.reviewDecisions.splice(
      0,
      this.store.reviewDecisions.length,
      ...this.store.reviewDecisions.filter(
        (item) =>
          !organizationIds.has(item.organizationId) &&
          !userIds.has(item.reviewerId),
      ),
    );
    this.store.activities.splice(
      0,
      this.store.activities.length,
      ...this.store.activities.filter(
        (item) =>
          item.data.networkId !== networkId &&
          !organizationIds.has(item.organizationId || "") &&
          !userIds.has(item.actorUserId || "") &&
          (!item.matchId || !matchIds.has(item.matchId)),
      ),
    );
    this.store.notifications.splice(
      0,
      this.store.notifications.length,
      ...this.store.notifications.filter(
        (item) =>
          !userIds.has(item.userId) && item.data.networkId !== networkId,
      ),
    );
    for (const organizationId of organizationIds)
      this.store.organizations.delete(organizationId);
    for (const userId of userIds) {
      const user = this.store.users.get(userId);
      if (user) this.store.userByEmail.delete(user.email);
      this.store.users.delete(userId);
    }
    for (const [id, connection] of this.store.networkConnections)
      if (connection.networkId === networkId)
        this.store.networkConnections.delete(id);
    for (const [id, message] of this.store.networkSystemMessages)
      if (message.networkId === networkId)
        this.store.networkSystemMessages.delete(id);
    this.store.networks.delete(networkId);
    this.store.networkBySlug.delete(network.slug);
    return {
      deleted: true,
      id: networkId,
      slug: network.slug,
      deletedOrganizations: organizationIds.size,
      deletedUsers: userIds.size,
    };
  }

  publicBySlug(authorization: string | undefined, slug: string) {
    const user = this.auth.authenticate(authorization);
    const id = this.store.networkBySlug.get(slug);
    if (!id) throw new NotFoundException("Netzwerk nicht gefunden.");
    const network =
      user.accountRole === "platform_admin" ? this.raw(id) : this.bySlug(slug);
    if (
      user.accountRole === "platform_admin" &&
      !this.store.activities
        .slice(-100)
        .some(
          (a) =>
            a.type === "operator.network.opened" &&
            a.actorUserId === user.id &&
            a.data.networkId === id &&
            Date.parse(a.createdAt) > Date.now() - 60_000,
        )
    )
      this.operatorAudit(user.id, id, "operator.network.opened");
    this.requireNetworkAccess(user.id, network.id);
    const annual = [...this.store.networkOrders.values()]
      .filter(
        (o) =>
          o.kind === "member_annual" &&
          o.networkId === network.id &&
          o.orderedByUserId === user.id &&
          o.status === "accepted",
      )
      .sort((a, b) =>
        (b.serviceEndsAt || "").localeCompare(a.serviceEndsAt || ""),
      )[0];
    return {
      membershipYear: annual
        ? {
            startsAt: annual.serviceStartsAt,
            endsAt: annual.serviceEndsAt,
            endingSoon:
              Date.parse(annual.serviceEndsAt || "") <=
              Date.now() + 42 * 86400000,
          }
        : null,
      id: network.id,
      slug: network.slug,
      name: network.name,
      legalName: network.legalName,
      websiteUrl: network.websiteUrl,
      logoUrl: network.logoUrl,
      primaryColor: network.primaryColor,
      secondaryColor: network.secondaryColor,
      colors: {
        primary: network.primaryColor,
        secondary: network.secondaryColor,
      },
      enabledModules: this.userModules(user.id, network.id),
      offeredModules: network.enabledModules,
      settings: network.settings,
      selfRegistration: network.settings.selfRegistration,
    };
  }

  mine(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    return this.store.networkMemberships
      .filter((item) => item.userId === user.id && item.status === "active")
      .map((item) => ({
        membership: item,
        network: this.get(item.networkId),
        reviewPrepared:
          user.serviceSetup?.networkId === item.networkId &&
          !!user.serviceSetup.claimedAt &&
          !this.store.organizations.get(item.organizationId)?.networkProfile
            ?.publishedAt &&
          user.loginCount === 1,
        needsPartnerSetup:
          !["visitor", "network_admin"].includes(item.role) &&
          this.canEditCompany(user.id, item.organizationId, item.role) &&
          this.userModules(user.id, item.networkId).includes("profiles") &&
          !this.store.organizations.get(item.organizationId)?.networkProfile,
        organization: this.store.organizations.get(item.organizationId),
      }));
  }

  claimInitiatorInvitation(authorization: string | undefined) {
    const user = this.auth.authenticate(authorization);
    const existing = this.store.networkMemberships.find(
      (item) =>
        item.userId === user.id &&
        item.role === "network_admin" &&
        item.status === "active",
    );
    if (existing) {
      const network = this.raw(existing.networkId);
      return {
        claimed: false,
        alreadyAssigned: true,
        network: { id: network.id, slug: network.slug, name: network.name },
        membership: existing,
      };
    }
    const invitation = [...this.store.networkContents.values()]
      .filter(
        (item) =>
          item.data.kind === "network_invitation" &&
          item.data.role === "network_admin" &&
          item.data.email === user.email &&
          !item.data.usedAt &&
          item.endsAt &&
          Date.parse(item.endsAt) > Date.now(),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!invitation) return { claimed: false, alreadyAssigned: false };
    const network = this.raw(invitation.networkId);
    const accessible =
      network.status === "active" ||
      (network.status === "trial" &&
        network.trialEndsAt &&
        Date.parse(network.trialEndsAt) > Date.now());
    if (!accessible)
      throw new BadRequestException(
        "Die Initiator-Einladung ist nicht mehr verfügbar.",
      );
    let companyMembership = this.store.memberships.find(
      (item) => item.userId === user.id,
    );
    if (!companyMembership) {
      const organization = this.createInitiatorOrganization(user.id, network);
      companyMembership = {
        organizationId: organization.id,
        userId: user.id,
        role: "admin",
      };
    }
    const now = new Date().toISOString(),
      membership = this.record(
        network.id,
        companyMembership.organizationId,
        user.id,
        "network_admin",
        "active",
        invitation.createdByUserId,
      );
    membership.reviewedByUserId = invitation.createdByUserId;
    membership.reviewedAt = now;
    membership.updatedAt = now;
    this.store.networkMemberships.push(membership);
    invitation.data.usedAt = now;
    return {
      claimed: true,
      alreadyAssigned: false,
      network: { id: network.id, slug: network.slug, name: network.name },
      membership,
    };
  }

  applyAsPartner(
    authorization: string | undefined,
    input: Record<string, unknown>,
  ) {
    this.auth.authenticate(authorization);
    void input;
    throw new ForbiddenException(
      "Netzwerkmandanten können ausschließlich durch den Plattforminhaber angelegt werden.",
    );
  }

  apply(
    authorization: string | undefined,
    slug: string,
    input: Record<string, unknown>,
  ) {
    this.auth.authenticate(authorization);
    this.bySlug(slug);
    void input;
    throw new ForbiddenException(
      "Der Beitritt zu diesem geschlossenen Netzwerk ist ausschließlich über einen persönlichen Einladungslink möglich.",
    );
  }

  memberPage(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
    const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);
    const page=Math.max(1,Math.min(100000,Math.floor(Number(input.page)||1))),pageSize=Math.max(1,Math.min(24,Math.floor(Number(input.pageSize)||12)));
    const query=String(input.q||'').trim().toLowerCase().slice(0,200),status=String(input.status||'');
    // Additional approved pages share their owner's membership and billing.
    const entries = this.listMembers(authorization,networkId,undefined,true).flatMap(member => {
      const organization = this.store.organizations.get(this.store.networkMemberships.find(m=>m.id===member.id)!.organizationId);
      return [member, ...(organization?.additionalCompanyPages || []).filter(p=>p.networkId===networkId && p.reviewStatus==='approved' && p.profile?.status==='published').map(p=>({
        ...member, id: member.id + '~' + p.id,
        organization: {...member.organization!, displayName:p.profile!.companyName,legalName:p.companyName,websiteUrl:p.websiteUrl,networkProfile:{status:p.profile!.status,logoUrl:p.profile!.logoUrl,companyName:p.profile!.companyName,tagline:p.profile!.tagline,services:p.profile!.services,contactName:p.profile!.contactName,primaryColor:p.profile!.primaryColor,secondaryColor:p.profile!.secondaryColor}},
      }))];
    }).filter(member => (this.isNetworkManager(user.id,networkId) || member.organization?.networkProfile?.status==='published') && (!status || member.status===status) && `${member.organization?.displayName||''} ${member.user?.firstName||''} ${member.user?.lastName||''} ${member.organization?.networkProfile?.services||''} ${member.organization?.networkProfile?.tagline||''}`.toLowerCase().includes(query));
    const entryPage=Math.min(page,Math.max(1,Math.ceil(entries.length/pageSize)));
    return {items:entries.slice((entryPage-1)*pageSize,entryPage*pageSize),total:entries.length,page:entryPage,pageSize};
  }
  memberDetail(authorization:string|undefined,networkId:string,id:string){
    const [membershipId,pageId]=id.split('~');
    const member=this.listMembers(authorization,networkId,new Set([membershipId]))[0];
    if(!member)throw new NotFoundException('Diese Partnerseite ist nicht verfügbar.');
    if(pageId){
      const membership=this.store.networkMemberships.find(m=>m.id===membershipId && m.networkId===networkId)!;
      const page=this.store.organizations.get(membership.organizationId)?.additionalCompanyPages?.find(p=>p.id===pageId && p.networkId===networkId && p.reviewStatus==='approved' && p.profile?.status==='published');
      if(!page)throw new NotFoundException('Diese Unternehmensseite ist nicht verfügbar.');
      return {...member,organization:{...member.organization!,displayName:page.profile!.companyName,legalName:page.companyName,websiteUrl:page.websiteUrl,networkProfile:page.profile!}};
    }
    const actor=this.auth.authenticate(authorization);
    if(member.organization?.networkProfile?.status!=='published' && !this.isNetworkManager(actor.id,networkId))throw new NotFoundException('Diese Unternehmensseite ist noch nicht veröffentlicht.');
    return member;
  }
  memberHero(authorization:string|undefined,networkId:string,id:string){
    const member=this.memberDetail(authorization,networkId,id);
    const profile=member.organization?.networkProfile;
    return {heroImageUrl:profile && 'heroImageUrl' in profile ? profile.heroImageUrl||null : null};
  }
  listMembers(authorization: string | undefined, networkId: string, ids?:Set<string>, summary=false) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const showBilling = this.isNetworkInitiator(user.id, networkId),
      manager = this.isNetworkManager(user.id, networkId),
      ownOrganizationIds = new Set(
        this.store.memberships
          .filter((item) => item.userId === user.id)
          .map((item) => item.organizationId),
      );
    return this.store.networkMemberships
      .filter(
        (item) =>
          item.networkId === networkId &&
          (!ids||ids.has(item.id)) &&
          item.role !== "visitor" &&
          this.store.users.get(item.userId)?.accountRole !== "platform_admin" &&
          (manager || item.status === "active"),
      )
      .map((item) => {
        const organization = this.store.organizations.get(item.organizationId),
          profile = organization?.networkProfile,
          canSeeProfile = Boolean(
            profile &&
            (profile.status === "published" ||
              manager ||
              ownOrganizationIds.has(item.organizationId)),
          ),
          subscription = showBilling
            ? [...this.store.networkOrders.values()]
                .filter(
                  (order) =>
                    order.networkId === networkId &&
                    order.orderedByUserId === item.userId &&
                    order.status === "accepted",
                )
                .map((order) => this.normalizeOrder(order))
                .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
            : undefined;
        return {
          ...item,
          user: this.publicUser(item.userId),
          organization: organization
            ? {
                id: organization.id,
                displayName: organization.displayName,
                legalName: organization.legalName,
                websiteUrl: organization.websiteUrl,
                networkProfile: canSeeProfile ? (summary?{
                  status:profile!.status,logoUrl:profile!.logoUrl,companyName:profile!.companyName,
                  tagline:profile!.tagline,services:profile!.services,contactName:profile!.contactName,
                  primaryColor:profile!.primaryColor,secondaryColor:profile!.secondaryColor,
                }:profile) : null,
              }
            : null,
          ...(showBilling
            ? {
                billing: subscription
                  ? {
                      orderId: subscription.id,
                      status: this.paymentStatus(subscription),
                      dueAt: subscription.paymentDueAt,
                      paidAt: subscription.paidAt,
                      modules: subscription.selectedModules,
                      startsAt: subscription.serviceStartsAt,
                      endsAt: subscription.serviceEndsAt,
                      remainingDays: subscription.serviceEndsAt
                        ? Math.max(
                            0,
                            Math.ceil(
                              (Date.parse(subscription.serviceEndsAt) -
                                Date.now()) /
                                86_400_000,
                            ),
                          )
                        : 0,
                    }
                  : null,
              }
            : {}),
        };
      });
  }

  private readonly handingOver = new Set<string>();
  createServiceMember(
    auth: string | undefined,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(auth);
    this.requirePlatformAdmin(actor.id);
    const n = this.raw(id),
      email = emailAddress(input.email),
      firstName = requiredText(input.firstName, "Vorname", 1, 100),
      lastName = requiredText(input.lastName, "Nachname", 1, 100),
      company = requiredText(input.legalName, "Unternehmen", 2, 160),
      reference = requiredText(input.reference, "Auftragsnachweis", 3, 120);
    if (
      n.status !== "active" ||
      input.confirmed !== true ||
      this.store.userByEmail.has(email)
    )
      throw new BadRequestException(
        "Nur mit dokumentiertem Auftrag in einem aktiven Netzwerk und neuer E-Mail-Adresse möglich.",
      );
    const central =
      n.settings.memberPaymentModel === "network" ||
      n.settings.billingMode === "cooperation_free";
    if (input.central !== central)
      throw new ConflictException(
        "Zahlungsmodell geändert. Bitte Ansicht neu öffnen.",
      );
    const userId = randomUUID(),
      organizationId = randomUUID(),
      now = new Date().toISOString(),
      websiteUrl = safeUrl(input.websiteUrl);
    if (
      input.complimentaryAccess !== undefined &&
      typeof input.complimentaryAccess !== "boolean"
    )
      throw new BadRequestException("Ungültige Auswahl für die Abrechnung.");
    const complimentary = input.complimentaryAccess === true;
    const order =
      central || complimentary
        ? null
        : annualOrder(
            n,
            userId,
            {
              ...input,
              invoiceContact:
                input.invoiceContact || firstName + " " + lastName,
              invoiceEmail: input.invoiceEmail || email,
              invoiceCountry: input.invoiceCountry || "Deutschland",
            },
            { reference },
          );
    if (order) {
      order.organizationId = organizationId;
      order.decidedByUserId = actor.id;
      this.store.networkOrders.set(order.id, order);
    }
    this.store.organizations.set(organizationId, {
      id: organizationId,
      displayName: company,
      legalName: company,
      role: "network",
      reviewStatus: "draft",
      submittedAt: null,
      approvedAt: null,
      websiteUrl,
      emailDomain: null,
      createdAt: now,
    });
    this.store.users.set(userId, {
      id: userId,
      email,
      firstName,
      lastName,
      passwordHash: "unavailable",
      emailVerifiedAt: null,
      accountRole: "user",
      createdAt: now,
      serviceSetup: {
        networkId: id,
        organizationId,
        orderId: order?.id || null,
        ...(complimentary ? { complimentaryAccess: true as const } : {}),
        reference,
        createdBy: actor.id,
        createdAt: now,
        sentAt: null,
        claimedAt: null,
      },
    });
    this.store.userByEmail.set(email, userId);
    this.operatorAudit(actor.id, id, "service.setup.created");
    return { userId };
  }
  private serviceTarget(auth: string | undefined, id: string, uid: string) {
    const actor = this.auth.authenticate(auth);
    this.requirePlatformAdmin(actor.id);
    const user = this.store.users.get(uid),
      setup = user?.serviceSetup;
    if (!user || !setup || setup.networkId !== id)
      throw new NotFoundException("Serviceauftrag nicht gefunden.");
    return { user, setup, actor };
  }
  serviceProfile(
    auth: string | undefined,
    id: string,
    uid: string,
    input?: Record<string, unknown>,
  ) {
    const { setup } = this.serviceTarget(auth, id, uid);
    if (setup.sentAt || this.handingOver.has(uid))
      throw new ForbiddenException(
        "Die Seite wurde bereits zur Übergabe freigegeben.",
      );
    const org = this.store.organizations.get(setup.organizationId)!;
    return input
      ? this.writePartnerProfile(org, { ...input, publish: false })
      : {
          organization: {
            displayName: org.displayName,
            legalName: org.legalName,
            websiteUrl: org.websiteUrl,
          },
          profile: org.networkProfile || null,
          canEdit: true,
        };
  }
  serviceImport(
    auth: string | undefined,
    id: string,
    uid: string,
    input: Record<string, unknown>,
  ) {
    const { actor } = this.serviceTarget(auth, id, uid);
    this.serviceProfile(auth, id, uid);
    if (input.consent !== true)
      throw new BadRequestException("Bitte die Analyse bestätigen.");
    return this.companyImport.generate(actor.id, input.websiteUrl);
  }
  async handoverService(auth: string | undefined, id: string, uid: string) {
    const { user, setup, actor } = this.serviceTarget(auth, id, uid),
      n = this.raw(id);
    if (n.status !== "active" || setup.claimedAt || this.handingOver.has(uid))
      throw new ConflictException("Übergabe nicht möglich.");
    const profile = this.store.organizations.get(
      setup.organizationId,
    )?.networkProfile;
    if (
      !profile ||
      ![
        profile.companyName,
        profile.tagline,
        profile.description,
        profile.services,
        profile.contactName,
        profile.contactEmail,
        profile.contactPosition,
        profile.contactPhone,
        profile.street,
        profile.postalCode,
        profile.city,
        profile.country,
      ].every((x) => x?.trim())
    )
      throw new BadRequestException(
        "Bitte vor der Übergabe Unternehmensseite und Kontakt vollständig als Entwurf speichern.",
      );
    this.handingOver.add(uid);
    try {
      const raw = opaqueToken();
      await this.email.sendServiceHandover(user.email, n.slug, n.name, raw);
      setup.tokenHash = tokenHash(raw);
      setup.expiresAt = Date.now() + 48 * 3600000;
      setup.sentAt = new Date().toISOString();
      this.operatorAudit(actor.id, id, "service.handover.sent");
      await this.store.persist();
      return { sent: true };
    } finally {
      this.handingOver.delete(uid);
    }
  }
  async claimService(input: Record<string, unknown>) {
    const digest = tokenHash(requiredText(input.token, "Link", 30, 200)),
      user = [...this.store.users.values()].find(
        (u) => u.serviceSetup?.tokenHash === digest,
      );
    const s = user?.serviceSetup,
      n = s && this.raw(s.networkId);
    if (
      !user ||
      !s ||
      !n ||
      !s.sentAt ||
      n.slug !== input.network ||
      n.status !== "active" ||
      s.claimedAt ||
      !s.expiresAt ||
      s.expiresAt <= Date.now()
    )
      throw new BadRequestException(
        "Der Übergabelink ist ungültig oder abgelaufen.",
      );
    const password = requiredText(input.password, "Passwort", 12, 200);
    if (password !== input.confirmation)
      throw new BadRequestException("Passwörter stimmen nicht überein.");
    validatePasswordStrength(password);
    const hashed = await hashPassword(password);
    if (
      this.store.users.get(user.id) !== user ||
      s.tokenHash !== digest ||
      s.claimedAt ||
      this.handingOver.has(user.id) ||
      s.expiresAt <= Date.now()
    )
      throw new ConflictException("Übergabelink nicht mehr gültig.");
    const now = new Date().toISOString(),
      mid = randomUUID();
    this.store.memberships.push({
      userId: user.id,
      organizationId: s.organizationId,
      role: "admin",
    });
    this.store.networkMemberships.push({
      id: mid,
      networkId: n.id,
      organizationId: s.organizationId,
      userId: user.id,
      role: "organization_admin",
      status: "active",
      centrallyFunded: !s.orderId && !s.complimentaryAccess,
      ...(s.complimentaryAccess ? { complimentaryAccess: true } : {}),
      invitedByUserId: s.createdBy,
      reviewedByUserId: s.createdBy,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    if (s.orderId) {
      const o = this.store.networkOrders.get(s.orderId);
      if (o) o.membershipId = mid;
    }
    user.passwordHash = hashed;
    user.emailVerifiedAt = now;
    s.claimedAt = now;
    delete s.tokenHash;
    delete s.expiresAt;
    await this.store.persist();
    return { claimed: true };
  }
  async waiveService(
    auth: string | undefined,
    id: string,
    uid: string,
    reserve: (id: string) => Promise<void>,
  ) {
    const { setup, actor } = this.serviceTarget(auth, id, uid);
    if (setup.complimentaryAccess) return { complimentary: true };
    const o = this.store.networkOrders.get(setup.orderId || "");
    if (
      !o?.manualServiceInvoice ||
      o.orderedByUserId !== uid ||
      o.networkId !== id ||
      o.status !== "accepted" ||
      o.invoiceSentAt ||
      o.invoiceReference ||
      o.paidAt ||
      o.paymentStatus === "paid"
    )
      throw new ConflictException(
        "Nur ein offener Serviceauftrag ohne Rechnung kann beitragsfrei gestellt werden.",
      );
    await reserve(o.id);
    o.status = "cancelled";
    setup.orderId = null;
    setup.complimentaryAccess = true;
    const m = this.store.networkMemberships.find(
      (m) => m.networkId === id && m.userId === uid,
    );
    if (m) {
      m.complimentaryAccess = true;
      m.centrallyFunded = false;
    }
    this.operatorAudit(actor.id, id, "service.billing.waived", {
      userId: uid,
      orderId: o.id,
    });
    await this.store.persist();
    return { complimentary: true };
  }
  serviceInvoice(auth: string | undefined, id: string, uid: string) {
    const { setup } = this.serviceTarget(auth, id, uid),
      o = this.store.networkOrders.get(setup.orderId || "");
    if (
      !setup.sentAt ||
      !o?.manualServiceInvoice ||
      o.networkId !== id ||
      o.orderedByUserId !== uid
    )
      throw new BadRequestException(
        "Rechnung nur nach Übergabemail und bei individueller Abrechnung möglich.",
      );
    return o;
  }
  ownProfile(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.userId === user.id &&
        item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("Kein aktiver Netzwerkzugang.");
    if (user.accountRole === "platform_admin")
      throw new ForbiddenException(
        "Initiatoren verwalten das Netzwerk und führen keine eigene Partnerseite.",
      );
    const organization = this.store.organizations.get(
      membership.organizationId,
    );
    if (!organization)
      throw new NotFoundException("Unternehmen nicht gefunden.");
    return {
      organization: {
        id: organization.id,
        legalName: organization.legalName,
        displayName: organization.displayName,
        websiteUrl: organization.websiteUrl,
      },
      profile: organization.networkProfile || null,
      canEdit: this.canEditCompany(user.id, organization.id, membership.role),
    };
  }

  private companyPageOwner(authorization: string | undefined, networkId: string) {
    const own = this.ownProfile(authorization, networkId);
    if (!own.canEdit) throw new ForbiddenException('Nur der Unternehmensinhaber darf weitere Seiten verwalten.');
    this.requireEnabledModule(networkId, 'profiles', this.auth.authenticate(authorization).id);
    return {organization:this.store.organizations.get(own.organization.id)!, user:this.auth.authenticate(authorization)};
  }
  private checkCompanyHomepage(networkId:string, website:unknown, skipOrganization:string, skipPage?:string) {
    companyDomain(website);
    for(const membership of this.store.networkMemberships.filter(m=>m.networkId===networkId && !['left','rejected'].includes(m.status))){
      const org=this.store.organizations.get(membership.organizationId); if(!org)continue;
      const main=org.networkProfile?.websiteUrl || org.websiteUrl;
      if(org.id!==skipOrganization && main && sameCompanyDomain(String(website),main))throw new ConflictException('Diese Unternehmenshomepage ist in diesem Netzwerk bereits eingebunden.');
      for(const page of org.additionalCompanyPages || []){
        if(page.networkId!==networkId || page.id===skipPage)continue;
        if(sameCompanyDomain(String(website),page.websiteUrl))throw new ConflictException('Diese Unternehmenshomepage ist in diesem Netzwerk bereits eingebunden.');
      }
    }
  }
  companyPages(authorization:string|undefined,networkId:string){
    const {organization,user}=this.companyPageOwner(authorization,networkId);
    return {pages:(organization.additionalCompanyPages||[]).filter(p=>p.networkId===networkId&&p.ownerUserId===user.id).map(page=>({...page,profile:page.profile?{companyName:page.profile.companyName,tagline:page.profile.tagline,status:page.profile.status,logoUrl:page.profile.logoUrl,heroImageUrl:page.profile.heroImageUrl,primaryColor:page.profile.primaryColor,secondaryColor:page.profile.secondaryColor}:null})),limit:5};
  }
  createCompanyPage(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
    const {organization,user}=this.companyPageOwner(authorization,networkId);
    this.requireWritableNetwork(user.id,networkId);
    const pages=(organization.additionalCompanyPages||[]).filter(p=>p.networkId===networkId);
    if(pages.length>=4)throw new BadRequestException('Pro Mitglied sind maximal fünf Unternehmensseiten möglich.');
    if(input.ownershipConfirmed!==true)throw new BadRequestException('Bitte bestätigen, dass dies ein eigenes Unternehmen oder eine eigene Marke ist.');
    const name=requiredText(input.companyName,'Unternehmensname',2,160), website=safeUrl(input.websiteUrl);
    if(!website)throw new BadRequestException('Bitte die Unternehmenshomepage angeben.');
    this.checkCompanyHomepage(networkId,website,'');
    const names=[organization.displayName,organization.networkProfile?.companyName,...pages.map(p=>p.companyName)].filter(Boolean).map(n=>n!.toLowerCase().replace(/[^\p{L}\p{N}]/gu,''));
    if(names.includes(name.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')))throw new ConflictException('Für dieses Unternehmen existiert bereits eine Seite.');
    const now=new Date().toISOString();
    const page: NonNullable<OrganizationRecord['additionalCompanyPages']>[number]={id:randomUUID(),networkId,ownerUserId:user.id,companyName:name,websiteUrl:website,ownershipConfirmedAt:now,reviewStatus:'draft',profile:null,createdAt:now};
    (organization.additionalCompanyPages ||= []).push(page);
    return page;
  }
  ownCompanyPage(authorization:string|undefined,networkId:string,pageId:string){
    const {organization,user}=this.companyPageOwner(authorization,networkId);
    const page=organization.additionalCompanyPages?.find(p=>p.networkId===networkId && p.id===pageId && p.ownerUserId===user.id);
    if(!page)throw new NotFoundException('Unternehmensseite nicht gefunden.');
    return {organization:{id:page.id,displayName:page.companyName,legalName:page.companyName,websiteUrl:page.websiteUrl},profile:page.profile,canEdit:true,reviewStatus:page.reviewStatus};
  }
  saveCompanyPage(authorization:string|undefined,networkId:string,pageId:string,input:Record<string,unknown>){
    this.ownCompanyPage(authorization,networkId,pageId);
    const {organization,user}=this.companyPageOwner(authorization,networkId);
    this.requireWritableNetwork(user.id,networkId);
    const page=organization.additionalCompanyPages!.find(p=>p.networkId===networkId && p.id===pageId)!;
    const website=safeUrl(input.websiteUrl || page.websiteUrl)!;
    this.checkCompanyHomepage(networkId,website,'',pageId);
    const normalize=(name:unknown)=>String(name||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
    const name=normalize(input.companyName||page.companyName);
    if([organization.displayName,...(organization.additionalCompanyPages||[]).filter(p=>p.networkId===networkId&&p.id!==pageId).map(p=>p.companyName)].some(n=>normalize(n)===name))throw new ConflictException('Für dieses Unternehmen existiert bereits eine Seite.');
    const temp={...organization,displayName:page.companyName,websiteUrl:website,networkProfile:page.profile||undefined};
    // Validate every publication field, but never let members bypass owner approval.
    const profile=this.writePartnerProfile(temp,{...input,websiteUrl:website});
    profile.status='draft';profile.publishedAt=null;
    page.profile=profile;page.companyName=profile.companyName;page.websiteUrl=website;
    page.reviewStatus=input.publish===true?'pending':'draft';delete page.reviewedAt;delete page.reviewedBy;
    if(page.reviewStatus==='pending')for(const operator of this.store.users.values()){
      if(operator.accountRole!=='platform_admin'||this.store.notifications.some(n=>n.userId===operator.id&&n.type==='network.company-page.review'&&n.data.pageId===page.id&&!n.readAt))continue;
      this.store.notifications.push({id:randomUUID(),userId:operator.id,type:'network.company-page.review',data:{networkId,pageId:page.id,userId:page.ownerUserId,title:'Unternehmensseite zur Freigabe: '+page.companyName},readAt:null,createdAt:new Date().toISOString()});
    }
    return profile;
  }
  reviewCompanyPages(authorization:string|undefined,networkId:string,userId:string){
    this.requirePlatformAdmin(this.auth.authenticate(authorization).id);
    const membership=this.store.networkMemberships.find(m=>m.networkId===networkId && m.userId===userId);
    if(!membership)throw new NotFoundException('Mitglied nicht gefunden.');
    return {pages:(this.store.organizations.get(membership.organizationId)?.additionalCompanyPages||[]).filter(p=>p.networkId===networkId && p.ownerUserId===userId)};
  }
  decideCompanyPage(authorization:string|undefined,networkId:string,userId:string,pageId:string,input:Record<string,unknown>){
    const {pages}=this.reviewCompanyPages(authorization,networkId,userId),page=pages.find(p=>p.id===pageId);
    if(!page||!page.profile)throw new NotFoundException('Unternehmensseite nicht gefunden.');
    if(!['approved','rejected'].includes(String(input.decision)))throw new BadRequestException('Ungültige Entscheidung.');
    if(input.decision==='approved'){
      if(page.reviewStatus!=='pending')throw new BadRequestException('Diese Seite wurde noch nicht zur Freigabe eingereicht.');
      this.checkCompanyHomepage(networkId,page.websiteUrl,'',page.id);
      const temp={displayName:page.companyName,networkProfile:page.profile} as OrganizationRecord;
      page.profile=this.writePartnerProfile(temp,{...page.profile,publish:true});
    }else{page.profile.status='draft';page.profile.publishedAt=null;}
    page.reviewStatus=input.decision as 'approved'|'rejected';page.reviewedAt=new Date().toISOString();page.reviewedBy=this.auth.authenticate(authorization).id;
    return page;
  }

  updateOwnProfile(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    this.requireEnabledModule(networkId, "profiles", user.id);
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.userId === user.id &&
        item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("Kein aktiver Netzwerkzugang.");
    if (user.accountRole === "platform_admin")
      throw new ForbiddenException(
        "Initiatoren verwalten das Netzwerk und führen keine eigene Partnerseite.",
      );
    if (
      !this.canEditCompany(user.id, membership.organizationId, membership.role)
    )
      throw new ForbiddenException(
        "Nur der Unternehmensadministrator darf die Partnerseite bearbeiten.",
      );
    const organization = this.store.organizations.get(
      membership.organizationId,
    );
    if (!organization)
      throw new NotFoundException("Unternehmen nicht gefunden.");
    if(input.websiteUrl)this.checkCompanyHomepage(networkId,input.websiteUrl,organization.id);
    const wasPublished = organization.networkProfile?.status === "published";
    const profile = this.writePartnerProfile(organization, input);
    const key = "welcome:" + networkId + ":" + organization.id;
    if (
      !wasPublished &&
      profile.status === "published" &&
      !this.store.networkContents.has(key)
    ) {
      const now = new Date().toISOString();
      const post: NetworkContentRecord = {
        id: key,
        networkId,
        type: "announcement",
        status: "published",
        visibility: "members",
        title: "Neu im Netzwerk: " + profile.companyName,
        description: `${user.firstName} ${user.lastName} ist mit ${profile.companyName} neu im Netzwerk. Lerne das Unternehmen auf seiner Partnerseite kennen.`,
        createdByUserId: user.id,
        assignedToUserId: null,
        startsAt: null,
        endsAt: null,
        data: {
          category: "Neuigkeit des Initiators",
          welcomeMembershipId: membership.id,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.store.networkContents.set(key, post);
      this.notifyContent(post, user.id, "network.member.welcome");
      for (const notification of this.store.notifications.filter(
        (n) => n.data.contentId === key,
      )) {
        notification.data.welcomeMembershipId = membership.id;
        if (this.store.users.get(notification.userId)?.welcomeMailOptInAt)
          notification.data.welcomeMail = "pending";
      }
    }
    this.syncProfileOffer(networkId, membership.id, organization.id, user.id, profile);
    return profile;
  }
  private syncProfileOffer(networkId: string, membershipId: string, organizationId: string, userId: string, profile: NetworkPartnerProfile) {
    const key = "profile-offer:" + networkId + ":" + organizationId;
    const description = [profile.offers || "", ...(profile.sections || []).filter(s => s.area === "offers").map(s => s.title + "\n" + s.body)].filter(Boolean).join("\n\n");
    const existing = this.store.networkContents.get(key);
    if (profile.status !== "published" || !description.trim()) {
      if (existing) { existing.status = "archived"; existing.updatedAt = new Date().toISOString(); }
      return;
    }
    const title = "Angebot von " + profile.companyName;
    if (existing?.status === "published" && existing.title === title && existing.description === description) return;
    const now = new Date().toISOString();
    const post: NetworkContentRecord = { id: key, networkId, type: "announcement", status: "published", visibility: "members", title, description, createdByUserId: userId, assignedToUserId: null, startsAt: null, endsAt: null,
      data: { category: "Angebot eines Mitglieds", partnerMembershipId: membershipId, profileArea: "offers" }, createdAt: existing?.createdAt || now, updatedAt: now };
    this.store.networkContents.set(key, post);
    this.notifyContent(post, userId, "network.member.offer");
    for (const notification of this.store.notifications.filter(n => n.data.contentId === key)) {
      notification.data.partnerMembershipId = membershipId;
      notification.data.profileArea = "offers";
    }
  }
  private writePartnerProfile(
    organization: OrganizationRecord,
    input: Record<string, unknown>,
  ) {
    const publish = input.publish === true,
      logoUrl =
        typeof input.logoUrl === "string" && input.logoUrl.trim()
          ? input.logoUrl.trim()
          : null;
    if (logoUrl && !(logoUrl.startsWith("data:image/") || safeUrl(logoUrl)))
      throw new BadRequestException(
        "Das Logo muss eine Bilddatei oder eine gültige URL sein.",
      );
    if (logoUrl?.startsWith("data:image/") && logoUrl.length > 2_000_000)
      throw new BadRequestException(
        "Die Logodatei ist zu groß. Maximal 1,5 MB.",
      );
    const previous = organization.networkProfile;
    const brandColor = (value: unknown, previousValue: string | undefined) => {
      if (value === undefined) return previousValue;
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
        throw new BadRequestException(
          "Unternehmensfarben müssen gültige sechsstellige Hex-Farben sein.",
        );
      return value.toLowerCase();
    };
    const now = new Date().toISOString();
    const field = (value: unknown, label: string, min: number, max: number) =>
      publish
        ? requiredText(value, label, min, max)
        : typeof value === "string"
          ? value.trim().slice(0, max)
          : "";
    const documents = input.documents === undefined ? previous?.documents || [] : (() => {
      if (!Array.isArray(input.documents) || input.documents.length > 5)
        throw new BadRequestException("Bitte höchstens fünf PDF-Dokumente hinterlegen.");
      return input.documents.map((file) => {
        if (!file || typeof file !== "object" || (file as Record<string, unknown>).mimeType !== "application/pdf")
          throw new BadRequestException("Unternehmensunterlagen müssen PDF-Dateien sein.");
        const checked = this.checkedAttachment(file);
        const existing = previous?.documents?.find(d => d.dataUrl === checked.dataUrl && d.name === checked.name);
        return { ...checked, id: existing?.id || checked.id };
      });
    })();
    const profile: NetworkPartnerProfile = {
      documents,
      heroImageUrl:
        input.heroImageUrl === undefined
          ? previous?.heroImageUrl || null
          : partnerHero(input.heroImageUrl),
      sections:
        input.sections === undefined
          ? previous?.sections || []
          : partnerSections(input.sections),
      personalMessage:
        input.personalMessage === undefined
          ? previous?.personalMessage
          : requiredText(
              input.personalMessage,
              "Persönliche Mitteilung",
              0,
              3000,
            ),
      offers:
        input.offers === undefined
          ? previous?.offers
          : requiredText(input.offers, "Angebote", 0, 2000),
      lookingFor:
        input.lookingFor === undefined
          ? previous?.lookingFor
          : requiredText(input.lookingFor, "Gesuche", 0, 2000),
      meetingUrl:
        input.meetingUrl === undefined
          ? previous?.meetingUrl
          : safeUrl(input.meetingUrl),
      primaryColor: brandColor(input.primaryColor, previous?.primaryColor),
      secondaryColor: brandColor(
        input.secondaryColor,
        previous?.secondaryColor,
      ),
      status: publish ? "published" : "draft",
      logoUrl,
      companyName: requiredText(
        input.companyName || organization.displayName,
        "Unternehmensname",
        2,
        160,
      ),
      tagline: field(input.tagline, "Kurzversprechen", 5, 180),
      description: field(
        input.description,
        "Unternehmensbeschreibung",
        30,
        3000,
      ),
      services: field(input.services, "Leistungen", 10, 2000),
      industries:
        typeof input.industries === "string"
          ? input.industries.trim().slice(0, 800)
          : "",
      street: field(input.street, "Straße und Hausnummer", 3, 200),
      postalCode: field(input.postalCode, "Postleitzahl", 4, 12),
      city: field(input.city, "Ort", 2, 120),
      country: field(input.country || "Deutschland", "Land", 2, 80),
      websiteUrl: safeUrl(input.websiteUrl),
      contactName: field(input.contactName, "Ansprechpartner", 3, 160),
      contactPosition: field(input.contactPosition, "Position", 2, 160),
      contactEmail:
        !publish && !input.contactEmail ? "" : emailAddress(input.contactEmail),
      contactPhone: field(input.contactPhone, "Telefon", 5, 60),
      updatedAt: now,
      publishedAt: publish ? previous?.publishedAt || now : null,
    };
    organization.networkProfile = profile;
    organization.displayName = profile.companyName;
    organization.websiteUrl = profile.websiteUrl;
    return profile;
  }

  review(
    authorization: string | undefined,
    networkId: string,
    membershipId: string,
    input: Record<string, unknown>,
  ) {
    const reviewer = this.auth.authenticate(authorization);
    this.requireNetworkManagement(reviewer.id, networkId);
    const membership = this.store.networkMemberships.find(
      (item) => item.id === membershipId && item.networkId === networkId,
    );
    if (!membership)
      throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");
    if (membership.status !== "pending")
      throw new BadRequestException(
        "Nur offene Mitgliedschaftsanträge können entschieden werden.",
      );
    const decision = input.decision;
    if (decision !== "active" && decision !== "rejected")
      throw new BadRequestException("Ungültige Entscheidung.");
    membership.status = decision;
    membership.reviewedByUserId = reviewer.id;
    membership.reviewedAt = new Date().toISOString();
    membership.updatedAt = membership.reviewedAt;
    return membership;
  }

  addMember(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkManagement(actor.id, networkId);
    if (
      actor.accountRole !== "platform_admin" &&
      this.raw(networkId).settings.memberMonthlyNetCents !== undefined
    )
      throw new ForbiddenException(
        "Neue Partnermitglieder müssen ihre persönliche Jahresmitgliedschaft über die Einladung bestätigen.",
      );
    const organizationId = requiredText(
      input.organizationId,
      "Unternehmen",
      20,
      100,
    );
    const userId = requiredText(input.userId, "Benutzer", 20, 100);
    const role = input.role as NetworkRole;
    if (
      !["network_admin", "moderator", "organization_admin", "member"].includes(
        role,
      )
    )
      throw new BadRequestException("Ungültige Netzwerkrolle.");
    if (role === "network_admin" && actor.accountRole !== "platform_admin")
      throw new ForbiddenException(
        "Nur die Plattformadministration darf Netzwerkadministratoren ernennen.",
      );
    if (
      !this.store.organizations.has(organizationId) ||
      !this.store.users.has(userId)
    )
      throw new NotFoundException("Benutzer oder Unternehmen nicht gefunden.");
    const existing = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.organizationId === organizationId &&
        item.userId === userId &&
        item.status === "active",
    );
    if (this.store.networkMemberships.some(m =>
      m.organizationId === organizationId && m.networkId !== networkId))
      throw new ConflictException(
        "Unternehmensdaten dürfen nicht zwischen Netzwerken geteilt werden. Bitte die Partnerseite als unabhängige Kopie übernehmen.",
      );
    if (existing) {
      if (actor.accountRole === "platform_admin" && existing.role !== role) {
        existing.role = role;
        existing.reviewedByUserId = actor.id;
        existing.reviewedAt = new Date().toISOString();
        existing.updatedAt = existing.reviewedAt;
        return existing;
      }
      throw new ConflictException(
        "Die Person ist bereits aktives Netzwerkmitglied.",
      );
    }
    const membership = this.record(
      networkId,
      organizationId,
      userId,
      role,
      "active",
      actor.id,
    );
    membership.reviewedByUserId = actor.id;
    membership.reviewedAt = membership.createdAt;
    this.store.networkMemberships.push(membership);
    return membership;
  }

  async inviteMember(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkManagement(actor.id, networkId);
    const network = this.raw(networkId);
    const email = requiredText(
        input.email,
        "Geschäftliche E-Mail-Adresse",
        5,
        250,
      ).toLowerCase(),
      userId = this.store.userByEmail.get(email);
    if (
      !userId ||
      !this.store.networkMemberships.some(
        (m) =>
          m.userId === userId &&
          m.networkId === networkId &&
          m.status === "active",
      )
    ) {
      const inviteToken = opaqueToken(),
        now = new Date().toISOString(),
        requested = String(input.role || "member"),
        role = ["moderator", "organization_admin", "member"].includes(requested)
          ? requested
          : "member";
      const invitation: NetworkContentRecord = {
        id: randomUUID(),
        networkId,
        type: "announcement",
        title: `Einladung ${email}`,
        description: "Persönliche Netzwerkeinladung",
        status: "active",
        createdByUserId: actor.id,
        assignedToUserId: null,
        startsAt: null,
        endsAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        visibility: "administrators",
        data: {
          kind: "network_invitation",
          email,
          role,
          inviteTokenHash: tokenHash(inviteToken),
          usedAt: null,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.store.networkContents.set(invitation.id, invitation);
      await this.email.sendNetworkInvitation({
        email,
        networkName: network.name,
        networkSlug: network.slug,
        inviteToken,
      });
      enqueueOperatorMail(
        this.store,
        `invitation:${invitation.id}`,
        "Neue Netzwerkeinladung versendet",
        `Netzwerk: ${network.name}\nEingeladene E-Mail-Adresse: ${email}\nRolle: ${role}\nDie Einladung wurde versendet. Eine Jahresbuchung entsteht erst bei ausdrücklicher Bestätigung durch den Partner.`,
      );
      return { invited: true, email, registrationRequired: true };
    }
    const company = this.store.memberships.find(
      (item) => item.userId === userId,
    );
    if (!company)
      throw new BadRequestException(
        "Das Konto ist noch keinem Unternehmen zugeordnet.",
      );
    const requested = String(input.role || "member");
    const role: NetworkRole = [
      "moderator",
      "organization_admin",
      "member",
    ].includes(requested)
      ? (requested as NetworkRole)
      : "member";
    const existing = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.organizationId === company.organizationId &&
        item.userId === userId &&
        item.status === "active",
    );
    await this.email.sendNetworkAccessGranted({
      email,
      networkName: network.name,
      networkSlug: network.slug,
    });
    if (existing)
      return {
        invited: true,
        email,
        registrationRequired: false,
        alreadyActive: true,
        membership: existing,
      };
    const membership = this.addMember(authorization, networkId, {
      organizationId: company.organizationId,
      userId,
      role,
    });
    return {
      invited: true,
      email,
      registrationRequired: false,
      alreadyActive: false,
      membership,
    };
  }

  membershipStatus(
    authorization: string | undefined,
    networkId: string,
    membershipId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkManagement(actor.id, networkId);
    const membership = this.store.networkMemberships.find(
      (item) => item.id === membershipId && item.networkId === networkId,
    );
    if (!membership)
      throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");
    const status = String(input.status);
    if (!["active", "rejected", "suspended", "left"].includes(status))
      throw new BadRequestException("Ungültiger Mitgliederstatus.");
    membership.status = status as NetworkMembershipRecord["status"];
    membership.reviewedByUserId = actor.id;
    membership.reviewedAt = new Date().toISOString();
    membership.updatedAt = membership.reviewedAt;
    return membership;
  }

  private boardPresentation(item: NetworkContentRecord): NetworkContentRecord {
    if (item.type !== "topic" && item.type !== "announcement") return item;
    const network = this.raw(item.networkId);
    const membership =
      typeof (item.data.welcomeMembershipId || item.data.partnerMembershipId) === "string"
        ? this.store.networkMemberships.find(
            (m) =>
              m.id === (item.data.welcomeMembershipId || item.data.partnerMembershipId) &&
              m.networkId === item.networkId &&
              m.status === "active",
          )
        : undefined;
    const profile =
      membership &&
      this.store.organizations.get(membership.organizationId)?.networkProfile;
    const logo = profile?.status === "published" && profile.logoUrl;
    const image =
      logo ||
      item.data.imageUrl ||
      item.data.coverImageUrl ||
      network.settings.bannerImageUrl ||
      (network.slug === "unternehmernetzwerkleverkusen"
        ? "/images/leverkusen-skyline.webp"
        : network.slug === "bayer-giants"
          ? "/images/network-meeting-sport.webp"
          : "/images/network-meeting-club.webp");
    return {
      ...item,
      data: {
        ...item.data,
        boardImageUrl: image,
        boardImageIsLogo: Boolean(logo || (item.data.kind === 'network_cooperation' && item.data.cooperationLogo)),
      },
    };
  }

  listContent(
    authorization: string | undefined,
    networkId: string,
    type?: string,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const board = type === "noticeboard";
    this.ensureModule(this.raw(networkId), board ? "topic" : type, user.id);
    return [...this.store.networkContents.values()]
      .filter(
        (item) =>
          item.networkId === networkId &&
          (board
            ? item.type === "topic" ||
              (item.type === "announcement" &&
                item.visibility === "members" &&
                ["published", "active", "completed"].includes(item.status))
            : !type || item.type === type) &&
          visibleCooperation(this.store, item) &&
          this.canReadContent(user.id, item) &&
          this.contentModuleAvailable(user.id, item),
      )
      .map((item) =>
        item.type === "event"
          ? {
              ...item,
              attendanceSummary: this.eventAttendanceSummary(
                networkId,
                item.id,
              ),
            }
          : board
            ? this.boardPresentation(item)
            : item,
      )
      .sort((a, b) =>
        board
          ? b.createdAt.localeCompare(a.createdAt)
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }

  createContent(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    const network = this.raw(networkId);
    const allowed: NetworkContentType[] = [
      "event",
      "topic",
      "announcement",
      "poll",
      "task",
      "document",
      "conversation",
      "need",
      "service",
    ];
    const type = String(input.type) as NetworkContentType;
    if (!allowed.includes(type))
      throw new BadRequestException("Ungültiger Netzwerkinhalt.");
    this.ensureModule(network, type, user.id);
    this.requireContentCreation(user.id, networkId, type);
    const data = {
      ...(typeof input.data === "object" && input.data !== null
        ? (input.data as Record<string, unknown>)
        : {}),
    };
    if (
      (type === "topic" || type === "announcement") &&
      !decodePublicImage(data.imageUrl)
    )
      throw new BadRequestException(
        "Bitte ein Beitragsfoto als PNG, JPG oder WebP bis 1,5 MB hochladen.",
      );
    this.validateContentData(type, data, true);
    for (const key of [
      "messages",
      "networkPulse",
      "pulseNotes",
      "cooperationThreadId",
      "cooperationPartners",
      "meetings",
      "votes",
      "participantUserIds",
      "readBy",
      "kind",
      "inviteTokenHash",
      "usedAt",
      "role",
      "email",
    ])
      delete data[key];
    if (type === "conversation") {
      delete data.pulseVisible;
      data.participantUserIds = this.validateParticipants(
        networkId,
        user.id,
        input.participantUserIds,
      );
      data.messages = [];
      if (data.directChat === true) {
        const ids = data.participantUserIds as string[];
        if (ids.length !== 2)
          throw new BadRequestException(
            "Ein PartnerChat verbindet genau zwei Personen.",
          );
        const existing = [...this.store.networkContents.values()]
          .filter(
            (item) =>
              item.networkId === networkId &&
              item.type === "conversation" &&
              !["archived", "draft"].includes(item.status) &&
              this.threadParticipants(item).length === 2 &&
              ids.every((id) => this.threadParticipants(item).includes(id)),
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        if (existing) return existing;
      }
    }
    if (
      type === "topic" &&
      data.category === "Neuigkeit des Initiators" &&
      !this.isNetworkInitiator(user.id, networkId)
    )
      throw new ForbiddenException(
        "Mitteilungen des Initiators darf nur die Netzwerkleitung veröffentlichen.",
      );
    if (input.assignedToUserId)
      this.activeNetworkUser(networkId, String(input.assignedToUserId));
    const now = new Date().toISOString();
    const record: NetworkContentRecord = {
      id: randomUUID(),
      networkId,
      type,
      title: requiredText(input.title, "Titel", 2, 200),
      description: requiredText(input.description, "Beschreibung", 2, 5000),
      status: [
        "draft",
        "published",
        "active",
        "completed",
        "archived",
      ].includes(String(input.status))
        ? (input.status as NetworkContentRecord["status"])
        : "published",
      createdByUserId: user.id,
      assignedToUserId:
        typeof input.assignedToUserId === "string" && input.assignedToUserId
          ? input.assignedToUserId
          : null,
      startsAt: this.optionalDate(input.startsAt),
      endsAt: this.optionalDate(input.endsAt),
      visibility:
        input.visibility === "administrators" ? "administrators" : "members",
      data,
      createdAt: now,
      updatedAt: now,
    };
    if (type === "event" && !this.isNetworkManager(user.id, networkId))
      record.status = "draft";
    this.applyEventHomepagePublication(user.id, network, record, input);
    this.store.networkContents.set(record.id, record);
    this.notifyContent(
      record,
      user.id,
      record.status === "draft"
        ? "network.review.requested"
        : "network.content.created",
    );
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: user.id,
      type: `network.${type}.created`,
      visibility: "platform_internal",
      data: { networkId, contentId: record.id, title: record.title },
      createdAt: now,
    });
    return record;
  }

  updateContent(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    const stored = this.store.networkContents.get(contentId);
    if (!stored || stored.networkId !== networkId)
      throw new NotFoundException("Netzwerkinhalt nicht gefunden.");
    if (stored.data.kind === 'network_cooperation') throw new BadRequestException('Kooperationen bitte im zugehörigen Mitglieder-Chat gemeinsam bearbeiten und freigeben.');
    const record = { ...stored, data: { ...stored.data } };
    this.ensureModule(this.raw(networkId), record.type, user.id);
    this.requireContentUpdate(user.id, networkId, record);
    if (input.visibility === "members" || input.visibility === "administrators")
      record.visibility = input.visibility;
    if (
      record.type === "event" &&
      !this.isNetworkManager(user.id, networkId) &&
      (record.status !== "draft" || (input.status && input.status !== "draft"))
    )
      throw new ForbiddenException(
        "Veranstaltungen veröffentlicht und schließt die Netzwerkleitung.",
      );
    if (input.assignedToUserId) {
      this.activeNetworkUser(networkId, String(input.assignedToUserId));
      record.assignedToUserId = String(input.assignedToUserId);
    }
    if (input.startsAt !== undefined)
      record.startsAt = this.optionalDate(input.startsAt);
    if (input.endsAt !== undefined)
      record.endsAt = this.optionalDate(input.endsAt);
    if (typeof input.title === "string")
      record.title = requiredText(input.title, "Titel", 2, 200);
    if (typeof input.description === "string")
      record.description = requiredText(
        input.description,
        "Beschreibung",
        2,
        5000,
      );
    if (
      ["draft", "published", "active", "completed", "archived"].includes(
        String(input.status),
      )
    )
      record.status = input.status as NetworkContentRecord["status"];
    if (typeof input.data === "object" && input.data !== null) {
      const data = { ...(input.data as Record<string, unknown>) };
      for (const key of [
        "messages",
        "networkPulse",
        "pulseNotes",
        "cooperationThreadId",
        "cooperationPartners",
        "meetings",
        "votes",
        "participantUserIds",
        "readBy",
        "kind",
        "inviteTokenHash",
        "usedAt",
        "role",
        "email",
      ])
        delete data[key];
      this.validateContentData(record.type, { ...record.data, ...data }, false);
      if (
        data.category === "Neuigkeit des Initiators" &&
        !this.isNetworkInitiator(user.id, networkId)
      )
        throw new ForbiddenException(
          "Nur die Netzwerkleitung darf Initiator-Mitteilungen veröffentlichen.",
        );
      if (record.type === "event" && data.recapImages !== undefined) {
        if (!Array.isArray(data.recapImages) || data.recapImages.length > 6)
          throw new BadRequestException(
            "Ein Rückblick darf höchstens sechs Bilder enthalten.",
          );
        for (const image of data.recapImages) {
          if (
            typeof image !== "string" ||
            !image.startsWith("data:image/") ||
            image.length > 2_000_000
          )
            throw new BadRequestException(
              "Rückblickbilder müssen Bilddateien mit maximal 1,5 MB sein.",
            );
        }
      }
      record.data = { ...record.data, ...data };
    }
    if (
      (record.type === "topic" || record.type === "announcement") &&
      !stored.data.welcomeMembershipId &&
      !decodePublicImage(record.data.imageUrl) &&
      record.status !== "archived"
    )
      throw new BadRequestException(
        "Bitte ein Beitragsfoto als PNG, JPG oder WebP bis 1,5 MB hochladen.",
      );
    record.updatedAt = new Date().toISOString();
    this.applyEventHomepagePublication(
      user.id,
      this.raw(networkId),
      record,
      input,
    );
    this.store.networkContents.set(record.id, record);
    this.notifyContent(record, user.id, "network.content.updated");
    return record;
  }

  private applyEventHomepagePublication(
    userId: string,
    network: NetworkRecord,
    record: NetworkContentRecord,
    input: Record<string, unknown>,
  ) {
    if (!Object.hasOwn(input, "homepagePublish")) return;
    if (
      typeof input.homepagePublish !== "boolean" ||
      network.slug !== "unternehmerfreunde" ||
      record.type !== "event"
    )
      throw new BadRequestException(
        "Öffentliche Veranstaltungsfreigabe ist hier nicht verfügbar.",
      );
    if (!this.isNetworkInitiator(userId, network.id))
      throw new ForbiddenException(
        "Nur die Netzwerkleitung darf Veranstaltungen auf der Homepage veröffentlichen.",
      );
    const grant = {
      enabled: input.homepagePublish,
      fields: [...homepageFields.events],
      rightsConfirmed: input.homepagePublish,
      approvedBy: userId,
      updatedAt: new Date().toISOString(),
    };
    const candidate = {
      ...record,
      homepageGrants: { ...record.homepageGrants, events: grant },
    };
    if (grant.enabled) {
      const issues: string[] = [];
      const required = [
        ["Titel", record.title],
        ["Beschreibung", record.description],
      ];
      for (const [label, value] of required)
        if (typeof value !== "string" || !value.trim())
          issues.push(`${label} fehlt`);
      if (!record.startsAt || !Number.isFinite(Date.parse(record.startsAt)))
        issues.push("Beginn fehlt oder ist ungültig");
      if (record.data.imageUrl && !decodePublicImage(record.data.imageUrl))
        issues.push(
          "Veranstaltungsbild kann nicht verarbeitet werden – bitte erneut als PNG, JPG oder WebP bis 1,5 MB hochladen",
        );
      if (record.visibility !== "members")
        issues.push("Sichtbarkeit muss auf „Alle Partner“ stehen");
      if (!["published", "active", "completed"].includes(record.status))
        issues.push("Status muss auf „Veröffentlicht“ stehen");
      try {
        new Intl.DateTimeFormat("de-DE", {
          timeZone: String(record.data.timezone || "Europe/Berlin"),
        }).format();
      } catch {
        issues.push("Zeitzone ist ungültig");
      }
      if (issues.length)
        throw new BadRequestException(
          `Noch nicht gespeichert. Für die Homepage bitte korrigieren: ${issues.join("; ")}. Deine Eingaben bleiben im Formular erhalten.`,
        );
      if (network.status !== "active")
        throw new BadRequestException(
          "Das Netzwerk muss zuerst vom Betreiber aktiviert werden. Deine Eingaben bleiben im Formular erhalten.",
        );
      if (record.data.imageUrl && !mediaOrigin())
        throw new BadRequestException(
          "Die öffentliche Bildbereitstellung ist derzeit nicht eingerichtet. Bitte den Betreiber informieren. Deine Eingaben sind korrekt und bleiben im Formular erhalten.",
        );
      if (!projectHomepage("events", candidate))
        throw new BadRequestException(
          "Die Homepage-Freigabe konnte nicht verarbeitet werden. Bitte den Betreiber informieren. Deine Eingaben bleiben im Formular erhalten.",
        );
    }
    record.homepageGrants = candidate.homepageGrants;
    this.operatorAudit(
      userId,
      network.id,
      grant.enabled
        ? "homepage.publication.approved"
        : "homepage.publication.revoked",
      { kind: "events", recordId: record.id, fields: grant.fields },
    );
  }

  deleteContent(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requireWritableNetwork(user.id, networkId);
    const record = this.store.networkContents.get(contentId);
    if (!record || record.networkId !== networkId)
      throw new NotFoundException("Netzwerkinhalt nicht gefunden.");
    this.ensureModule(this.raw(networkId), record.type, user.id);
    this.requireContentUpdate(user.id, networkId, record);
    if (record.type === "event")
      for (const [id, attendance] of this.store.networkAttendances)
        if (
          attendance.networkId === networkId &&
          attendance.eventId === contentId
        )
          this.store.networkAttendances.delete(id);
    this.store.networkContents.delete(contentId);
    this.store.notifications.splice(
      0,
      this.store.notifications.length,
      ...this.store.notifications.filter(
        (n) => n.data.networkId !== networkId || n.data.contentId !== contentId,
      ),
    );
    return { deleted: true, id: contentId };
  }

  attendance(
    authorization: string | undefined,
    networkId: string,
    eventId: string,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    if (!this.canReadContent(actor.id, this.event(networkId, eventId)))
      throw new NotFoundException("Veranstaltung nicht verfügbar.");
    const own = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.userId === actor.id &&
        item.status === "active",
    );
    return [...this.store.networkAttendances.values()]
      .filter(
        (item) =>
          item.networkId === networkId &&
          item.eventId === eventId &&
          (this.isNetworkInitiator(actor.id, networkId) ||
            item.membershipId === own?.id),
      )
      .map((item) => this.attendanceView(item))
      .sort((a, b) => a.memberName.localeCompare(b.memberName, "de"));
  }

  updateOwnAttendance(
    authorization: string | undefined,
    networkId: string,
    eventId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireWritableNetwork(actor.id, networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    const event = this.event(networkId, eventId);
    if (!this.canReadContent(actor.id, event))
      throw new NotFoundException("Veranstaltung nicht verfügbar.");
    if (
      event.data.eventStatus === "cancelled" ||
      (event.startsAt &&
        Date.parse(event.endsAt || event.startsAt) < Date.now())
    )
      throw new BadRequestException(
        "Für diese Veranstaltung ist keine Anmeldung mehr möglich.",
      );
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.networkId === networkId &&
        item.userId === actor.id &&
        item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("Keine aktive Netzwerkmitgliedschaft.");
    return this.saveAttendance(
      actor.id,
      networkId,
      eventId,
      membership.id,
      input,
      false,
    );
  }

  updateMemberAttendance(
    authorization: string | undefined,
    networkId: string,
    eventId: string,
    membershipId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkInitiator(actor.id, networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    this.event(networkId, eventId);
    this.member(networkId, membershipId);
    return this.saveAttendance(
      actor.id,
      networkId,
      eventId,
      membershipId,
      input,
      true,
    );
  }

  async sportsSchedule(authorization: string | undefined, networkId: string) {
    // Authenticate and enforce tenancy before any external data request.
    this.proBSchedule(authorization, networkId);
    if (this.raw(networkId).slug === "bayer04leverkusen")
      await refreshBundesliga();
    return this.proBSchedule(authorization, networkId);
  }
  proBSchedule(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    this.requireGiantsNetwork(networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    const canManage = this.isNetworkInitiator(actor.id, networkId);
    const football = this.raw(networkId).slug === "bayer04leverkusen";
    return {
      season: football ? BUNDESLIGA_SEASON : PROB_SEASON,
      sourceUrl: football ? BUNDESLIGA_SOURCE : PROB_SOURCE_URL,
      teamName: football ? "Bayer 04 Leverkusen" : "Bayer Giants",
      competition: football ? "Bundesliga" : "ProB Süd",
      logos: football ? BUNDESLIGA_LOGOS : PROB_LOGOS,
      asOf: football ? bundesligaSnapshot().asOf : PROB_AS_OF,
      fetchedAt: football ? bundesligaSnapshot().fetchedAt : null,
      ...(football ? { round: bundesligaSnapshot().round } : {}),
      table: football ? bundesligaSnapshot().table : PROB_TABLE,
      tableSourceUrl: football ? BUNDESLIGA_TABLE_SOURCE : PROB_TABLE_SOURCE,
      canManage,
      games: (football ? bundesligaSnapshot().games : PROB_GAMES).map((game) =>
        this.proBGameView(networkId, game),
      ),
    };
  }

  updateProBResult(
    authorization: string | undefined,
    networkId: string,
    gameId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkManagement(actor.id, networkId);
    this.requireGiantsNetwork(networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    const game = this.proBGame(gameId, networkId);
    const score = (value: unknown) => {
      if (value === null || value === "") return null;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 250)
        throw new BadRequestException(
          "Das Ergebnis muss eine ganze Punktzahl zwischen 0 und 250 sein.",
        );
      return parsed;
    };
    const teamScore = score(input.giantsScore),
      opponentScore = score(input.opponentScore);
    if ((teamScore === null) !== (opponentScore === null))
      throw new BadRequestException(
        "Bitte beide Ergebnisse eintragen oder beide leeren.",
      );
    const record = this.proBRecord(networkId, game, true, actor.id)!;
    record.data.giantsScore = teamScore;
    record.data.opponentScore = opponentScore;
    record.updatedAt = new Date().toISOString();
    return this.proBGameView(networkId, game);
  }

  updateProBDiscussion(
    authorization: string | undefined,
    networkId: string,
    gameId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkManagement(actor.id, networkId);
    this.requireGiantsNetwork(networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    const game = this.proBGame(gameId, networkId),
      record = this.proBRecord(networkId, game, true, actor.id)!;
    record.data.discussionOpen = input.open === true;
    record.data.discussionPrompt =
      typeof input.prompt === "string" && input.prompt.trim()
        ? input.prompt.trim().slice(0, 1200)
        : "Was hat Ihnen rund um dieses Spiel gut gefallen – und was können wir beim gemeinsamen Beisammensein, beim Austausch und bei der Bekanntmachung im Netzwerk verbessern?";
    record.updatedAt = new Date().toISOString();
    return this.proBGameView(networkId, game);
  }

  addProBComment(
    authorization: string | undefined,
    networkId: string,
    gameId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireWritableNetwork(actor.id, networkId);
    this.requireGiantsNetwork(networkId);
    this.requireEnabledModule(networkId, "events", actor.id);
    const game = this.proBGame(gameId, networkId),
      record = this.proBRecord(
        networkId,
        game,
        this.raw(networkId).slug === "bayer04leverkusen",
        actor.id,
      );
    if (!record || record.data.discussionOpen !== true)
      throw new BadRequestException(
        "Für dieses Spiel ist aktuell keine Diskussionsrunde geöffnet.",
      );
    const body = requiredText(input.body, "Beitrag", 2, 1500),
      membership = this.store.networkMemberships.find(
        (item) =>
          item.networkId === networkId &&
          item.userId === actor.id &&
          item.status === "active",
      );
    if (!membership && !this.isNetworkInitiator(actor.id, networkId))
      throw new ForbiddenException("Kein aktiver Netzwerkzugang.");
    const organization = this.store.organizations.get(
        membership?.organizationId || "",
      ),
      comments = Array.isArray(record.data.comments)
        ? (record.data.comments as Array<Record<string, unknown>>)
        : [],
      now = new Date().toISOString();
    comments.push({
      id: randomUUID(),
      userId: actor.id,
      author: `${actor.firstName} ${actor.lastName}`.trim(),
      organization:
        !membership || membership.role === "network_admin"
          ? "Initiator"
          : organization?.displayName || "Netzwerkpartner",
      body,
      createdAt: now,
    });
    record.data.comments = comments;
    record.updatedAt = now;
    return this.proBGameView(networkId, game);
  }

  revenues(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAdmin(actor.id, networkId);
    this.requireEnabledModule(networkId, "revenue");
    return [...this.store.networkRevenues.values()]
      .filter((item) => item.networkId === networkId)
      .map((item) => this.revenueView(item))
      .sort((a, b) => b.periodTo.localeCompare(a.periodTo));
  }

  createRevenue(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAdmin(actor.id, networkId);
    this.requireWritableNetwork(actor.id, networkId);
    this.requireEnabledModule(networkId, "revenue");
    const referringMembershipId = String(input.referringMembershipId || ""),
      beneficiaryMembershipId = String(input.beneficiaryMembershipId || "");
    this.member(networkId, referringMembershipId);
    this.member(networkId, beneficiaryMembershipId);
    const periodFrom = this.dateOnly(input.periodFrom, "Zeitraum von"),
      periodTo = this.dateOnly(input.periodTo, "Zeitraum bis");
    if (periodTo < periodFrom)
      throw new BadRequestException(
        "Das Ende des Zeitraums liegt vor dem Beginn.",
      );
    const now = new Date().toISOString(),
      record: NetworkRevenueRecord = {
        id: randomUUID(),
        networkId,
        referringMembershipId,
        beneficiaryMembershipId,
        amountNetCents: this.money(input.amount),
        periodFrom,
        periodTo,
        status: this.revenueStatus(input.status),
        note: this.note(input.note),
        createdByUserId: actor.id,
        createdAt: now,
        updatedAt: now,
      };
    this.store.networkRevenues.set(record.id, record);
    return this.revenueView(record);
  }

  updateRevenue(
    authorization: string | undefined,
    networkId: string,
    revenueId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAdmin(actor.id, networkId);
    this.requireWritableNetwork(actor.id, networkId);
    this.requireEnabledModule(networkId, "revenue");
    const record = this.store.networkRevenues.get(revenueId);
    if (!record || record.networkId !== networkId)
      throw new NotFoundException("Umsatzdatensatz nicht gefunden.");
    if (input.referringMembershipId !== undefined) {
      record.referringMembershipId = String(input.referringMembershipId);
      this.member(networkId, record.referringMembershipId);
    }
    if (input.beneficiaryMembershipId !== undefined) {
      record.beneficiaryMembershipId = String(input.beneficiaryMembershipId);
      this.member(networkId, record.beneficiaryMembershipId);
    }
    if (input.amount !== undefined)
      record.amountNetCents = this.money(input.amount);
    if (input.periodFrom !== undefined)
      record.periodFrom = this.dateOnly(input.periodFrom, "Zeitraum von");
    if (input.periodTo !== undefined)
      record.periodTo = this.dateOnly(input.periodTo, "Zeitraum bis");
    if (record.periodTo < record.periodFrom)
      throw new BadRequestException(
        "Das Ende des Zeitraums liegt vor dem Beginn.",
      );
    if (input.status !== undefined)
      record.status = this.revenueStatus(input.status);
    if (input.note !== undefined) record.note = this.note(input.note);
    record.updatedAt = new Date().toISOString();
    return this.revenueView(record);
  }

  dashboard(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const network = this.raw(networkId),
      members = this.store.networkMemberships.filter(
        (item) => item.networkId === networkId,
      ),
      partners = members.filter(
        (item) =>
          this.store.users.get(item.userId)?.accountRole !== "platform_admin",
      ),
      contents = [...this.store.networkContents.values()].filter(
        (item) =>
          item.networkId === networkId &&
          item.data.kind !== "network_invitation" &&
          item.type !== "conversation" &&
          visibleCooperation(this.store, item) &&
          this.canReadContent(user.id, item) &&
          this.contentModuleAvailable(user.id, item),
      );
    const visible = contents.filter(
        (item) =>
          item.visibility === "members" &&
          ["published", "active", "completed"].includes(item.status),
      ),
      events = visible.filter((item) => item.type === "event"),
      now = new Date().toISOString();
    const recentMembers = partners
      .filter((item) => item.status === "active")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .flatMap((item) => {
        const organization = this.store.organizations.get(item.organizationId);
        return organization
          ? [
              {
                id: item.id,
                name: organization.displayName,
                joinedAt: item.updatedAt,
                logoUrl: organization.networkProfile?.logoUrl || null,
              },
            ]
          : [];
      });
    return {
      network,
      members: {
        total: partners.length,
        active: partners.filter((item) => item.status === "active").length,
        pending: partners.filter((item) => item.status === "pending").length,
      },
      content: {
        total: contents.length,
        events: contents.filter((item) => item.type === "event").length,
        topics: contents.filter((item) =>
          ["topic", "announcement", "poll"].includes(item.type),
        ).length,
        tasks: contents.filter(
          (item) => item.type === "task" && item.status !== "completed",
        ).length,
        documents: contents.filter((item) => item.type === "document").length,
      },
      recent: visible
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
      recentMembers,
      upcomingEvents: events
        .filter(
          (item) =>
            item.startsAt &&
            Date.parse(item.endsAt || item.startsAt) >= Date.parse(now) &&
            item.data.eventStatus !== "cancelled",
        )
        .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
        .slice(0, 4),
      recentEvents: events
        .filter(
          (item) =>
            item.startsAt &&
            Date.parse(item.endsAt || item.startsAt) < Date.parse(now) &&
            item.data.eventStatus !== "cancelled",
        )
        .sort((a, b) => Date.parse(b.startsAt!) - Date.parse(a.startsAt!))
        .slice(0, 1),
      eventRecaps: events
        .filter(
          (item) =>
            typeof item.data.recapSummary === "string" &&
            item.data.recapSummary,
        )
        .sort((a, b) =>
          (b.startsAt || b.updatedAt).localeCompare(a.startsAt || a.updatedAt),
        )
        .slice(0, 4),
      announcements: visible
        .filter(
          (item) =>
            item.type === "announcement" ||
            (item.type === "topic" &&
              item.data.category === "Neuigkeit des Initiators"),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
        .map((item) => this.boardPresentation(item)),
    };
  }

  orders(authorization: string | undefined, networkId: string) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkAccess(user.id, networkId);
    const canReview = this.isNetworkInitiator(user.id, networkId);
    return [...this.store.networkOrders.values()]
      .filter(
        (item) =>
          item.networkId === networkId &&
          (canReview || item.orderedByUserId === user.id),
      )
      .map((item) => this.normalizeOrder(item))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  order(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization),
      network = this.raw(networkId);
    this.requireNetworkAccess(user.id, networkId);
    if (network.settings.memberMonthlyNetCents !== undefined)
      throw new BadRequestException(
        "Eine separate Modulbuchung ist nicht mehr möglich. Die Jahresmitgliedschaft wird persönlich bei der Registrierung gebucht; Initiatoren bleiben kostenlos.",
      );
    if (network.settings.billingMode === "cooperation_free")
      throw new BadRequestException(
        "Dieses Kooperationsnetzwerk ist vollständig kostenfrei freigeschaltet. Eine Modulbuchung ist nicht erforderlich.",
      );
    if (network.status !== "active")
      throw new BadRequestException(
        "Eine persönliche Modulbuchung ist erst im aktivierten Netzwerk möglich.",
      );
    if (
      [...this.store.networkOrders.values()].some(
        (item) =>
          item.networkId === networkId &&
          item.orderedByUserId === user.id &&
          ["submitted", "accepted"].includes(item.status),
      )
    )
      throw new ConflictException(
        "Für Ihren Zugang besteht bereits eine aktive oder offene Modulbuchung.",
      );
    const billingCycle = String(input.billingCycle);
    if (billingCycle !== "annual")
      throw new BadRequestException(
        "Alle Modulpreise werden für zwölf Monate im Voraus abgerechnet.",
      );
    const participantCount = 1;
    const allowed = allProductModuleIds(),
      offered = network.enabledModules.filter((module) =>
        allowed.includes(module),
      ),
      pricingMode =
        input.pricingMode === "complete" ? "complete" : "individual";
    if (pricingMode === "complete" && offered.length !== allowed.length)
      throw new BadRequestException(
        "Das Komplettpaket ist nur verfügbar, wenn der Initiator alle Module anbietet.",
      );
    const requested = Array.isArray(input.selectedModules)
        ? input.selectedModules
            .map(String)
            .filter((item): item is NetworkModule =>
              offered.includes(item as NetworkModule),
            )
        : [],
      selectedModules =
        pricingMode === "complete" ? offered : [...new Set(requested)];
    if (!selectedModules.includes("profiles"))
      throw new BadRequestException(
        "Das Basis-Modul Unternehmensseiten ist verpflichtend.",
      );
    const moduleUnitPrices = Object.fromEntries(
        NETWORK_MODULE_CATALOG.filter((item) =>
          selectedModules.includes(item.id),
        ).map((item) => [item.id, item.unitNetCents]),
      ) as Partial<Record<NetworkModule, number>>,
      unitNetCents =
        pricingMode === "complete"
          ? NETWORK_COMPLETE_UNIT_NET_CENTS
          : Object.values(moduleUnitPrices).reduce(
              (sum, value) => sum + (value || 0),
              0,
            ),
      monthlyNetCents = unitNetCents * participantCount;
    if (
      input.authorityConfirmed !== true ||
      input.termsAccepted !== true ||
      input.paymentObligationAccepted !== true
    )
      throw new BadRequestException(
        "Für die verbindliche Bestellung müssen alle erforderlichen Erklärungen bestätigt werden.",
      );
    const now = new Date().toISOString();
    const record: NetworkOrderRecord = {
      id: randomUUID(),
      networkId,
      orderedByUserId: user.id,
      invoiceCompany: requiredText(
        input.invoiceCompany,
        "Rechnungsempfänger",
        2,
        200,
      ),
      invoiceContact: requiredText(
        input.invoiceContact,
        "Ansprechpartner",
        2,
        160,
      ),
      invoiceEmail: requiredText(
        input.invoiceEmail,
        "Rechnungs-E-Mail",
        5,
        250,
      ).toLowerCase(),
      invoiceStreet: requiredText(
        input.invoiceStreet,
        "Straße und Hausnummer",
        3,
        200,
      ),
      invoicePostalCode: requiredText(
        input.invoicePostalCode,
        "Postleitzahl",
        4,
        12,
      ),
      invoiceCity: requiredText(input.invoiceCity, "Ort", 2, 120),
      invoiceCountry: requiredText(input.invoiceCountry, "Land", 2, 80),
      billingCycle: billingCycle as NetworkOrderRecord["billingCycle"],
      purchaseOrderReference:
        typeof input.purchaseOrderReference === "string" &&
        input.purchaseOrderReference.trim()
          ? input.purchaseOrderReference.trim().slice(0, 120)
          : null,
      participantCount,
      selectedModules,
      pricingMode,
      moduleUnitPrices,
      monthlyNetCents,
      setupNetCents: 0,
      minimumTermMonths: 12,
      termsVersion: "agb-2026-11-05",
      pricingVersion: "network-user-modules-2026-10",
      authorityConfirmed: true,
      termsAccepted: true,
      paymentObligationAccepted: true,
      status: "accepted",
      submittedAt: now,
      decidedAt: now,
      decidedByUserId: null,
      paymentStatus: "open",
      paymentDueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      paidAt: null,
      serviceStartsAt: now,
      serviceEndsAt: new Date(
        new Date(now).setFullYear(new Date(now).getFullYear() + 1),
      ).toISOString(),
    };
    this.store.networkOrders.set(record.id, record);
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: user.id,
      type: "network.subscription.activated",
      visibility: "platform_internal",
      data: { networkId, orderId: record.id, billingCycle },
      createdAt: now,
    });
    void this.email
      .sendNetworkOrderConfirmation({
        email: record.invoiceEmail,
        contact: record.invoiceContact,
        networkName: network.name,
        orderId: record.id,
        billingCycle: record.billingCycle,
        monthlyNetCents: record.monthlyNetCents,
      })
      .catch(() => undefined);
    return record;
  }

  updateOrderPayment(
    authorization: string | undefined,
    networkId: string,
    orderId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const order = this.store.networkOrders.get(orderId);
    if (!order || order.networkId !== networkId)
      throw new NotFoundException("Buchung nicht gefunden.");
    const status = String(input.status);
    if (!["open", "paid", "overdue"].includes(status))
      throw new BadRequestException("Ungültiger Rechnungsstatus.");
    order.paymentStatus = status as "open" | "paid" | "overdue";
    order.paidAt = status === "paid" ? new Date().toISOString() : null;
    return this.normalizeOrder(order);
  }

  decideOrder(
    authorization: string | undefined,
    networkId: string,
    orderId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requirePlatformAdmin(actor.id);
    const network = this.raw(networkId),
      order = this.store.networkOrders.get(orderId);
    if (!order || order.networkId !== networkId)
      throw new NotFoundException("Bestellung nicht gefunden.");
    this.normalizeOrder(order);
    if (order.status !== "submitted")
      throw new BadRequestException(
        "Diese Bestellung wurde bereits entschieden.",
      );
    const decision = String(input.decision);
    if (!["accepted", "rejected"].includes(decision))
      throw new BadRequestException("Ungültige Bestellentscheidung.");
    order.status = decision as "accepted" | "rejected";
    order.decidedAt = new Date().toISOString();
    order.decidedByUserId = actor.id;
    if (decision === "accepted") network.updatedAt = order.decidedAt;
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: actor.id,
      type: `network.order.${decision}`,
      visibility: "platform_internal",
      data: { networkId, orderId },
      createdAt: order.decidedAt,
    });
    return { order, network };
  }

  updateSettings(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const user = this.auth.authenticate(authorization);
    this.requireNetworkInitiator(user.id, networkId);
    const network = this.raw(networkId);
    if (typeof input.name === "string")
      network.name = requiredText(input.name, "Netzwerkname", 2, 160);
    if (typeof input.legalName === "string")
      network.legalName = input.legalName.trim() || null;
    if (typeof input.websiteUrl === "string")
      network.websiteUrl = input.websiteUrl.trim() || null;
    if (typeof input.logoUrl === "string") {
      const logo = input.logoUrl.trim();
      if (logo && !(logo.startsWith("data:image/") || safeUrl(logo)))
        throw new BadRequestException(
          "Das Netzwerklogo muss eine Bilddatei oder gültige URL sein.",
        );
      if (logo.startsWith("data:image/") && logo.length > 2_000_000)
        throw new BadRequestException(
          "Das Netzwerklogo ist zu groß. Maximal 1,5 MB.",
        );
      network.logoUrl = logo || null;
    }
    if (
      typeof input.primaryColor === "string" &&
      /^#[0-9a-f]{6}$/i.test(input.primaryColor)
    )
      network.primaryColor = input.primaryColor;
    if (
      typeof input.secondaryColor === "string" &&
      /^#[0-9a-f]{6}$/i.test(input.secondaryColor)
    )
      network.secondaryColor = input.secondaryColor;
    if (Array.isArray(input.enabledModules)) {
      const allowed = allProductModuleIds(),
        selected = input.enabledModules
          .map(String)
          .filter((item): item is NetworkModule =>
            allowed.includes(item as NetworkModule),
          );
      if (!selected.includes("profiles"))
        throw new BadRequestException(
          "Unternehmensseiten müssen im Netzwerk angeboten werden.",
        );
      network.enabledModules = expandNetworkModules(selected);
    }
    network.settings.closedNetwork = true;
    network.enabledModules = fullPortalModules();
    network.settings.selfRegistration = false;
    network.settings.crossNetworkMatching = false;
    if (typeof input.admissionRules === "string")
      network.settings.admissionRules = input.admissionRules.trim() || null;
    for (const key of [
      "welcomeTitle",
      "welcomeIntro",
      "bannerTitle",
      "bannerDescription",
    ] as const) {
      if (typeof input[key] === "string") {
        const value = (input[key] as string).trim();
        if (value.length > (key.endsWith("Title") ? 160 : 600))
          throw new BadRequestException("Der Startseitentext ist zu lang.");
        network.settings[key] = value || null;
      }
    }
    if (input.bannerImageUrl !== undefined)
      network.settings.bannerImageUrl = partnerHero(input.bannerImageUrl);
    network.updatedAt = new Date().toISOString();
    if (input.completeSetup === true)
      network.settings.setupCompletedAt = network.updatedAt;
    return network;
  }

  participants(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    return this.store.networkMemberships
      .filter(
        (m) =>
          m.networkId === networkId &&
          m.role !== "visitor" &&
          m.status === "active" &&
          this.store.users.get(m.userId)?.accountRole !== "platform_admin",
      )
      .map((m) => ({
        userId: m.userId,
        logoUrl: this.store.organizations.get(m.organizationId)?.networkProfile?.logoUrl || null,
        role: m.role,
        name: [
          this.store.users.get(m.userId)?.firstName,
          this.store.users.get(m.userId)?.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        company: this.store.organizations.get(m.organizationId)?.displayName || (m.role === 'network_admin' ? 'Netzwerkleitung' : ''),
      }));
  }
  thread(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
  ) {
    const actor = this.auth.authenticate(authorization),
      record = this.readThread(actor.id, networkId, contentId);
    for (const n of this.store.notifications)
      if (
        n.userId === actor.id &&
        n.data.networkId === networkId &&
        n.data.contentId === contentId
      )
        n.readAt = new Date().toISOString();
    return {
      ...this.boardPresentation(record),
      currentUserId: actor.id,
      canEdit:
        record.createdByUserId === actor.id ||
        (record.type !== "conversation" &&
          this.isNetworkManager(actor.id, networkId)),
      participants:
        record.type === "conversation"
          ? this.participants(authorization, networkId).filter((m) =>
              this.threadParticipants(record).includes(m.userId),
            )
          : [],
    };
  }
  pulse(authorization: string | undefined, networkId: string, daysValue?: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    const days = Number(daysValue || 30);
    if (![30,60,90,180].includes(days)) throw new BadRequestException('Ungültiger Zeitraum.');
    return networkPulse(this.store, networkId, days);
  }
  updateChatPulse(authorization: string | undefined, networkId: string, contentId: string, input: Record<string, unknown>) {
    const actor = this.auth.authenticate(authorization);
    this.requireWritableNetwork(actor.id, networkId);
    const record = this.readThread(actor.id, networkId, contentId);
    const boardId = `cooperation:${record.id}`, wasPublished = this.store.networkContents.has(boardId);
    updatePulse(this.store, record, actor.id, input);
    const post = this.store.networkContents.get(boardId);
    if (post && !wasPublished) this.notifyContent(post, actor.id, 'network.content.created');
    if (!post) this.store.notifications.splice(0,this.store.notifications.length,...this.store.notifications.filter(n=>n.data.networkId!==networkId || n.data.contentId!==boardId));
    return this.thread(authorization, networkId, contentId);
  }
  reply(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization),
      record = this.readThread(actor.id, networkId, contentId);
    this.requireWritableNetwork(actor.id, networkId);
    if (record.status === "archived" || record.status === "draft")
      throw new BadRequestException(
        "Dieser Austausch ist noch nicht geöffnet oder bereits archiviert.",
      );
    const kind = String(input.kind || "message");
    if (record.type === "topic" && record.data.discussionOpen === false)
      throw new BadRequestException(
        "Für diesen Beitrag ist die Diskussion geschlossen.",
      );
    if (!["message", "meeting", "action"].includes(kind))
      throw new BadRequestException("Ungültiger Beitrag.");
    const attachments = input.file ? [this.checkedAttachment(input.file)] : [];
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (
      (!body && !attachments.length) ||
      body.length > 5000 ||
      (kind !== "message" && !body)
    )
      throw new BadRequestException(
        "Bitte eine Nachricht oder Datei senden (Text maximal 5.000 Zeichen).",
      );
    const message: Record<string, unknown> = {
      id: randomUUID(),
      userId: actor.id,
      author: actor.firstName + " " + actor.lastName,
      kind,
      body,
      attachments,
      createdAt: new Date().toISOString(),
    };
    if (kind === "meeting") {
      const startsAt = this.optionalDate(input.startsAt),
        duration = Number(input.durationMinutes || 30);
      if (
        !startsAt ||
        Date.parse(startsAt) <= Date.now() ||
        !Number.isInteger(duration) ||
        duration < 15 ||
        duration > 480
      )
        throw new BadRequestException(
          "Bitte einen zukünftigen Termin mit 15 bis 480 Minuten Dauer wählen.",
        );
      message.startsAt = startsAt;
      message.durationMinutes = duration;
      message.location =
        typeof input.location === "string"
          ? input.location.trim().slice(0, 500)
          : "";
      message.responses = {};
      message.status = "proposed";
    }
    if (kind === "action") {
      const assignedToUserId = String(input.assignedToUserId || actor.id);
      this.activeNetworkUser(networkId, assignedToUserId);
      if (
        record.type === "conversation" &&
        !this.threadParticipants(record).includes(assignedToUserId)
      )
        throw new BadRequestException(
          "Die verantwortliche Person muss am Gespräch teilnehmen.",
        );
      message.assignedToUserId = assignedToUserId;
      message.deadline = this.optionalDate(input.deadline);
      message.status = "open";
    }
    const messages = Array.isArray(record.data.messages)
      ? record.data.messages
      : [];
    if (messages.length >= 1000)
      throw new BadRequestException(
        "Bitte für weitere Beiträge ein neues Thema beginnen.",
      );
    record.data.messages = [...messages, message];
    if (record.type === 'conversation' && kind === 'message') activatePulseOnReply(this.store, record);
    record.updatedAt = new Date().toISOString();
    if (record.type === 'conversation' && record.data.networkPulse && typeof record.data.networkPulse === 'object') (record.data.networkPulse as {updatedAt:string}).updatedAt = record.updatedAt;
    this.notifyContent(record, actor.id, "network.reply");
    return this.thread(authorization, networkId, contentId);
  }
  respond(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
    messageId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization),
      record = this.readThread(actor.id, networkId, contentId);
    this.requireWritableNetwork(actor.id, networkId);
    if (record.status === "archived" || record.status === "draft")
      throw new BadRequestException(
        "Dieser Austausch ist nicht zur Bearbeitung geöffnet.",
      );
    const messages = Array.isArray(record.data.messages)
        ? (record.data.messages as Array<Record<string, any>>)
        : [],
      message = messages.find((m) => m.id === messageId);
    if (!message) throw new NotFoundException("Beitrag nicht gefunden.");
    if (message.kind === "meeting") {
      if (input.status === "cancelled") {
        if (message.userId !== actor.id)
          throw new ForbiddenException(
            "Nur der Ersteller darf den Termin absagen.",
          );
        message.status = "cancelled";
      } else {
        if (message.status === "cancelled")
          throw new BadRequestException("Der Termin ist abgesagt.");
        if (!["accepted", "declined"].includes(String(input.status)))
          throw new BadRequestException("Bitte zu- oder absagen.");
        message.responses = { ...message.responses, [actor.id]: input.status };
      }
    } else if (message.kind === "action") {
      if (actor.id !== message.userId && actor.id !== message.assignedToUserId)
        throw new ForbiddenException(
          "Nur verantwortliche Personen dürfen diesen Schritt ändern.",
        );
      if (!["open", "completed"].includes(String(input.status)))
        throw new BadRequestException("Ungültiger Status.");
      message.status = input.status;
    } else if (message.userId === actor.id && input.status === "deleted") {
      message.body = "Beitrag entfernt";
      message.attachments = [];
      message.deletedAt = new Date().toISOString();
    } else throw new ForbiddenException("Änderung nicht erlaubt.");
    record.updatedAt = new Date().toISOString();
    this.notifyContent(record, actor.id, "network.response");
    return this.thread(authorization, networkId, contentId);
  }
  connections(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    return [...this.store.networkConnections.values()]
      .filter(
        (c) =>
          c.networkId === networkId &&
          [c.senderId, c.recipientId].includes(actor.id),
      )
      .map((c) => {
        const peer = this.store.users.get(
          c.senderId === actor.id ? c.recipientId : c.senderId,
        );
        return {
          ...c,
          peerName: peer
            ? `${peer.firstName} ${peer.lastName}`.trim()
            : "Netzwerkpartner",
        };
      });
  }
  private connectionMember(userId: string, networkId: string) {
    const user = this.store.users.get(userId);
    if (
      !user ||
      user.visitorNetworkId ||
      user.accountRole === "platform_admin" ||
      !this.store.networkMemberships.some(
        (m) =>
          m.userId === userId &&
          m.networkId === networkId &&
          m.status === "active" &&
          m.role !== "visitor",
      )
    )
      throw new ForbiddenException(
        "Vernetzung ist nur zwischen aktiven Teilnehmern dieses Netzwerks möglich.",
      );
    return user;
  }
  requestConnection(
    authorization: string | undefined,
    networkId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireWritableNetwork(actor.id, networkId);
    this.connectionMember(actor.id, networkId);
    const recipientId = requiredText(
      input.recipientId,
      "Netzwerkpartner",
      1,
      100,
    );
    if (recipientId === actor.id)
      throw new BadRequestException(
        "Eine Vernetzung mit sich selbst ist nicht möglich.",
      );
    this.connectionMember(recipientId, networkId);
    const existing = [...this.store.networkConnections.values()].find(
      (c) =>
        c.networkId === networkId &&
        [c.senderId, c.recipientId].includes(actor.id) &&
        [c.senderId, c.recipientId].includes(recipientId),
    );
    if (existing) return existing;
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      networkId,
      senderId: actor.id,
      recipientId,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };
    this.store.networkConnections.set(record.id, record);
    this.store.notifications.push({
      id: randomUUID(),
      userId: recipientId,
      type: "network.connection.request",
      data: {
        networkId,
        connectionId: record.id,
        title: `${actor.firstName} ${actor.lastName} möchte sich mit dir vernetzen und interessiert sich für deine Leistungen.`,
      },
      readAt: null,
      createdAt: now,
    });
    return record;
  }
  decideConnection(
    authorization: string | undefined,
    networkId: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization);
    this.requireWritableNetwork(actor.id, networkId);
    this.connectionMember(actor.id, networkId);
    const record = this.store.networkConnections.get(id);
    if (
      !record ||
      record.networkId !== networkId ||
      record.recipientId !== actor.id
    )
      throw new ForbiddenException(
        "Nur der Empfänger darf diese Anfrage beantworten.",
      );
    this.connectionMember(record.senderId, networkId);
    if (!["accepted", "declined"].includes(String(input.status)))
      throw new BadRequestException("Ungültige Entscheidung.");
    if (record.status !== "pending") return record;
    record.status = input.status as "accepted" | "declined";
    record.updatedAt = new Date().toISOString();
    for (const notification of this.store.notifications)
      if (
        notification.userId === actor.id &&
        notification.data.connectionId === id
      )
        notification.readAt = record.updatedAt;
    if (record.status === "accepted")
      this.store.notifications.push({
        id: randomUUID(),
        userId: record.senderId,
        type: "network.connection.accepted",
        data: {
          networkId,
          connectionId: id,
          title: `${actor.firstName} ${actor.lastName} hat deine Vernetzungsanfrage angenommen.`,
        },
        readAt: null,
        createdAt: record.updatedAt,
      });
    return record;
  }
  networkNotifications(authorization: string | undefined, networkId: string) {
    const actor = this.auth.authenticate(authorization);
    this.requireNetworkAccess(actor.id, networkId);
    return this.store.notifications
      .filter(
        (n) =>
          n.userId === actor.id &&
          n.data.networkId === networkId &&
          (!n.data.contentId ||
            (() => {
              const r = this.store.networkContents.get(
                String(n.data.contentId),
              );
              return (
                r &&
                this.canReadContent(actor.id, r) &&
                this.contentModuleAvailable(actor.id, r)
              );
            })()),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map((notification) => {
        const content = this.store.networkContents.get(
          String(notification.data.contentId || ""),
        );
        if (
          !content ||
          content.networkId !== networkId ||
          content.type !== "event"
        )
          return notification;
        return {
          ...notification,
          data: {
            ...notification.data,
            event: {
              title: content.title,
              description: content.description.slice(0, 180),
              startsAt: content.startsAt,
              endsAt: content.endsAt,
              status: content.data.eventStatus,
              imageUrl:
                content.data.imageUrl || content.data.coverImageUrl || null,
            },
          },
        };
      });
  }
  vote(
    authorization: string | undefined,
    networkId: string,
    contentId: string,
    input: Record<string, unknown>,
  ) {
    const actor = this.auth.authenticate(authorization),
      record = this.readThread(actor.id, networkId, contentId);
    this.requireWritableNetwork(actor.id, networkId);
    if (
      record.type !== "topic" ||
      !["published", "active"].includes(record.status)
    )
      throw new BadRequestException("Diese Abstimmung ist nicht geöffnet.");
    const options = String(record.data.options || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      option = Number(input.option);
    if (
      options.length < 2 ||
      options.length > 10 ||
      !Number.isInteger(option) ||
      option < 0 ||
      option >= options.length
    )
      throw new BadRequestException("Bitte eine gültige Antwort auswählen.");
    const votes =
      record.data.votes && typeof record.data.votes === "object"
        ? (record.data.votes as Record<string, number>)
        : {};
    record.data.votes = { ...votes, [actor.id]: option };
    record.updatedAt = new Date().toISOString();
    return this.thread(authorization, networkId, contentId);
  }
  private activeNetworkUser(networkId: string, userId: string) {
    if (
      !this.store.networkMemberships.some(
        (m) =>
          m.networkId === networkId &&
          m.userId === userId &&
          m.status === "active",
      )
    )
      throw new BadRequestException(
        "Die Person ist kein aktives Mitglied dieses Partnernetzwerks.",
      );
  }
  private validateParticipants(
    networkId: string,
    creatorId: string,
    value: unknown,
  ) {
    const ids = [
      ...new Set([
        creatorId,
        ...(Array.isArray(value) ? value.map(String) : []),
      ]),
    ];
    if (ids.length < 2 || ids.length > 51)
      throw new BadRequestException(
        "Bitte mindestens einen Gesprächspartner aus diesem Netzwerk auswählen (maximal 51 Personen).",
      );
    for (const id of ids) this.activeNetworkUser(networkId, id);
    return ids;
  }
  private threadParticipants(record: NetworkContentRecord) {
    return [
      ...new Set([
        record.createdByUserId,
        ...(Array.isArray(record.data.participantUserIds)
          ? record.data.participantUserIds.map(String)
          : []),
      ]),
    ];
  }
  private canReadContent(userId: string, record: NetworkContentRecord) {
    if (!visibleCooperation(this.store, record)) return false;
    if (record.data.kind === "network_invitation") return false;
    if (record.type === "conversation")
      return (
        this.threadParticipants(record).includes(userId) &&
        (record.status !== "draft" || record.createdByUserId === userId)
      );
    if (record.status === "draft")
      return (
        record.createdByUserId === userId ||
        this.isNetworkManager(userId, record.networkId)
      );
    return (
      record.visibility !== "administrators" ||
      record.createdByUserId === userId ||
      this.isNetworkManager(userId, record.networkId)
    );
  }
  private contentModuleAvailable(userId: string, record: NetworkContentRecord) {
    try {
      this.ensureModule(this.raw(record.networkId), record.type, userId);
      return true;
    } catch {
      return false;
    }
  }
  private readThread(userId: string, networkId: string, contentId: string) {
    this.requireNetworkAccess(userId, networkId);
    const record = this.store.networkContents.get(contentId);
    if (
      !record ||
      record.networkId !== networkId ||
      !this.canReadContent(userId, record)
    )
      throw new NotFoundException("Dieser Austausch ist nicht verfügbar.");
    this.ensureModule(this.raw(networkId), record.type, userId);
    return record;
  }
  private checkedAttachment(input: unknown) {
    if (!input || typeof input !== "object")
      throw new BadRequestException("Ungültige Datei.");
    const f = input as Record<string, unknown>,
      mimeType = String(f.mimeType || ""),
      dataUrl = String(f.dataUrl || ""),
      name = String(f.name || "").replace(/[\\/]/g, "_"),
      size = Number(f.size);
    const signatures: Record<string, string[]> = {
      "application/pdf": ["25504446"],
      "image/png": ["89504e470d0a1a0a"],
      "image/jpeg": ["ffd8ff"],
      "image/webp": ["52494646"],
    };
    if (
      !signatures[mimeType] ||
      !name ||
      name.length > 180 ||
      !dataUrl.startsWith("data:" + mimeType + ";base64,") ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > 1_500_000 ||
      dataUrl.length > 2_100_000
    )
      throw new BadRequestException(
        "Erlaubt sind PDF, JPG, PNG und WebP bis 1,5 MB.",
      );
    const bytes = Buffer.from(dataUrl.split(",")[1] || "", "base64"),
      hex = bytes.toString("hex");
    if (
      bytes.length !== size ||
      !signatures[mimeType].some((s) => hex.startsWith(s)) ||
      (mimeType === "image/webp" && bytes.subarray(8, 12).toString() !== "WEBP")
    )
      throw new BadRequestException(
        "Dateiinhalt und Dateityp stimmen nicht überein.",
      );
    return { id: randomUUID(), name, mimeType, size, dataUrl };
  }
  private notifyContent(
    record: NetworkContentRecord,
    actorId: string,
    type: string,
  ) {
    const users = new Set(
      this.store.networkMemberships
        .filter(
          (m) =>
            m.networkId === record.networkId &&
            m.status === "active" &&
            m.userId !== actorId &&
            this.canReadContent(m.userId, record) &&
            this.contentModuleAvailable(m.userId, record),
        )
        .map((m) => m.userId),
    );
    for (const userId of users) {
      const existing = this.store.notifications.find(
        (n) =>
          n.userId === userId &&
          !n.readAt &&
          n.data.networkId === record.networkId &&
          n.data.contentId === record.id,
      );
      if (existing) {
        existing.type = type;
        existing.data.title = record.title;
        existing.createdAt = new Date().toISOString();
      } else
        this.store.notifications.push({
          id: randomUUID(),
          userId,
          type,
          data: {
            networkId: record.networkId,
            contentId: record.id,
            title: record.title,
          },
          readAt: null,
          createdAt: new Date().toISOString(),
        });
    }
  }
  private record(
    networkId: string,
    organizationId: string,
    userId: string,
    role: NetworkRole,
    status: NetworkMembershipRecord["status"],
    invitedByUserId: string | null,
  ): NetworkMembershipRecord {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      networkId,
      organizationId,
      userId,
      role,
      status,
      invitedByUserId,
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }
  private createInitiatorOrganization(userId: string, network: NetworkRecord) {
    const websiteUrl = network.websiteUrl;
    const organization = {
      id: randomUUID(),
      legalName: network.legalName || network.name,
      displayName: network.name,
      role: "network" as const,
      websiteUrl,
      emailDomain: websiteUrl
        ? new URL(websiteUrl).hostname.replace(/^www\./, "")
        : null,
      reviewStatus: "draft" as const,
      submittedAt: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.store.organizations.set(organization.id, organization);
    this.store.memberships.push({
      organizationId: organization.id,
      userId,
      role: "admin",
    });
    return organization;
  }
  private bySlug(slug: string) {
    const id = this.store.networkBySlug.get(slug);
    if (!id) throw new NotFoundException("Netzwerk nicht gefunden.");
    return this.get(id);
  }
  private get(id: string) {
    const network = this.raw(id);
    if (network.status === "active") return network;
    if (
      network.status === "trial" &&
      network.trialEndsAt &&
      Date.parse(network.trialEndsAt) > Date.now()
    )
      return network;
    throw new NotFoundException(
      "Netzwerk nicht gefunden oder nicht freigeschaltet.",
    );
  }
  private raw(id: string) {
    const network = this.store.networks.get(id);
    if (!network) throw new NotFoundException("Netzwerk nicht gefunden.");
    network.enabledModules = fullPortalModules();
    return network;
  }
  private validateContentData(
    type: NetworkContentType,
    data: Record<string, unknown>,
    creating: boolean,
  ) {
    if (
      type === "topic" &&
      data.imageUrl != null &&
      !decodePublicImage(data.imageUrl)
    )
      throw new BadRequestException(
        "Bitte ein gültiges PNG-, JPG- oder WebP-Foto bis 1,5 MB hochladen.",
      );
    if (type === "topic" && data.options) {
      const options = String(data.options)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length < 2 || options.length > 10)
        throw new BadRequestException(
          "Eine Abstimmung benötigt 2 bis 10 Antwortoptionen.",
        );
    }
    if (type === "event") {
      if (
        data.capacity &&
        (!Number.isInteger(Number(data.capacity)) ||
          Number(data.capacity) < 1 ||
          Number(data.capacity) > 100000)
      )
        throw new BadRequestException("Ungültige Teilnehmerzahl.");
      if (data.deadline && Number.isNaN(Date.parse(String(data.deadline))))
        throw new BadRequestException("Ungültiger Anmeldeschluss.");
    }
    const categories = NETWORK_CONTENT_CATEGORIES[type];
    if (categories) {
      const category = String(data.category || "");
      if (!categories.includes(category))
        throw new BadRequestException(
          "Bitte wählen Sie eine der vorgegebenen Kategorien.",
        );
    }
    if (type !== "document") return;
    const file = data.file;
    if (!file || typeof file !== "object") {
      if (creating)
        throw new BadRequestException(
          "Bitte laden Sie eine PDF- oder Bilddatei hoch.",
        );
      return;
    }
    const value = file as Record<string, unknown>,
      mimeType = String(value.mimeType || ""),
      dataUrl = String(value.dataUrl || ""),
      name = String(value.name || "");
    if (
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        mimeType,
      ) ||
      !dataUrl.startsWith(`data:${mimeType};base64,`)
    )
      throw new BadRequestException(
        "Erlaubt sind PDF-, JPG-, PNG- und WebP-Dateien.",
      );
    if (dataUrl.length > 2_100_000 || Number(value.size) > 1_500_000)
      throw new BadRequestException("Die Datei darf maximal 1,5 MB groß sein.");
    if (!name || name.length > 180)
      throw new BadRequestException("Der Dateiname fehlt oder ist zu lang.");
  }
  private requirePlatformAdmin(userId: string) {
    if (this.store.users.get(userId)?.accountRole !== "platform_admin")
      throw new ForbiddenException(
        "Nur die Plattformadministration darf Netzwerkpartner freischalten.",
      );
  }
  private requireNetworkManagementOrTrialAdmin(
    userId: string,
    networkId: string,
  ) {
    const user = this.store.users.get(userId);
    if (user?.accountRole === "platform_admin") return;
    if (
      !this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active" &&
          item.role === "network_admin",
      )
    )
      throw new ForbiddenException(
        "Nur die verantwortliche Netzwerkadministration darf diese Buchung verwalten.",
      );
  }
  private requireNetworkInitiator(userId: string, networkId: string) {
    if (!this.isNetworkInitiator(userId, networkId))
      throw new ForbiddenException(
        "Nur der Initiator des Netzwerks darf Module und Whitelabel-Einstellungen verwalten.",
      );
  }
  private requireNetworkManagement(userId: string, networkId: string) {
    this.requireNetworkAccess(userId, networkId);
    const user = this.store.users.get(userId);
    if (user?.accountRole === "platform_admin") return;
    const network = this.raw(networkId);
    if (network.status === "trial")
      throw new ForbiddenException(
        "Im 10-Tage-Testzugang ist nur die unverbindliche Ansicht möglich. Zum Speichern, Einladen oder Veröffentlichen muss das Netzwerkportal gebucht und aktiviert werden.",
      );
    if (
      !this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active" &&
          ["network_admin", "moderator"].includes(item.role),
      )
    )
      throw new ForbiddenException(
        "Keine Berechtigung zur Netzwerkverwaltung.",
      );
  }
  private requireNetworkAccess(userId: string, networkId: string) {
    const user = this.store.users.get(userId);
    if (user?.visitorNetworkId && user.visitorNetworkId !== networkId)
      throw new ForbiddenException(
        "Dieser Besucherzugang gilt nur für das zugewiesene Netzwerk.",
      );
    if (user?.accountRole === "platform_admin") return;
    this.get(networkId);
    if (
      !this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active",
      )
    )
      throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");
    const membership = this.store.networkMemberships.find(m => m.userId === userId && m.networkId === networkId && m.status === "active");
    if (membership && !membership.complimentaryAccess && !membership.centrallyFunded && !["visitor", "network_admin"].includes(membership.role) && !this.isNetworkInitiator(userId, networkId)) {
      const latest = [...this.store.networkOrders.values()]
        .filter(o => o.networkId === networkId && o.orderedByUserId === userId && o.kind === "member_annual" && o.status === "accepted")
        .sort((a,b) => (b.serviceEndsAt || "").localeCompare(a.serviceEndsAt || ""))[0];
      if (latest?.serviceEndsAt && Date.parse(latest.serviceEndsAt) <= Date.now())
        throw new ForbiddenException("Deine Mitgliedschaft ist abgelaufen. Deine Rechnungen bleiben in Mein Konto verfügbar.");
    }
  }
  private requireNetworkAdmin(userId: string, networkId: string) {
    if (this.store.users.get(userId)?.accountRole === "platform_admin") return;
    this.requireWritableNetwork(userId, networkId);
    if (
      !this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active" &&
          item.role === "network_admin",
      )
    )
      throw new ForbiddenException(
        "Vermittelte Umsätze sind ausschließlich für berechtigte Netzwerkadministratoren sichtbar.",
      );
  }
  private requireWritableNetwork(userId: string, networkId: string) {
    this.requireNetworkAccess(userId, networkId);
    if (this.store.users.get(userId)?.visitorNetworkId)
      throw new ForbiddenException(
        "Besucherzugang: Dieses Netzwerk ist nur lesbar.",
      );
    if (this.store.users.get(userId)?.accountRole === "platform_admin") return;
    if (this.raw(networkId).status === "trial")
      throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");
  }
  private requireEnabledModule(
    networkId: string,
    module: NetworkModule,
    userId?: string,
  ) {
    const network = this.raw(networkId);
    if (network.status !== "active") return;
    if (!network.enabledModules.includes(module))
      throw new ForbiddenException(
        "Dieses Netzwerkmodul wird vom Initiator nicht angeboten.",
      );
    if (userId && !this.userModules(userId, networkId).includes(module))
      throw new ForbiddenException(
        "Dieses Modul ist für Ihren Zugang nicht gebucht.",
      );
  }
  private normalizeOrder(order: NetworkOrderRecord) {
    if (order.kind === "member_annual") return order;
    order.participantCount =
      Number.isInteger(order.participantCount) && order.participantCount > 0
        ? order.participantCount
        : 1;
    order.selectedModules =
      Array.isArray(order.selectedModules) && order.selectedModules.length
        ? order.selectedModules
        : allProductModuleIds();
    order.pricingMode =
      order.pricingMode === "individual" ? "individual" : "complete";
    order.moduleUnitPrices = order.moduleUnitPrices || {};
    order.paymentStatus = order.paymentStatus || "open";
    order.paymentDueAt =
      order.paymentDueAt ||
      new Date(Date.parse(order.submittedAt) + 14 * 86_400_000).toISOString();
    order.paidAt = order.paidAt || null;
    order.serviceStartsAt =
      order.serviceStartsAt || order.decidedAt || order.submittedAt;
    order.serviceEndsAt =
      order.serviceEndsAt ||
      new Date(
        new Date(order.serviceStartsAt).setFullYear(
          new Date(order.serviceStartsAt).getFullYear() + 1,
        ),
      ).toISOString();
    return order;
  }
  private paymentStatus(order: NetworkOrderRecord) {
    return order.paymentStatus === "open" &&
      order.paymentDueAt &&
      Date.parse(order.paymentDueAt) < Date.now()
      ? "overdue"
      : order.paymentStatus || "open";
  }
  private isNetworkManager(userId: string, networkId: string) {
    return (
      this.store.users.get(userId)?.accountRole === "platform_admin" ||
      this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active" &&
          ["network_admin", "moderator"].includes(item.role),
      )
    );
  }
  private isNetworkInitiator(userId: string, networkId: string) {
    return (
      this.store.users.get(userId)?.accountRole === "platform_admin" ||
      this.store.networkMemberships.some(
        (item) =>
          item.userId === userId &&
          item.networkId === networkId &&
          item.status === "active" &&
          item.role === "network_admin",
      )
    );
  }
  private userModules(userId: string, networkId: string) {
    const network = this.raw(networkId);
    if (
      this.store.networkMemberships.some(
        (m) =>
          m.userId === userId &&
          m.networkId === networkId &&
          m.status === "active" &&
          (m.complimentaryAccess || m.centrallyFunded),
      )
    )
      return network.enabledModules;
    if (this.store.users.get(userId)?.visitorNetworkId === networkId)
      return network.enabledModules;
    const annual = [...this.store.networkOrders.values()]
      .filter(
        (o) =>
          o.kind === "member_annual" &&
          o.networkId === networkId &&
          o.orderedByUserId === userId &&
          o.status === "accepted",
      )
      .sort((a, b) =>
        (b.serviceEndsAt || "").localeCompare(a.serviceEndsAt || ""),
      )[0];
    if (annual && !this.isNetworkInitiator(userId, networkId))
      return Date.parse(annual.serviceEndsAt || "") > Date.now()
        ? fullPortalModules()
        : [...NETWORK_INCLUDED_MODULES];
    if (
      this.isNetworkInitiator(userId, networkId) ||
      network.status === "trial" ||
      network.settings.billingMode === "cooperation_free"
    )
      return network.enabledModules;
    const order = [...this.store.networkOrders.values()]
      .filter(
        (item) =>
          item.networkId === networkId &&
          item.orderedByUserId === userId &&
          item.status === "accepted",
      )
      .map((item) => this.normalizeOrder(item))
      .sort((a, b) =>
        (b.decidedAt || b.submittedAt).localeCompare(
          a.decidedAt || a.submittedAt,
        ),
      )[0];
    return order &&
      Date.parse(order.serviceEndsAt || "") > Date.now() &&
      Date.parse(order.serviceStartsAt || "") <= Date.now()
      ? expandNetworkModules(order.selectedModules).filter((module) =>
          network.enabledModules.includes(module),
        )
      : NETWORK_INCLUDED_MODULES.filter((module) =>
          network.enabledModules.includes(module),
        );
  }
  private event(networkId: string, eventId: string) {
    const event = this.store.networkContents.get(eventId);
    if (!event || event.networkId !== networkId || event.type !== "event")
      throw new NotFoundException("Veranstaltung nicht gefunden.");
    return event;
  }
  private member(networkId: string, membershipId: string) {
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.id === membershipId &&
        item.networkId === networkId &&
        item.status === "active",
    );
    if (!membership)
      throw new NotFoundException("Aktives Netzwerkmitglied nicht gefunden.");
    return membership;
  }
  private saveAttendance(
    actorId: string,
    networkId: string,
    eventId: string,
    membershipId: string,
    input: Record<string, unknown>,
    manager: boolean,
  ) {
    const membership = this.member(networkId, membershipId),
      response = String(input.response);
    const requestedCompanions = Number(input.companionCount || 0);
    if (
      !Number.isInteger(requestedCompanions) ||
      requestedCompanions < 0 ||
      requestedCompanions > 20
    )
      throw new BadRequestException("Bitte 0 bis 20 Begleitpersonen angeben.");
    if (!["registered", "declined"].includes(response))
      throw new BadRequestException("Bitte An- oder Abmeldung auswählen.");
    const event = this.event(networkId, eventId);
    if (!manager && response === "registered") {
      if (
        event.status === "draft" ||
        event.status === "archived" ||
        event.status === "completed" ||
        !this.canReadContent(actorId, event)
      )
        throw new ForbiddenException(
          "Diese Veranstaltung ist nicht zur Anmeldung geöffnet.",
        );
      if (
        (event.data.deadline &&
          Date.parse(String(event.data.deadline)) < Date.now()) ||
        (event.startsAt && Date.parse(event.startsAt) < Date.now())
      )
        throw new BadRequestException("Die Anmeldefrist ist abgelaufen.");
      const capacity = Number(event.data.capacity);
      const others = [...this.store.networkAttendances.values()]
        .filter(
          (a) =>
            a.eventId === eventId &&
            a.networkId === networkId &&
            a.membershipId !== membershipId &&
            a.response === "registered",
        )
        .reduce(
          (sum, a) => sum + 1 + a.companionCount + a.guestNames.length,
          0,
        );
      const guests = Array.isArray(input.guestNames)
        ? input.guestNames.map(String).filter(Boolean).length
        : typeof input.guestNames === "string"
          ? input.guestNames.split(/[,\n]/).filter((v) => v.trim()).length
          : 0;
      if (
        capacity > 0 &&
        others + 1 + (Number(input.companionCount) || 0) + guests > capacity
      )
        throw new BadRequestException("Die Veranstaltung ist ausgebucht.");
    }
    const attendance =
        manager &&
        ["pending", "present", "absent"].includes(String(input.attendance))
          ? (String(input.attendance) as NetworkAttendanceRecord["attendance"])
          : "pending",
      guestNames = Array.isArray(input.guestNames)
        ? input.guestNames
            .map(String)
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 20)
        : typeof input.guestNames === "string"
          ? input.guestNames
              .split(/\r?\n|,/)
              .map((value) => value.trim())
              .filter(Boolean)
              .slice(0, 20)
          : [],
      companionCount = Math.max(
        0,
        Math.min(20, Number(input.companionCount) || 0),
      ),
      now = new Date().toISOString(),
      existing = [...this.store.networkAttendances.values()].find(
        (item) =>
          item.eventId === eventId && item.membershipId === membershipId,
      );
    const record: NetworkAttendanceRecord = existing ?? {
      id: randomUUID(),
      networkId,
      eventId,
      membershipId,
      userId: membership.userId,
      response: "registered",
      attendance: "pending",
      guestNames: [],
      companionCount: 0,
      note: null,
      updatedByUserId: actorId,
      createdAt: now,
      updatedAt: now,
    };
    record.response = response as NetworkAttendanceRecord["response"];
    record.attendance = attendance;
    record.guestNames = guestNames;
    record.companionCount = companionCount;
    record.note = this.note(input.note);
    record.updatedByUserId = actorId;
    record.updatedAt = now;
    this.store.networkAttendances.set(record.id, record);
    return this.attendanceView(record);
  }
  private attendanceView(record: NetworkAttendanceRecord) {
    const membership = this.member(record.networkId, record.membershipId),
      user = this.store.users.get(membership.userId),
      organization = this.store.organizations.get(membership.organizationId);
    return {
      ...record,
      memberUserId: membership.userId,
      memberName: user
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Mitglied",
      organizationName:
        organization?.displayName || organization?.legalName || "Unternehmen",
    };
  }
  private eventAttendanceSummary(networkId: string, eventId: string) {
    const registrations = [...this.store.networkAttendances.values()].filter(
      (item) =>
        item.networkId === networkId &&
        item.eventId === eventId &&
        item.response === "registered",
    );
    return {
      registrations: registrations.length,
      persons: registrations.reduce(
        (sum, item) => sum + 1 + item.companionCount + item.guestNames.length,
        0,
      ),
    };
  }
  private proBGame(gameId: string, networkId: string) {
    const games =
      this.raw(networkId).slug === "bayer04leverkusen"
        ? bundesligaSnapshot().games
        : PROB_GAMES;
    const game = games.find((item) => item.id === gameId);
    if (!game) throw new NotFoundException("Spiel nicht gefunden.");
    return game;
  }
  private requireGiantsNetwork(networkId: string) {
    if (
      !["bayer-giants", "bayer04leverkusen"].includes(this.raw(networkId).slug)
    )
      throw new NotFoundException(
        "Der Spielplan ist für dieses Netzwerk nicht verfügbar.",
      );
  }
  private proBRecord(
    networkId: string,
    game: ProBGame,
    create: boolean,
    creatorId?: string,
  ) {
    const football = this.raw(networkId).slug === "bayer04leverkusen";
    const teamName = football ? "Bayer 04 Leverkusen" : "Bayer Giants";
    let record = [...this.store.networkContents.values()].find(
      (item) =>
        item.networkId === networkId &&
        item.type === "event" &&
        item.data.kind === (football ? "bundesliga_game" : "prob_game") &&
        item.data.gameId === game.id,
    );
    if (!record && create) {
      const now = new Date().toISOString();
      record = {
        id: randomUUID(),
        networkId,
        type: "event",
        title: game.home
          ? `${teamName} vs. ${game.opponent}`
          : `${game.opponent} vs. ${teamName}`,
        description: `${football ? "Fußball-Bundesliga" : "BARMER 2. Basketball Bundesliga ProB"} · ${game.matchday}. Spieltag`,
        status: "published",
        createdByUserId: creatorId || "system",
        assignedToUserId: null,
        startsAt:
          "kickoffConfirmed" in game && game.kickoffConfirmed === false
            ? null
            : new Date(game.startsAt).toISOString(),
        endsAt: null,
        visibility: "members",
        data: {
          kind: football ? "bundesliga_game" : "prob_game",
          gameId: game.id,
          discussionOpen: football,
          discussionPrompt: "",
          comments: [],
        },
        createdAt: now,
        updatedAt: now,
      };
      this.store.networkContents.set(record.id, record);
    }
    return record;
  }
  private proBGameView(networkId: string, game: ProBGame) {
    const football = this.raw(networkId).slug === "bayer04leverkusen";
    const teamName = football ? "Bayer 04 Leverkusen" : "Bayer Giants";
    const record = this.proBRecord(networkId, game, false),
      number = (value: unknown, fallback: number | null) =>
        value === null ? null : typeof value === "number" ? value : fallback,
      giantsScore = number(record?.data.giantsScore, game.officialGiantsScore),
      opponentScore = number(
        record?.data.opponentScore,
        game.officialOpponentScore,
      ),
      comments = Array.isArray(record?.data.comments)
        ? record!.data.comments
        : [];
    return {
      ...game,
      season: football ? BUNDESLIGA_SEASON : PROB_SEASON,
      homeTeam: game.home ? teamName : game.opponent,
      awayTeam: game.home ? game.opponent : teamName,
      giantsScore,
      opponentScore,
      homeScore: game.home ? giantsScore : opponentScore,
      awayScore: game.home ? opponentScore : giantsScore,
      discussionOpen: record ? record.data.discussionOpen === true : football,
      discussionPrompt:
        typeof record?.data.discussionPrompt === "string"
          ? record.data.discussionPrompt
          : "",
      comments,
    };
  }
  private revenueView(record: NetworkRevenueRecord) {
    const referring = this.member(
        record.networkId,
        record.referringMembershipId,
      ),
      beneficiary = this.member(
        record.networkId,
        record.beneficiaryMembershipId,
      ),
      name = (membership: NetworkMembershipRecord) => {
        const organization = this.store.organizations.get(
            membership.organizationId,
          ),
          user = this.store.users.get(membership.userId);
        return {
          membershipId: membership.id,
          organizationName:
            organization?.displayName ||
            organization?.legalName ||
            "Unternehmen",
          contactName: user
            ? `${user.firstName} ${user.lastName}`.trim()
            : "Mitglied",
        };
      };
    return {
      ...record,
      referring: name(referring),
      beneficiary: name(beneficiary),
    };
  }
  private money(value: unknown) {
    const normalized =
        typeof value === "string"
          ? value.replace(/\./g, "").replace(",", ".")
          : value,
      amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < 0)
      throw new BadRequestException(
        "Bitte einen gültigen Umsatzbetrag eingeben.",
      );
    return Math.round(amount * 100);
  }
  private dateOnly(value: unknown, label: string) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException(`${label} fehlt oder ist ungültig.`);
    return value;
  }
  private revenueStatus(value: unknown): NetworkRevenueRecord["status"] {
    const status = String(value || "recorded");
    if (!["recorded", "confirmed", "paid", "cancelled"].includes(status))
      throw new BadRequestException("Ungültiger Umsatzstatus.");
    return status as NetworkRevenueRecord["status"];
  }
  private note(value: unknown) {
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, 1000)
      : null;
  }
  private requireContentCreation(
    userId: string,
    networkId: string,
    type: NetworkContentType,
  ) {
    this.requireNetworkAccess(userId, networkId);
    if (type === "event") this.requireNetworkInitiator(userId, networkId);
    const user = this.store.users.get(userId);
    if (user?.accountRole === "platform_admin") return;
    const network = this.raw(networkId);
    if (network.status === "trial")
      throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.userId === userId &&
        item.networkId === networkId &&
        item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");
    if (["network_admin", "moderator"].includes(membership.role)) return;
    if (
      ![
        "conversation",
        "service",
        "topic",
        "poll",
        "task",
        "document",
        "event",
      ].includes(type)
    )
      throw new ForbiddenException(
        "Dieser Inhalt kann nur durch die Netzwerkverwaltung angelegt werden.",
      );
  }
  private requireContentUpdate(
    userId: string,
    networkId: string,
    record: NetworkContentRecord,
  ) {
    this.requireNetworkAccess(userId, networkId);
    if (record.type === "event") this.requireNetworkInitiator(userId, networkId);
    const user = this.store.users.get(userId);
    if (
      user?.accountRole === "platform_admin" &&
      record.type !== "conversation"
    )
      return;
    const network = this.raw(networkId);
    if (network.status === "trial")
      throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");
    const membership = this.store.networkMemberships.find(
      (item) =>
        item.userId === userId &&
        item.networkId === networkId &&
        item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");
    if (record.type === "conversation" && record.createdByUserId !== userId)
      throw new ForbiddenException(
        "Nur der Gesprächsersteller darf die Gesprächsdaten ändern.",
      );
    if (!this.canReadContent(userId, record))
      throw new ForbiddenException("Kein Zugriff auf diesen Inhalt.");
    if (
      record.createdByUserId !== userId &&
      !["network_admin", "moderator"].includes(membership.role)
    )
      throw new ForbiddenException("Sie dürfen nur eigene Inhalte bearbeiten.");
  }
  private ensureModule(network: NetworkRecord, type?: string, userId?: string) {
    if (!type) return;
    const moduleByType: Partial<Record<NetworkContentType, NetworkModule>> = {
      event: "events",
      topic: "community",
      announcement: "community",
      poll: "community",
      task: "tasks",
      document: "documents",
      conversation: "communication",
      need: "matching",
      service: "services",
    };
    const module = moduleByType[type as NetworkContentType];
    if (module) this.requireEnabledModule(network.id, module, userId);
  }
  private optionalDate(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException("Ungültiges Datum.");
    return date.toISOString();
  }
  private publicUser(userId: string) {
    const user = this.store.users.get(userId);
    return user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }
      : null;
  }
}
import { removeNetworkUser } from "./remove-network-user";
