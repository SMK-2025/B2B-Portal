import { decodePublicImage } from "./homepage-media";
import { assertContract } from "./contracts/validate";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  NotFoundException,
  ForbiddenException,
  Param,
  Post,
  Req,
  Res,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import {
  homepageFields,
  projectHomepage,
  type HomepageGrant,
} from "./homepage-publication";
import { randomUUID } from "node:crypto";
type Kind = keyof typeof homepageFields;
@Controller("networks/homepage")
export class HomepagePublicationController {
  private requests = new Map<string, { count: number; until: number }>();
  constructor(
    @Inject(PortalStore) private readonly store: PortalStore,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  private network(slug: string, allowInactive = false) {
    if (!this.store.homepageReadsSafe())
      throw new ServiceUnavailableException(
        "Öffentliche Inhalte sind vorübergehend nicht verfügbar.",
      );
    if (slug !== "unternehmerfreunde") throw new NotFoundException();
    const id = this.store.networkBySlug.get(slug),
      network = id ? this.store.networks.get(id) : null;
    if (!network || (!allowInactive && network.status !== "active"))
      throw new NotFoundException();
    return network;
  }
  private manager(auth: string | undefined, networkId: string) {
    const user = this.auth.authenticate(auth);
    if (
      user.accountRole !== "platform_admin" &&
      !this.store.networkMemberships.some(
        (m) =>
          m.networkId === networkId &&
          m.userId === user.id &&
          m.status === "active" &&
          m.role === "network_admin",
      )
    )
      throw new ForbiddenException(
        "Nur die Netzwerkleitung verwaltet öffentliche Freigaben.",
      );
    return user;
  }

  private owned(slug: string, id: string, authorization: string | undefined) {
    const network = this.network(slug, true),
      user = this.auth.authenticate(authorization);
    const member = this.store.networkMemberships.find(
      (m) => m.id === id && m.networkId === network.id && m.userId === user.id,
    );
    if (!member) throw new NotFoundException();
    return { network, user, member };
  }
  private consentGrant(
    body: Record<string, unknown>,
    userId: string,
    membershipId: string,
  ): HomepageGrant {
    if (typeof body.enabled !== "boolean")
      throw new BadRequestException("Explizite Zustimmung erforderlich.");
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (
      fields.some(
        (f) =>
          typeof f !== "string" ||
          !(homepageFields.members as readonly string[]).includes(f),
      )
    )
      throw new BadRequestException("Nicht erlaubtes Profilfeld.");
    if (
      body.enabled &&
      (body.rightsConfirmed !== true ||
        !fields.includes("title") ||
        !fields.includes("description"))
    )
      throw new BadRequestException(
        "Titel, Beschreibung und Veröffentlichungsrechte bestätigen.",
      );
    return {
      enabled: body.enabled,
      fields: [...new Set(fields as string[])],
      rightsConfirmed: body.rightsConfirmed === true,
      approvedBy: userId,
      consentUserId: userId,
      consentMembershipId: membershipId,
      updatedAt: new Date().toISOString(),
    };
  }
  @Get(":slug/my-profiles")
  @Header("Cache-Control", "no-store")
  myProfiles(
    @Param("slug") slug: string,
    @Headers("authorization") authorization: string | undefined,
  ) {
    const network = this.network(slug, true),
      user = this.auth.authenticate(authorization);
    return this.store.networkMemberships
      .filter((m) => m.networkId === network.id && m.userId === user.id)
      .map((m) => ({
        id: m.id,
        hidden: m.homepageHidden === true,
        grant:
          m.homepageGrants?.members?.consentUserId === user.id &&
          m.homepageGrants.members.consentMembershipId === m.id
            ? m.homepageGrants.members
            : { enabled: false, fields: [], rightsConfirmed: false },
        preview: projectHomepage(
          "members",
          m,
          this.store.organizations.get(m.organizationId)?.networkProfile,
        ),
      }));
  }
  @Post(":slug/members/:id/preview")
  @Header("Cache-Control", "no-store")
  previewProfile(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const { user, member } = this.owned(slug, id, authorization);
    const grant = this.consentGrant(
      { ...body, enabled: true, rightsConfirmed: true },
      user.id,
      member.id,
    );
    const profile = this.store.organizations.get(
      member.organizationId,
    )?.networkProfile;
    const preview = projectHomepage(
      "members",
      { ...member, homepageHidden: false, homepageGrants: { members: grant } },
      profile,
    );
    if (
      preview &&
      grant.fields.includes("image") &&
      decodePublicImage(profile?.logoUrl)
    )
      preview.image = profile!.logoUrl;
    return { preview, hidden: member.homepageHidden === true };
  }
  @Post(":slug/members/:id/consent")
  @Header("Cache-Control", "no-store")
  consentProfile(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const { network, user, member } = this.owned(slug, id, authorization);
    const grant = this.consentGrant(body, user.id, member.id);
    if (
      grant.enabled &&
      (network.status !== "active" ||
        !projectHomepage(
          "members",
          {
            ...member,
            homepageHidden: false,
            homepageGrants: { members: grant },
          },
          this.store.organizations.get(member.organizationId)?.networkProfile,
        ))
    )
      throw new BadRequestException(
        "Aktives Mitglied und veröffentlichtes Profil erforderlich.",
      );
    member.homepageGrants = { ...member.homepageGrants, members: grant };
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: user.id,
      type: grant.enabled
        ? "homepage.member.consented"
        : "homepage.member.revoked",
      visibility: "platform_internal",
      data: { networkId: network.id, recordId: id, fields: grant.fields },
      createdAt: grant.updatedAt,
    });
    return { enabled: grant.enabled, hidden: member.homepageHidden === true };
  }
  @Post(":slug/members/:id/moderation")
  @Header("Cache-Control", "no-store")
  moderateProfile(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const network = this.network(slug),
      user = this.manager(authorization, network.id);
    const member = this.store.networkMemberships.find(
      (m) => m.id === id && m.networkId === network.id,
    );
    if (!member) throw new NotFoundException();
    if (
      typeof body.hidden !== "boolean" ||
      Object.keys(body).some((k) => k !== "hidden")
    )
      throw new BadRequestException("Nur Ausblendung ändern.");
    member.homepageHidden = body.hidden;
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: user.id,
      type: "homepage.member.moderated",
      visibility: "platform_internal",
      data: { networkId: network.id, recordId: id, hidden: body.hidden },
      createdAt: new Date().toISOString(),
    });
    return { hidden: member.homepageHidden };
  }

  @Get(":slug/:kind/:id/media/:field")
  @Header("Cache-Control", "no-store, max-age=0")
  @Header("CDN-Cache-Control", "no-store")
  @Header("X-Content-Type-Options", "nosniff")
  media(
    @Param("slug") slug: string,
    @Param("kind") kind: Kind,
    @Param("id") id: string,
    @Param("field") field: string,
    @Res() response: any,
  ) {
    const network = this.network(slug);
    if (!Object.hasOwn(homepageFields, kind)) throw new NotFoundException();
    const record = this.records(network.id, kind).find((r) => r.id === id);
    if (!record) throw new NotFoundException();
    const profile =
      "organizationId" in record
        ? this.store.organizations.get(record.organizationId)?.networkProfile
        : null;
    const projected = projectHomepage(kind, record, profile);
    const index = /^images-([0-5])$/.exec(field);
    if (
      !projected ||
      !(
        (field === "image" && projected.image) ||
        (index &&
          Array.isArray(projected.images) &&
          (projected.images as string[]).some((url) =>
            url.endsWith("/" + field),
          ))
      )
    )
      throw new NotFoundException();
    const source =
      kind === "members"
        ? profile?.logoUrl
        : "data" in record
          ? index
            ? (record.data.recapImages as unknown[])?.[Number(index[1])]
            : record.data.imageUrl
          : null;
    const media = decodePublicImage(source);
    if (!media) throw new NotFoundException();
    response
      .type(media.type)
      .set("Content-Length", String(media.bytes.length))
      .send(media.bytes);
  }

  private records(networkId: string, kind: Kind) {
    return kind === "members"
      ? this.store.networkMemberships.filter((m) => m.networkId === networkId)
      : [...this.store.networkContents.values()].filter(
          (c) => c.networkId === networkId && c.type === "event",
        );
  }
  @Get(":slug/feed")
  @Header("Cache-Control", "no-store, max-age=0")
  @Header("CDN-Cache-Control", "no-store")
  @Header("X-Content-Type-Options", "nosniff")
  feed(@Param("slug") slug: string, @Req() req: { ip?: string }) {
    const now = Date.now();
    for (const [ip, bucket] of this.requests)
      if (bucket.until < now) this.requests.delete(ip);
    const ip = req.ip || "unknown",
      bucket = this.requests.get(ip) || { count: 0, until: now + 60000 };
    if (
      (this.requests.size >= 10000 && !this.requests.has(ip)) ||
      ++bucket.count > 120
    )
      throw new HttpException("Zu viele Anfragen.", 429);
    this.requests.set(ip, bucket);
    const network = this.network(slug);
    const list = (kind: Kind) =>
      this.records(network.id, kind)
        .map((record) =>
          projectHomepage(
            kind,
            record,
            "organizationId" in record
              ? this.store.organizations.get(record.organizationId)
                  ?.networkProfile
              : null,
          ),
        )
        .filter(Boolean);
    const feed = {
      version: 1,
      network: slug,
      generatedAt: new Date().toISOString(),
      members: list("members"),
      events: list("events"),
      recaps: list("recaps"),
    };
    assertContract(feed);
    return feed;
  }
  @Get(":slug/manage")
  @Header("Cache-Control", "no-store")
  manage(
    @Param("slug") slug: string,
    @Headers("authorization") authorization: string | undefined,
  ) {
    const network = this.network(slug);
    this.manager(authorization, network.id);
    return Object.fromEntries(
      (Object.keys(homepageFields) as Kind[]).map((kind) => [
        kind,
        this.records(network.id, kind).map((record) => ({
          id: record.id,
          hidden: "homepageHidden" in record && record.homepageHidden === true,
          title:
            "organizationId" in record
              ? this.store.organizations.get(record.organizationId)?.displayName
              : record.title,
          grant: record.homepageGrants?.[kind] || {
            enabled: false,
            fields: [],
            rightsConfirmed: false,
          },
          preview: projectHomepage(
            kind,
            record,
            "organizationId" in record
              ? this.store.organizations.get(record.organizationId)
                  ?.networkProfile
              : null,
          ),
        })),
      ]),
    );
  }
  @Post(":slug/:kind/:id")
  @Header("Cache-Control", "no-store")
  update(
    @Param("slug") slug: string,
    @Param("kind") kind: Kind,
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const network = this.network(slug),
      user = this.manager(authorization, network.id);
    if (kind === "members")
      throw new ForbiddenException(
        "Profilzustimmung verwaltet ausschließlich das Mitglied.",
      );
    if (!Object.hasOwn(homepageFields, kind))
      throw new BadRequestException("Unbekannter Inhaltstyp.");
    const record = this.records(network.id, kind).find((r) => r.id === id);
    if (!record) throw new NotFoundException();
    if (typeof body.enabled !== "boolean")
      throw new BadRequestException("Explizite Freigabe erforderlich.");
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (
      fields.some(
        (f) =>
          typeof f !== "string" ||
          !(homepageFields[kind] as readonly string[]).includes(f),
      )
    )
      throw new BadRequestException("Nicht erlaubtes öffentliches Feld.");
    if (
      body.enabled &&
      (body.rightsConfirmed !== true ||
        !fields.includes("title") ||
        !fields.includes("description"))
    )
      throw new BadRequestException(
        "Veröffentlichungsrechte sowie Titel und Beschreibung müssen bestätigt sein.",
      );
    const grant: HomepageGrant = {
      enabled: body.enabled,
      fields: [...new Set(fields as string[])],
      rightsConfirmed: body.rightsConfirmed === true,
      updatedAt: new Date().toISOString(),
      approvedBy: user.id,
    };
    const candidate = {
      ...record,
      homepageGrants: { ...record.homepageGrants, [kind]: grant },
    };
    if (
      body.enabled &&
      !projectHomepage(
        kind,
        candidate,
        "organizationId" in record
          ? this.store.organizations.get(record.organizationId)?.networkProfile
          : null,
      )
    )
      throw new BadRequestException(
        "Inhalt unvollständig oder intern: Veranstaltung benötigt Bild, Beginn, Ort, Veranstalter, Bedingungen und Kosten. Profil muss aktiv und im Portal veröffentlicht sein.",
      );
    record.homepageGrants = candidate.homepageGrants;
    this.store.activities.push({
      id: randomUUID(),
      matchId: null,
      organizationId: null,
      actorUserId: user.id,
      type: body.enabled
        ? "homepage.publication.approved"
        : "homepage.publication.revoked",
      visibility: "platform_internal",
      data: { networkId: network.id, kind, recordId: id, fields: grant.fields },
      createdAt: grant.updatedAt,
    });
    return { enabled: grant.enabled, updatedAt: grant.updatedAt };
  }
}
