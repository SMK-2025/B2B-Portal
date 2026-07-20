import {
  Injectable,
  Logger,
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
  NetworkMembershipRecord,
  NetworkRecord,
  NotificationRecord,
  OrganizationRecord,
  PasswordResetRecord,
  ReviewDecisionRecord,
  ServicePageRecord,
  SessionRecord,
  UserRecord,
  VerificationRecord,
} from "./domain";

export const UNTERNEHMERFREUNDE_NETWORK_ID =
  "10000000-0000-4000-8000-000000000001";

@Injectable()
export class PortalStore implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PortalStore.name);
  private sql: import("postgres").Sql | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  readonly users = new Map<string, UserRecord>();
  readonly userByEmail = new Map<string, string>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly memberships: MembershipRecord[] = [];
  readonly networks = new Map<string, NetworkRecord>();
  readonly networkBySlug = new Map<string, string>();
  readonly networkMemberships: NetworkMembershipRecord[] = [];
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

  constructor() {
    this.seedNetworks();
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      this.logger.warn(
        "DATABASE_URL fehlt; der PortalStore läuft nur im Arbeitsspeicher.",
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
    await this.restore();
    this.logger.log("PostgreSQL-Persistenz ist aktiv.");
  }

  async onApplicationShutdown(): Promise<void> {
    await this.writeQueue;
    await this.sql?.end({ timeout: 5 });
  }

  snapshot(): string {
    return JSON.stringify({
      users: [...this.users],
      userByEmail: [...this.userByEmail],
      organizations: [...this.organizations],
      memberships: this.memberships,
      networks: [...this.networks],
      networkBySlug: [...this.networkBySlug],
      networkMemberships: this.networkMemberships,
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

  async persist(): Promise<void> {
    if (!this.sql) return;
    const payload = this.snapshot();
    this.writeQueue = this.writeQueue.then(async () => {
      await this.sql!.unsafe(
        `INSERT INTO portal_state (id,payload,revision,updated_at)
         VALUES ('primary',$1::jsonb,1,now())
         ON CONFLICT (id) DO UPDATE SET
           payload=EXCLUDED.payload,
           revision=portal_state.revision+1,
           updated_at=now()`,
        [payload],
      );
    });
    return this.writeQueue;
  }

  private async restore(): Promise<void> {
    const rows = (await this.sql!.unsafe(
      "SELECT payload FROM portal_state WHERE id='primary' LIMIT 1",
    )) as Array<{ payload: unknown }>;
    if (!rows.length) {
      await this.persist();
      return;
    }
    const state =
      typeof rows[0].payload === "string"
        ? JSON.parse(rows[0].payload)
        : (rows[0].payload as Record<string, unknown>);
    this.hydrate(state as Record<string, any>);
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
    map(this.userByEmail, state.userByEmail);
    map(this.organizations, state.organizations);
    array(this.memberships, state.memberships);
    map(this.networks, state.networks);
    map(this.networkBySlug, state.networkBySlug);
    array(this.networkMemberships, state.networkMemberships);
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
    if (!this.networks.size) this.seedNetworks();
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
    this.seedNetworks();
  }

  private clear(): void {
    this.users.clear();
    this.userByEmail.clear();
    this.organizations.clear();
    this.memberships.splice(0);
    this.networks.clear();
    this.networkBySlug.clear();
    this.networkMemberships.splice(0);
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

  private seedNetworks() {
    const now = new Date().toISOString();
    const network: NetworkRecord = {
      id: UNTERNEHMERFREUNDE_NETWORK_ID,
      slug: "unternehmerfreunde-nrw",
      name: "Unternehmerfreunde NRW",
      legalName: null,
      websiteUrl: "https://www.unternehmerfreunde-nrw.de/",
      logoUrl: null,
      primaryColor: "#183b34",
      secondaryColor: "#c5a15a",
      status: "draft",
      trialEndsAt: null,
      enabledModules: [
        "members",
        "profiles",
        "services",
        "matching",
        "communication",
        "events",
        "community",
        "tasks",
        "documents",
        "analytics",
        "notifications",
      ],
      settings: {
        closedNetwork: true,
        selfRegistration: false,
        crossNetworkMatching: false,
        admissionRules:
          "Neue Mitgliedsunternehmen werden durch die Netzwerkadministration geprüft und freigegeben.",
      },
      createdAt: now,
      updatedAt: now,
    };
    this.networks.set(network.id, network);
    this.networkBySlug.set(network.slug, network.id);
  }
}
