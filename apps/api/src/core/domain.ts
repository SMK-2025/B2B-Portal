export type AccountRole = "user" | "platform_admin" | "reviewer";
export type OrganizationRole = "buyer" | "provider" | "both";
export type MembershipRole = "admin" | "member";
export type NetworkRole = "network_admin" | "moderator" | "organization_admin" | "member";
export type NetworkMembershipStatus = "pending" | "active" | "rejected" | "suspended" | "left";
export type NetworkModule = "members" | "profiles" | "services" | "matching" | "communication" | "events" | "community" | "tasks" | "documents" | "analytics" | "notifications";
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
  profileData?: Record<string, string | boolean>;
  profileUpdatedAt?: string | null;
  profileRequiredTotal?: number;
  profileRequiredCompleted?: number;
  profileRequiredSections?: boolean[];
}

export interface MembershipRecord {
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

export interface NetworkRecord {
  id:string; slug:string; name:string; legalName:string|null; websiteUrl:string|null;
  logoUrl:string|null; primaryColor:string; secondaryColor:string;
  status:"draft"|"trial"|"active"|"suspended"; trialEndsAt:string|null; enabledModules:NetworkModule[];
  settings:{closedNetwork:boolean;selfRegistration:boolean;crossNetworkMatching:boolean;admissionRules:string|null};
  createdAt:string; updatedAt:string;
}

export interface NetworkMembershipRecord {
  id:string; networkId:string; organizationId:string; userId:string;
  role:NetworkRole; status:NetworkMembershipStatus;
  invitedByUserId:string|null; reviewedByUserId:string|null; reviewedAt:string|null;
  createdAt:string; updatedAt:string;
}

export type NetworkContentType = "event" | "topic" | "announcement" | "poll" | "task" | "document" | "conversation" | "need" | "service";
export interface NetworkContentRecord {
  id:string; networkId:string; type:NetworkContentType; title:string; description:string;
  status:"draft"|"published"|"active"|"completed"|"archived";
  createdByUserId:string; assignedToUserId:string|null; startsAt:string|null; endsAt:string|null;
  visibility:"members"|"administrators"; data:Record<string,unknown>; createdAt:string; updatedAt:string;
}

export interface NetworkOrderRecord {
  id:string; networkId:string; orderedByUserId:string;
  invoiceCompany:string; invoiceContact:string; invoiceEmail:string;
  invoiceStreet:string; invoicePostalCode:string; invoiceCity:string; invoiceCountry:string;
  billingCycle:"annual"|"semiannual"; purchaseOrderReference:string|null;
  monthlyNetCents:39000; setupNetCents:299000; minimumTermMonths:12;
  termsVersion:string; pricingVersion:string;
  authorityConfirmed:boolean; termsAccepted:boolean; paymentObligationAccepted:boolean;
  status:"submitted"|"accepted"|"rejected"|"cancelled";
  submittedAt:string; decidedAt:string|null; decidedByUserId:string|null;
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
export interface PasswordResetRecord { tokenHash: string; userId: string; expiresAt: string; usedAt: string | null; }

export interface CategoryRecord { id:string; name:string; parentId:string|null; slug:string; active:boolean; }
export interface ServicePageRecord {
  id:string; organizationId:string; title:string; summary:string; description:string; categoryId:string;
  skills:string[]; targetIndustries:string[]; serviceRegions:string[]; deliveryModes:("online"|"onsite"|"hybrid")[];
  reviewStatus:ReviewStatus; publicVisibility:boolean; matchingEligible:boolean; version:number;
  submittedAt:string|null; approvedAt:string|null; createdAt:string;
}
export interface NeedRecord { id:string; organizationId:string; networkId:string|null; title:string; description:string; categoryId:string; requiredSkills:string[]; preferredIndustries:string[]; region:string|null; deliveryModes:("online"|"onsite"|"hybrid")[]; status:"draft"|"submitted"|"active"|"changes_requested"|"rejected"|"paused"|"closed"; createdAt:string; submittedAt?:string|null; reviewedAt?:string|null; reviewReason?:string|null; details?:Array<{label:string;value:string}>; }
export interface MatchRecord { id:string; needId:string; servicePageId:string; buyerOrganizationId:string; providerOrganizationId:string; score:number; components:Record<string,number|null>; explanation:string[]; status:"buyer_review"|"deferred"|"rejected_by_buyer"|"released_anonymously"|"rejected_by_provider"|"provider_interested"|"mutual_match"|"closed"; buyerDecisionAt:string|null; providerDecisionAt:string|null; identityReleasedAt:string|null; createdAt:string; }
export interface ConversationRecord{id:string;matchId:string;createdAt:string;}
export interface MessageRecord{id:string;conversationId:string;senderUserId:string;body:string;createdAt:string;}
export interface MeetingRecord{id:string;matchId:string;createdByUserId:string;title:string;startsAt:string;durationMinutes:number;mode:"online"|"onsite";location:string|null;status:"proposed"|"confirmed"|"cancelled";createdAt:string;}
export interface ActivityRecord{id:string;matchId:string|null;organizationId:string|null;actorUserId:string|null;type:string;visibility:"shared"|"buyer_internal"|"provider_internal"|"platform_internal";data:Record<string,unknown>;createdAt:string;}
export interface NotificationRecord{id:string;userId:string;type:string;data:Record<string,unknown>;readAt:string|null;createdAt:string;}
