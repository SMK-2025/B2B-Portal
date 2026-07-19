import { Injectable } from "@nestjs/common";
import type { ActivityRecord, CategoryRecord, ConversationRecord, MatchRecord, MeetingRecord, MembershipRecord, MessageRecord, NeedRecord, NetworkMembershipRecord, NetworkRecord, NotificationRecord, OrganizationRecord, PasswordResetRecord, ReviewDecisionRecord, ServicePageRecord, SessionRecord, UserRecord, VerificationRecord } from "./domain";

export const UNTERNEHMERFREUNDE_NETWORK_ID="10000000-0000-4000-8000-000000000001";

@Injectable()
export class PortalStore {
  readonly users = new Map<string, UserRecord>();
  readonly userByEmail = new Map<string, string>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly memberships: MembershipRecord[] = [];
  readonly networks = new Map<string,NetworkRecord>();
  readonly networkBySlug = new Map<string,string>();
  readonly networkMemberships:NetworkMembershipRecord[]=[];
  readonly sessions = new Map<string, SessionRecord>();
  readonly verificationTokens = new Map<string, VerificationRecord>();
  readonly passwordResetTokens = new Map<string, PasswordResetRecord>();
  readonly reviewDecisions: ReviewDecisionRecord[] = [];
  readonly categories = new Map<string, CategoryRecord>();
  readonly servicePages = new Map<string, ServicePageRecord>();
  readonly needs = new Map<string, NeedRecord>();
  readonly matches = new Map<string, MatchRecord>();
  readonly conversations = new Map<string,ConversationRecord>(); readonly messages:MessageRecord[]=[]; readonly meetings=new Map<string,MeetingRecord>(); readonly activities:ActivityRecord[]=[]; readonly notifications:NotificationRecord[]=[];

  constructor(){this.seedNetworks()}

  reset(): void {
    this.users.clear(); this.userByEmail.clear(); this.organizations.clear();
    this.memberships.splice(0); this.networks.clear(); this.networkBySlug.clear(); this.networkMemberships.splice(0); this.sessions.clear(); this.verificationTokens.clear(); this.passwordResetTokens.clear(); this.reviewDecisions.splice(0); this.categories.clear(); this.servicePages.clear(); this.needs.clear(); this.matches.clear();this.conversations.clear();this.messages.splice(0);this.meetings.clear();this.activities.splice(0);this.notifications.splice(0);this.seedNetworks();
  }

  private seedNetworks(){
    const now=new Date().toISOString();
    const network:NetworkRecord={id:UNTERNEHMERFREUNDE_NETWORK_ID,slug:"unternehmerfreunde-nrw",name:"Unternehmerfreunde NRW",legalName:null,websiteUrl:"https://www.unternehmerfreunde-nrw.de/",logoUrl:null,primaryColor:"#183b34",secondaryColor:"#c5a15a",status:"active",enabledModules:["members","profiles","services","matching","communication","events","community","tasks","documents","analytics","notifications"],settings:{closedNetwork:true,selfRegistration:true,crossNetworkMatching:false,admissionRules:"Neue Mitgliedsunternehmen werden durch die Netzwerkadministration geprüft und freigegeben."},createdAt:now,updatedAt:now};
    this.networks.set(network.id,network);this.networkBySlug.set(network.slug,network.id);
  }
}
