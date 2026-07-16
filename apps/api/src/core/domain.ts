export type AccountRole = "user" | "platform_admin" | "reviewer";
export type OrganizationRole = "buyer" | "provider" | "both";
export type MembershipRole = "admin" | "member";
export type ReviewStatus = "draft" | "submitted" | "changes_requested" | "approved" | "rejected" | "suspended";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  accountRole: AccountRole;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface OrganizationRecord {
  id: string;
  legalName: string;
  displayName: string;
  role: OrganizationRole;
  websiteUrl: string | null;
  emailDomain: string | null;
  reviewStatus: ReviewStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface MembershipRecord {
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

export interface ReviewDecisionRecord {
  id: string;
  organizationId: string;
  reviewerId: string;
  decision: "approved" | "changes_requested" | "rejected";
  reason: string;
  createdAt: string;
}

export interface SessionRecord { tokenHash: string; userId: string; expiresAt: string; }
export interface VerificationRecord { tokenHash: string; userId: string; expiresAt: string; usedAt: string | null; }

export interface CategoryRecord { id:string; name:string; parentId:string|null; slug:string; active:boolean; }
export interface ServicePageRecord {
  id:string; organizationId:string; title:string; summary:string; description:string; categoryId:string;
  skills:string[]; targetIndustries:string[]; serviceRegions:string[]; deliveryModes:("online"|"onsite"|"hybrid")[];
  reviewStatus:ReviewStatus; publicVisibility:boolean; matchingEligible:boolean; version:number;
  submittedAt:string|null; approvedAt:string|null; createdAt:string;
}
export interface NeedRecord { id:string; organizationId:string; title:string; description:string; categoryId:string; requiredSkills:string[]; preferredIndustries:string[]; region:string|null; deliveryModes:("online"|"onsite"|"hybrid")[]; status:"draft"|"active"|"paused"|"closed"; createdAt:string; }
export interface MatchRecord { id:string; needId:string; servicePageId:string; buyerOrganizationId:string; providerOrganizationId:string; score:number; components:Record<string,number|null>; explanation:string[]; status:"buyer_review"|"deferred"|"rejected_by_buyer"|"released_anonymously"|"rejected_by_provider"|"provider_interested"|"mutual_match"|"closed"; buyerDecisionAt:string|null; providerDecisionAt:string|null; identityReleasedAt:string|null; createdAt:string; }
export interface ConversationRecord{id:string;matchId:string;createdAt:string;}
export interface MessageRecord{id:string;conversationId:string;senderUserId:string;body:string;createdAt:string;}
export interface MeetingRecord{id:string;matchId:string;createdByUserId:string;title:string;startsAt:string;durationMinutes:number;mode:"online"|"onsite";location:string|null;status:"proposed"|"confirmed"|"cancelled";createdAt:string;}
export interface ActivityRecord{id:string;matchId:string|null;organizationId:string|null;actorUserId:string|null;type:string;visibility:"shared"|"buyer_internal"|"provider_internal"|"platform_internal";data:Record<string,unknown>;createdAt:string;}
export interface NotificationRecord{id:string;userId:string;type:string;data:Record<string,unknown>;readAt:string|null;createdAt:string;}
