import { publicImageUrl } from "./homepage-media";
import type {
  NetworkContentRecord,
  NetworkMembershipRecord,
  NetworkPartnerProfile,
} from "../core/domain";
export type HomepageGrant = {
  enabled: boolean;
  fields: string[];
  rightsConfirmed: boolean;
  updatedAt: string;
  approvedBy: string;
  consentUserId?: string;
  consentMembershipId?: string;
};
export const homepageFields = {
  members: [
    "title",
    "description",
    "industry",
    "services",
    "website",
    "image",
    "email",
    "phone",
  ],
  events: [
    "title",
    "description",
    "image",
    "startsAt",
    "endsAt",
    "timezone",
    "location",
    "organizer",
    "terms",
    "cost",
    "registrationUrl",
    "status",
    "eventKind",
    "venue",
    "attendanceMode",
    "onlineUrl",
    "previousStartDate",
  ],
  recaps: ["title", "description", "date", "images"],
} as const;
const value = (v: unknown) => (typeof v === "string" ? v.slice(0, 10000) : "");
const url = (v: unknown) => {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ![...u.searchParams.keys()].some((k) =>
        /token|password|secret|invite|session/i.test(k),
      )
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export function projectHomepage(
  kind: keyof typeof homepageFields,
  record: NetworkContentRecord | NetworkMembershipRecord,
  profile?: NetworkPartnerProfile | null,
) {
  const grants = (
    record as typeof record & {
      homepageGrants?: Partial<
        Record<keyof typeof homepageFields, HomepageGrant>
      >;
    }
  ).homepageGrants;
  const grant = grants?.[kind];
  if (!grant?.enabled || !grant.rightsConfirmed) return null;
  if (kind === "members") {
    const member = record as NetworkMembershipRecord;
    if (
      member.homepageHidden ||
      grant.consentUserId !== member.userId ||
      grant.consentMembershipId !== member.id
    )
      return null;
  }
  const content = record as NetworkContentRecord;
  if (
    kind === "members"
      ? record.status !== "active" ||
        !profile ||
        profile.status !== "published" ||
        ["visitor", "network_admin"].includes(
          (record as NetworkMembershipRecord).role,
        )
      : !["published", "active", "completed"].includes(record.status) ||
        content.type !== "event" ||
        content.visibility !== "members"
  )
    return null;
  const data = content.data || {};
  const image = (v: unknown, field = "image") =>
    publicImageUrl(v, kind, record.id, field);
  const fields: Record<string, unknown> =
    kind === "members"
      ? {
          title: profile!.companyName,
          description: profile!.description,
          industry: profile!.industries,
          services: profile!.services,
          website: url(profile!.websiteUrl),
          image: image(profile!.logoUrl),
          email: profile!.contactEmail,
          phone: profile!.contactPhone,
        }
      : kind === "events"
        ? {
            title: content.title,
            description: content.description,
            image: image(data.imageUrl),
            startsAt: content.startsAt,
            endsAt: content.endsAt,
            timezone: value(data.timezone) || "Europe/Berlin",
            location: value(data.publicLocation),
            organizer: value(data.organizer),
            terms: value(data.participationTerms),
            cost: value(data.cost),
            registrationUrl: url(data.registrationUrl),
            eventKind:
              data.publicEventKind === "breakfast" ? "breakfast" : "other",
            attendanceMode: ["offline", "online", "hybrid"].includes(
              String(data.publicAttendanceMode),
            )
              ? data.publicAttendanceMode
              : null,
            onlineUrl: url(data.publicOnlineUrl),
            previousStartDate: value(data.publicPreviousStartDate),
            venue: {
              name: value(data.publicVenueName),
              streetAddress: value(data.publicStreetAddress),
              postalCode: value(data.publicPostalCode),
              addressLocality: value(data.publicAddressLocality),
              addressCountry: value(data.publicAddressCountry),
            },
            status: ["scheduled", "cancelled", "rescheduled"].includes(
              String(data.eventStatus),
            )
              ? data.eventStatus
              : "scheduled",
          }
        : {
            title: content.title,
            description: value(data.recapSummary),
            date: content.startsAt,
            images: Array.isArray(data.recapImages)
              ? data.recapImages
                  .slice(0, 6)
                  .map((v, index) => image(v, `images-${index}`))
                  .filter(Boolean)
              : [],
          };
  const changed = [
    record.updatedAt,
    grant.updatedAt,
    ...(kind === "members" ? [profile?.updatedAt] : []),
  ]
    .filter(
      (date): date is string =>
        typeof date === "string" && Number.isFinite(Date.parse(date)),
    )
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const output: Record<string, unknown> = {
    id: record.id,
    network: "unternehmerfreunde",
    publication: { enabled: true },
    ...(changed ? { updatedAt: changed } : {}),
  };
  for (const field of homepageFields[kind])
    if (
      grant.fields.includes(field) &&
      field !== "email" &&
      field !== "phone" &&
      fields[field] != null
    )
      output[field] = fields[field];
  if (
    kind === "members" &&
    (grant.fields.includes("email") || grant.fields.includes("phone"))
  )
    output.contact = {
      public: true,
      ...(grant.fields.includes("email") ? { email: fields.email } : {}),
      ...(grant.fields.includes("phone") ? { phone: fields.phone } : {}),
    };
  // Never publish incomplete or unapproved mandatory content.
  if (!output.title || !output.description) return null;
  if (kind === "events") {
    if (
      !output.startsAt ||
      !Number.isFinite(Date.parse(String(output.startsAt))) ||
      !output.location ||
      !output.organizer ||
      !output.terms ||
      !output.cost ||
      !output.image ||
      !output.status ||
      !output.timezone
    )
      return null;
    try {
      new Intl.DateTimeFormat("de-DE", {
        timeZone: String(output.timezone),
      }).format();
    } catch {
      return null;
    }
  }
  return output;
}
