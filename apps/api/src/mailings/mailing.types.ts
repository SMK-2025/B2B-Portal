export type MailingConsent = { at: string; source: string };
export type MailingLead = {
  id: string;
  networkId: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  source: string;
  marketing?: MailingConsent;
  tracking?: MailingConsent;
  createdAt: string;
  updatedAt: string;
};
export type MailingEvent = {
  kind:
    | "image"
    | "click"
    | "view"
    | "registered"
    | "verified"
    | "delivered"
    | "bounce"
    | "dropped"
    | "spamreport"
    | "deferred";
  at: string;
  link?: "homepage" | "landing" | "register";
  automated?: boolean;
  providerId?: string;
};
export type MailingDelivery = {
  revision?: number;
  token: string;
  state: "sending" | "submitted" | "uncertain";
  startedAt: string;
  submittedAt?: string;
  error?: string;
  registeredUserId?: string;
  events: MailingEvent[];
};
export type MailingCampaign = {
  automatic?: {
    enabled: boolean;
    approvedBy: string;
    approvedRevision: number;
    recipientIds: string[];
    nextAt: string;
    lastError?: string;
  };
  paused?: boolean;
  pausedAt?: string;
  versions?: {
    revision: number;
    name: string;
    subject: string;
    body: string;
    archivedAt: string;
  }[];
  id: string;
  networkId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deliveries: Record<string, MailingDelivery>;
};
