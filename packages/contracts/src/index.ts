export type ProfileReviewStatus =
  | "draft"
  | "incomplete"
  | "submitted"
  | "automated_review"
  | "manual_review"
  | "changes_requested"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "suspended";

export type MatchStatus =
  | "detected"
  | "buyer_review"
  | "deferred"
  | "released_anonymously"
  | "provider_interested"
  | "mutual_match"
  | "contact_started"
  | "meeting_scheduled"
  | "closed";

export interface MatchScore {
  total: number;
  service: number;
  mandatorySkills: number;
  industry: number;
  region: number;
  availability: number | null;
  budget: number | null;
  references: number;
  profileQuality: number;
  explanation: string[];
  calculatedAt: string;
  modelVersion: string;
}
