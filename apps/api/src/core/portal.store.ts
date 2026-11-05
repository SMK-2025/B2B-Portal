import {
  Injectable,
  Logger,
  ConflictException,
  ServiceUnavailableException,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ActivityRecord,
  CategoryRecord,
  ConversationRecord,
  MatchRecord,
  MeetingRecord,
  MembershipRecord,
  MessageRecord,
  NeedRecord,
  NetworkRecord,
  NetworkConnectionRecord,
  OperatorMailRecord,
  MaintenanceReceipt,
  NetworkSystemMessageRecord,
  NetworkMembershipRecord,
  NetworkContentRecord,
  NetworkOrderRecord,
  NetworkAttendanceRecord,
  NetworkRevenueRecord,
  NotificationRecord,
  OrganizationRecord,
  PasswordResetRecord,
  ReviewDecisionRecord,
  ServicePageRecord,
  SessionRecord,
  UserRecord,
  VerificationRecord,
  TeamInvitationRecord,
  FavoriteRecord,
  UserPreferenceRecord,
} from "./domain";
import {
  retireLegacyInitiator,
  resetTestMember,
} from "./retire-legacy-initiator";
import type { MailingCampaign, MailingLead } from "../mailings/mailing.types";
import { provisionKoeln } from "./provision-koeln";
import {
  configureKoelnLaunch,
  disableAutomaticRenewals,
} from "../networks/launch-promotion";
import { createHash } from "node:crypto";
import { RecordPersistence, StoreCollections, StorageSql } from "./record-persistence";
type LaunchPlace = {
  campaign: string;
  network_id: string;
  user_id: string;
  company_hash: string;
  slot: number;
  starts_on: string;
};

@Injectable()
export class PortalStore implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PortalStore.name);
  private sql: import("postgres").Sql | null = null;
  private homepagePersistenceFailed = false;
  private pendingPersistenceWrites = 0;
  homepageReadsSafe(): boolean {
    return (
      !this.homepagePersistenceFailed && this.pendingPersistenceWrites === 0
    );
  }
  private writeQueue: Promise<void> = Promise.resolve();
  private flush: Promise<void> | null = null;
  private requestedWrite = 0;
  private completedWrite = 0;
  private revision = 0;
  private staleWriter = false;
  private recordStorage = false;
  private readonly records = new RecordPersistence();
  persistenceReady(): boolean {
    return !this.homepagePersistenceFailed && !this.staleWriter;
  }
  private launchPlaces: LaunchPlace[] = [];
  launchUsed(networkId: string) {
    return this.launchPlaces.filter((p) => p.network_id === networkId).length;
  }
  launchReserved(networkId: string, userId: string) {
    return this.launchPlaces.some(
      (p) => p.network_id === networkId && p.user_id === userId,
    );
  }
  async refreshLaunchPlaces() {
    if (this.sql)
      this.launchPlaces = (await this.sql.unsafe(
        "SELECT campaign,network_id,user_id,company_hash,slot,starts_on FROM b2b_launch_places",
      )) as typeof this.launchPlaces;
  }
  async claimLaunchPlace(networkId: string, userId: string, company: string) {
    const promotion = this.networks.get(networkId)?.settings.launchPromotion;
    if (!promotion?.enabled)
      throw new ConflictException("Die Startaktion ist nicht mehr aktiv.");
    const companyHash = createHash("sha256")
      .update(
        company
          .normalize("NFKC")
          .toLocaleLowerCase("de-DE")
          .replace(/[^\p{L}\p{N}]/gu, ""),
      )
      .digest("hex");
    const startsOn = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const reserve = (places: LaunchPlace[]) => {
      const old = places.find(
        (p) => p.user_id === userId || p.company_hash === companyHash,
      );
      if (old) {
        if (old.user_id !== userId || old.company_hash !== companyHash)
          throw new ConflictException(
            "Dieses Unternehmen hat bereits einen Startplatz. Bitte den Betreiber kontaktieren.",
          );
        return old;
      }
      if (places.length >= promotion.limit)
        throw new ConflictException(
          "Die kostenlosen Startplätze sind vergeben. Bitte lade die Konditionen erneut. Es wurde keine kostenpflichtige Buchung ausgelöst.",
        );
      return {
        campaign: promotion.id,
        network_id: networkId,
        user_id: userId,
        company_hash: companyHash,
        slot: places.length + 1,
        starts_on: startsOn,
      };
    };
    if (!this.sql) {
      if (process.env.NODE_ENV === "production")
        throw new ServiceUnavailableException(
          "Die Platzvergabe ist momentan nicht verfügbar.",
        );
      const p = reserve(
        this.launchPlaces.filter((p) => p.network_id === networkId),
      );
      if (!this.launchPlaces.includes(p)) this.launchPlaces.push(p);
      return {
        slot: p.slot,
        startsOn: p.starts_on,
        campaignId: promotion.id,
        freeMonths: promotion.freeMonths,
        limit: promotion.limit,
      };
    }
    const p = await this.sql.begin(async (tx) => {
      await tx.unsafe("SELECT pg_advisory_xact_lock(6620100)");
      const persisted = await tx.unsafe(
        "SELECT entry.value->1->'settings' AS settings FROM portal_state p CROSS JOIN LATERAL jsonb_array_elements((CASE WHEN jsonb_typeof(p.payload)='string' THEN (p.payload #>> '{}')::jsonb ELSE p.payload END)->'networks') AS entry(value) WHERE p.id='primary' AND entry.value->>0=$1",
        [networkId],
      );
      const rawSettings = (persisted as { settings: NetworkRecord["settings"] | string }[])[0]?.settings;
      const settings: NetworkRecord["settings"] | undefined = typeof rawSettings === "string" ? JSON.parse(rawSettings) : rawSettings;
      const live = settings?.launchPromotion;
      if (
        !live?.enabled ||
        live.id !== promotion.id ||
        live.limit !== promotion.limit ||
        live.freeMonths !== promotion.freeMonths ||
        !settings?.memberBilling ||
        settings.memberPaymentModel === "network" ||
        settings.billingMode === "cooperation_free" ||
        settings.memberBilling.freeUntil ||
        settings.memberBilling.paidFrom ||
        settings.memberBilling.paidThrough
      )
        throw new ConflictException(
          "Die Startaktion wurde geändert. Bitte lade die aktuellen Konditionen erneut.",
        );
      const places = (await tx.unsafe(
        "SELECT campaign,network_id,user_id,company_hash,slot,starts_on FROM b2b_launch_places WHERE network_id=$1",
        [networkId],
      )) as LaunchPlace[];
      const p = reserve(places);
      if (!places.includes(p))
        await tx.unsafe(
          "INSERT INTO b2b_launch_places(campaign,network_id,slot,user_id,company_hash,starts_on) VALUES($1,$2,$3,$4,$5,$6)",
          [promotion.id, networkId, p.slot, userId, companyHash, p.starts_on],
        );
      return p;
    });
    await this.refreshLaunchPlaces();
    return {
      slot: p.slot,
      startsOn: p.starts_on,
      campaignId: promotion.id,
      freeMonths: promotion.freeMonths,
      limit: promotion.limit,
    };
  }
  readonly users = new Map<string, UserRecord>();
  readonly mailingLeads = new Map<string, MailingLead>();
  readonly mailingCampaigns = new Map<string, MailingCampaign>();
  readonly mailingSuppressions = new Map<
    string,
    { at: string; reason: string }
  >();
  readonly userByEmail = new Map<string, string>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly memberships: MembershipRecord[] = [];
  readonly teamInvitations = new Map<string, TeamInvitationRecord>();
  readonly favorites = new Map<string, FavoriteRecord>();
  readonly userPreferences = new Map<string, UserPreferenceRecord>();
  readonly networks = new Map<string, NetworkRecord>();
  readonly networkConnections = new Map<string, NetworkConnectionRecord>();
  readonly operatorMails = new Map<string, OperatorMailRecord>();
  readonly maintenanceReceipts = new Map<string, MaintenanceReceipt>();
  readonly networkSystemMessages = new Map<
    string,
    NetworkSystemMessageRecord
  >();
  readonly networkBySlug = new Map<string, string>();
  readonly networkMemberships: NetworkMembershipRecord[] = [];
  readonly networkContents = new Map<string, NetworkContentRecord>();
  readonly networkOrders = new Map<string, NetworkOrderRecord>();
  readonly networkAttendances = new Map<string, NetworkAttendanceRecord>();
  readonly networkRevenues = new Map<string, NetworkRevenueRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly verificationTokens = new Map<string, VerificationRecord>();
  readonly passwordResetTokens = new Map<string, PasswordResetRecord>();
  readonly reviewDecisions: ReviewDecisionRecord[] = [];
  readonly categories = new Map<string, CategoryRecord>();
  readonly servicePages = new Map<string, ServicePageRecord>();
  readonly needs = new Map<string, NeedRecord>();
  readonly matches = new Map<string, MatchRecord>();
  readonly conversations = new Map<string, ConversationRecord>();
  readonly messages: MessageRecord[] = [];
  readonly meetings = new Map<string, MeetingRecord>();
  readonly activities: ActivityRecord[] = [];
  readonly notifications: NotificationRecord[] = [];

  constructor() {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "DATABASE_URL fehlt. Die produktive API wird zum Schutz vor Datenverlust nicht gestartet.",
        );
      }
      this.logger.warn(
        "DATABASE_URL fehlt; der PortalStore läuft nur in der lokalen Entwicklungsumgebung im Arbeitsspeicher.",
      );
      return;
    }
    const { default: postgres } = await import("postgres");
    this.sql = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    await this.runMigrations();
    this.recordStorage = true;
    await this.restore();
    await this.refreshLaunchPlaces();
    if (process.env.NODE_ENV === "production" && provisionKoeln(this)) {
      await this.persist();
    }
    if (process.env.NODE_ENV === "production" && configureKoelnLaunch(this))
      await this.persist();
    const billingUpdate = "bayer04-season-january-2027-v1";
    if (!this.maintenanceReceipts.has(billingUpdate)) {
      const network = [...this.networks.values()].find(
        (n) => n.slug === "bayer04leverkusen",
      );
      if (network) {
        network.settings.memberBilling = {
          ...network.settings.memberBilling,
          months: 6,
          freeUntil: "2026-12-31",
          paidFrom: "2027-01-01",
          paidThrough: "2027-06-30",
          autoRenew: true,
          renewalMonths: 12,
          automaticInvoices: true,
          version: billingUpdate,
        };
        network.updatedAt = new Date().toISOString();
        this.maintenanceReceipts.set(billingUpdate, {
          state: "applied",
          completedAt: network.updatedAt,
        });
        await this.persist();
      }
    }
    if(process.env.NODE_ENV==="production" && disableAutomaticRenewals(this)) await this.persist();
    if (process.env.NODE_ENV === "production") {
      const before = this.snapshot();
      retireLegacyInitiator(this);
      resetTestMember(this);
      if (before !== this.snapshot()) await this.persist();
    }
    this.logger.log("PostgreSQL-Persistenz ist aktiv.");
  }

  async onApplicationShutdown(): Promise<void> {
    await this.writeQueue;
    await this.sql?.end({ timeout: 5 });
  }

  snapshot(): string {
    return JSON.stringify({
      users: [...this.users],
      mailingLeads: [...this.mailingLeads],
      mailingCampaigns: [...this.mailingCampaigns],
      mailingSuppressions: [...this.mailingSuppressions],
      userByEmail: [...this.userByEmail],
      organizations: [...this.organizations],
      memberships: this.memberships,
      teamInvitations: [...this.teamInvitations],
      favorites: [...this.favorites],
      userPreferences: [...this.userPreferences],
      networks: [...this.networks],
      networkConnections: [...this.networkConnections],
      operatorMails: [...this.operatorMails],
      maintenanceReceipts: [...this.maintenanceReceipts],
      networkSystemMessages: [...this.networkSystemMessages],
      networkBySlug: [...this.networkBySlug],
      networkMemberships: this.networkMemberships,
      networkContents: [...this.networkContents],
      networkOrders: [...this.networkOrders],
      networkAttendances: [...this.networkAttendances],
      networkRevenues: [...this.networkRevenues],
      sessions: [...this.sessions],
      verificationTokens: [...this.verificationTokens],
      passwordResetTokens: [...this.passwordResetTokens],
      reviewDecisions: this.reviewDecisions,
      categories: [...this.categories],
      servicePages: [...this.servicePages],
      needs: [...this.needs],
      matches: [...this.matches],
      conversations: [...this.conversations],
      messages: this.messages,
      meetings: [...this.meetings],
      activities: this.activities,
      notifications: this.notifications,
    });
  }

  private collections(): StoreCollections {
    return {
      users:this.users, mailingLeads:this.mailingLeads, mailingCampaigns:this.mailingCampaigns,
      mailingSuppressions:this.mailingSuppressions, userByEmail:this.userByEmail,
      organizations:this.organizations, memberships:this.memberships, teamInvitations:this.teamInvitations,
      favorites:this.favorites, userPreferences:this.userPreferences, networks:this.networks,
      networkConnections:this.networkConnections, operatorMails:this.operatorMails,
      maintenanceReceipts:this.maintenanceReceipts, networkSystemMessages:this.networkSystemMessages,
      networkBySlug:this.networkBySlug, networkMemberships:this.networkMemberships,
      networkContents:this.networkContents, networkOrders:this.networkOrders, networkAttendances:this.networkAttendances,
      networkRevenues:this.networkRevenues, sessions:this.sessions, verificationTokens:this.verificationTokens,
      passwordResetTokens:this.passwordResetTokens, reviewDecisions:this.reviewDecisions, categories:this.categories,
      servicePages:this.servicePages, needs:this.needs, matches:this.matches, conversations:this.conversations,
      messages:this.messages, meetings:this.meetings, activities:this.activities, notifications:this.notifications,
    };
  }
  fingerprint(): string {
    return this.recordStorage ? this.records.fingerprint(this.collections()) : this.snapshot();
  }

  async persist(): Promise<void> {
    if (!this.sql) return;
    if (this.staleWriter)
      throw new ServiceUnavailableException("Der Datenstand wurde parallel geändert. Bitte später erneut versuchen.");
    this.pendingPersistenceWrites++;
    this.requestedWrite++;
    if (!this.flush) {
      this.flush = Promise.resolve().then(() => this.flushWrites());
      // Shutdown waits for the latest batch, but one failed batch must not
      // poison the queue permanently. Its callers still receive the failure.
      this.writeQueue = this.flush.catch(() => {});
    }
    return this.flush
      .finally(() => {
        this.pendingPersistenceWrites--;
      });
  }
  private async flushWrites(): Promise<void> {
    try {
      while (this.completedWrite < this.requestedWrite) {
        const target = this.requestedWrite;
        if (this.recordStorage) {
          try {
            this.revision = await this.records.save(this.sql as unknown as StorageSql, this.revision, this.collections());
          } catch(error) {
            if (error instanceof ServiceUnavailableException) this.staleWriter=true;
            throw error;
          }
          this.completedWrite=target;
          continue;
        }
        const payload = this.snapshot();
        const rows = await this.sql!.unsafe(
          `INSERT INTO portal_state (id,payload,revision,updated_at)
           VALUES ('primary',$1::jsonb,1,now())
           ON CONFLICT (id) DO UPDATE SET
             payload=EXCLUDED.payload,
             revision=portal_state.revision+1,
             updated_at=now()
           WHERE portal_state.revision=$2
           RETURNING revision`,
          [payload, this.revision],
        ) as unknown as Array<{revision: string | number}>;
        if (!rows.length) {
          this.staleWriter = true;
          throw new ServiceUnavailableException("Paralleler Datenbankzugriff erkannt. Der veraltete Schreibzugriff wurde gestoppt.");
        }
        this.revision = Number(rows[0].revision);
        this.completedWrite = target;
      }
      this.homepagePersistenceFailed = false;
    } catch (error) {
      this.homepagePersistenceFailed = true;
      throw error;
    } finally {
      this.flush = null;
    }
  }

  private async restore(): Promise<void> {
    const rows = (await this.sql!.unsafe(
      "SELECT payload,revision FROM portal_state WHERE id='primary' LIMIT 1",
    )) as Array<{ payload: unknown; revision: string | number }>;
    if (!rows.length) {
      await this.persist();
      return;
    }
    this.revision = Number(rows[0].revision);
    const state =
      typeof rows[0].payload === "string"
        ? JSON.parse(rows[0].payload)
        : (rows[0].payload as Record<string, unknown>);
    if ((state as any).storageVersion === 2) {
      this.hydrate(await this.records.load(this.sql as unknown as StorageSql,state,this.collections()));
    } else {
      this.hydrate(state as Record<string, any>);
      // Migration and the revision barrier are committed atomically. Railway's
      // volume backup is the rollback point; no indefinite copy of deleted PII.
      if (this.recordStorage) await this.persist();
    }
  }

  private hydrate(state: Record<string, any>): void {
    this.clear();
    const map = <T>(target: Map<string, T>, values: unknown) => {
      for (const [key, value] of (Array.isArray(values) ? values : []) as [
        string,
        T,
      ][])
        target.set(key, value);
    };
    const array = <T>(target: T[], values: unknown) =>
      target.push(...(Array.isArray(values) ? (values as T[]) : []));
    map(this.users, state.users);
    map(this.mailingLeads, state.mailingLeads);
    map(this.mailingCampaigns, state.mailingCampaigns);
    map(this.mailingSuppressions, state.mailingSuppressions);
    map(this.userByEmail, state.userByEmail);
    map(this.organizations, state.organizations);
    array(this.memberships, state.memberships);
    map(this.teamInvitations, state.teamInvitations);
    map(this.favorites, state.favorites);
    map(this.userPreferences, state.userPreferences);
    map(this.networks, state.networks);
    map(this.networkConnections, state.networkConnections);
    map(this.operatorMails, state.operatorMails);
    map(this.maintenanceReceipts, state.maintenanceReceipts);
    map(this.networkSystemMessages, state.networkSystemMessages);
    map(this.networkBySlug, state.networkBySlug);
    array(this.networkMemberships, state.networkMemberships);
    map(this.networkContents, state.networkContents);
    map(this.networkOrders, state.networkOrders);
    map(this.networkAttendances, state.networkAttendances);
    map(this.networkRevenues, state.networkRevenues);
    map(this.sessions, state.sessions);
    map(this.verificationTokens, state.verificationTokens);
    map(this.passwordResetTokens, state.passwordResetTokens);
    array(this.reviewDecisions, state.reviewDecisions);
    map(this.categories, state.categories);
    map(this.servicePages, state.servicePages);
    map(this.needs, state.needs);
    map(this.matches, state.matches);
    map(this.conversations, state.conversations);
    array(this.messages, state.messages);
    map(this.meetings, state.meetings);
    array(this.activities, state.activities);
    array(this.notifications, state.notifications);
  }

  private async runMigrations(): Promise<void> {
    await this.sql!.unsafe(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const directory = join(process.cwd(), "packages", "database", "migrations");
    const names = (await readdir(directory))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();
    for (const name of names) {
      const found = await this.sql!.unsafe(
        "SELECT 1 FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (found.length) continue;
      const source = await readFile(join(directory, name), "utf8");
      await this.sql!.begin(async (transaction) => {
        await transaction.unsafe(source);
        await transaction.unsafe(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [name],
        );
      });
      this.logger.log(`Migration ${name} ausgeführt.`);
    }
  }

  reset(): void {
    this.clear();
  }

  private clear(): void {
    this.mailingLeads.clear();
    this.mailingCampaigns.clear();
    this.mailingSuppressions.clear();
    this.users.clear();
    this.userByEmail.clear();
    this.organizations.clear();
    this.memberships.splice(0);
    this.teamInvitations.clear();
    this.favorites.clear();
    this.userPreferences.clear();
    this.networks.clear();
    this.operatorMails.clear();
    this.maintenanceReceipts.clear();
    this.networkBySlug.clear();
    this.networkMemberships.splice(0);
    this.networkContents.clear();
    this.networkConnections.clear();
    this.networkOrders.clear();
    this.networkSystemMessages.clear();
    this.networkAttendances.clear();
    this.networkRevenues.clear();
    this.sessions.clear();
    this.verificationTokens.clear();
    this.passwordResetTokens.clear();
    this.reviewDecisions.splice(0);
    this.categories.clear();
    this.servicePages.clear();
    this.needs.clear();
    this.matches.clear();
    this.conversations.clear();
    this.messages.splice(0);
    this.meetings.clear();
    this.activities.splice(0);
    this.notifications.splice(0);
  }
}
