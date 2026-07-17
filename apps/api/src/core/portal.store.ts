import { Injectable } from "@nestjs/common";
import type { ActivityRecord, CategoryRecord, ConversationRecord, MatchRecord, MeetingRecord, MembershipRecord, MessageRecord, NeedRecord, NotificationRecord, OrganizationRecord, PasswordResetRecord, ReviewDecisionRecord, ServicePageRecord, SessionRecord, UserRecord, VerificationRecord } from "./domain";

@Injectable()
export class PortalStore {
  readonly users = new Map<string, UserRecord>();
  readonly userByEmail = new Map<string, string>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly memberships: MembershipRecord[] = [];
  readonly sessions = new Map<string, SessionRecord>();
  readonly verificationTokens = new Map<string, VerificationRecord>();
  readonly passwordResetTokens = new Map<string, PasswordResetRecord>();
  readonly reviewDecisions: ReviewDecisionRecord[] = [];
  readonly categories = new Map<string, CategoryRecord>();
  readonly servicePages = new Map<string, ServicePageRecord>();
  readonly needs = new Map<string, NeedRecord>();
  readonly matches = new Map<string, MatchRecord>();
  readonly conversations = new Map<string,ConversationRecord>(); readonly messages:MessageRecord[]=[]; readonly meetings=new Map<string,MeetingRecord>(); readonly activities:ActivityRecord[]=[]; readonly notifications:NotificationRecord[]=[];

  reset(): void {
    this.users.clear(); this.userByEmail.clear(); this.organizations.clear();
    this.memberships.splice(0); this.sessions.clear(); this.verificationTokens.clear(); this.passwordResetTokens.clear(); this.reviewDecisions.splice(0); this.categories.clear(); this.servicePages.clear(); this.needs.clear(); this.matches.clear();this.conversations.clear();this.messages.splice(0);this.meetings.clear();this.activities.splice(0);this.notifications.splice(0);
  }
}
