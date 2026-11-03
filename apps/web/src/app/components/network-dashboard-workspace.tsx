"use client";
import { useRouter } from "next/navigation";
import { NetworkConnectionButton } from "./network-connections";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { NetworkMatchdayCard } from "./network-bundesliga-card";
import { NetworkSystemMessages } from "./network-system-messages";
import { NetworkThreadDialog } from "./network-exchange-workspace";
type Item = {
  id: string;
  title: string;
  description: string;
  startsAt: string | null;
  updatedAt: string;
  createdAt?: string;
  data: Record<string, unknown>;
};
type Dashboard = {
  network: {
    id: string;
    name: string;
    status: string;
    settings?: {
      bannerTitle?: string | null;
      bannerDescription?: string | null;
      bannerImageUrl?: string | null;
    };
  };
  recentMembers: { id: string; name: string; logoUrl: string | null }[];
  upcomingEvents: Item[];
  recentEvents?: Item[];
  eventRecaps: Item[];
  announcements: Item[];
};
type Partner = {
  id: string;
  userId: string;
  status: string;
  user: { firstName: string; lastName: string } | null;
  organization: {
    displayName: string;
    networkProfile: {
      contactName: string;
      logoUrl: string | null;
      tagline?: string;
    } | null;
  } | null;
};
function itemImage(item?: Item) {
  if (!item) return undefined;
  return [
    item.data.coverImageUrl,
    item.data.imageUrl,
    ...(Array.isArray(item.data.recapImages) ? item.data.recapImages : []),
  ].find(
    (value) =>
      typeof value === "string" &&
      /^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(value),
  ) as string | undefined;
}
export type LockedDashboardBrand = {
  slug:string; name:string; logoUrl:string|null; primaryColor:string;secondaryColor:string;modules:string[];
  bannerImageUrl:string|null;bannerTitle:string|null;bannerDescription:string|null;
};
export function NetworkDashboardWorkspace({ slug, preview }: { slug: string; preview?:LockedDashboardBrand }) {
  const access = useNetworkAccess(),
    [loaded, setData] = useState<Dashboard | null>(null),
    [partners, setPartners] = useState<Partner[]>([]),
    [threadId, setThreadId] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const router = useRouter();
  const base = `/portal/netzwerk/${slug}`;
  useEffect(() => {
    if(preview)return;
    let active = true;
    const token = getPortalSession();
    if (!token) {
      setMessage("Bitte melde dich erneut an.");
      return;
    }
    portalRequest<{ id: string }>(`/networks/public/${slug}`, { token })
      .then(async (network) => {
        const [dashboard, members] = await Promise.all([
          portalRequest<Dashboard>(`/networks/${network.id}/dashboard`, {
            token,
          }),
          portalRequest<Partner[]>(`/networks/${network.id}/memberships`, {
            token,
          }).catch(() => []),
        ]);
        if (active) {
          setData(dashboard);
          setPartners(
            members.filter(
              (member) =>
                member.status === "active" &&
                member.userId !== access?.currentUserId &&
                member.organization?.networkProfile,
            ),
          );
        }
      })
      .catch((error) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Die Übersicht konnte nicht geladen werden.",
          );
      });
    return () => {
      active = false;
    };
  }, [slug, access?.currentUserId,preview]);
  const data:Dashboard|null=preview?{network:{id:"",name:preview.name,status:"active",settings:preview},recentMembers:[],upcomingEvents:[],eventRecaps:[],announcements:[]}:loaded;
  if (!data)
    return (
      <section className="networkCard networkLoading">
        <p role="status">{message || "Dein Netzwerk wird geladen …"}</p>
      </section>
    );
  const enabled = (module: string) => (preview?.modules || access?.enabledModules)?.includes(module),
    event = data.upcomingEvents[0] || data.recentEvents?.[0],
    recap = data.eventRecaps[0],
    eventImage = itemImage(event),
    recapImage = itemImage(recap);
  const partnerOffset = partners.length
    ? Math.floor(Date.now() / 86400000) % partners.length
    : 0;
  const cards = partners.length
    ? [...partners.slice(partnerOffset), ...partners.slice(0, partnerOffset)]
        .slice(0, 3)
        .map((member) => ({
          id: member.id,
          userId: member.userId,
          name:
            member.organization!.networkProfile!.contactName ||
            [member.user?.firstName, member.user?.lastName]
              .filter(Boolean)
              .join(" ") ||
            member.organization!.displayName,
          company: member.organization!.displayName,
          logo: member.organization!.networkProfile!.logoUrl,
          tagline: member.organization!.networkProfile!.tagline,
        }))
    : data.recentMembers.slice(0, 3).map((member) => ({
        id: member.id,
        userId: "",
        name: member.name,
        company: "Netzwerkpartner",
        logo: member.logoUrl,
        tagline: undefined,
      }));
  return (
    <div className="networkLoungeHome">
      {data.network.status !== "trial" &&
        !access?.isInitiator &&
        !enabled("profiles") && (
          <section className="networkReadOnlyNotice">
            <strong>Deinen Zugang vervollständigen</strong>
            <p>
              Für die vollständige Nutzung prüfe bitte deine
              Jahresmitgliedschaft.
            </p>
            <Link href={`${base}/buchen` as never}>
              Informationen zur Mitgliedschaft →
            </Link>
          </section>
        )}
      <section className="loungeHero">
        <img
          src={
            data.network.settings?.bannerImageUrl ||
            (slug === "unternehmernetzwerkleverkusen"
              ? "/images/leverkusen-skyline.webp"
              : slug === "bayer-giants"
              ? "/images/network-meeting-sport.webp"
              : "/images/network-meeting-club.webp")
          }
          alt=""
        />
        <div>
          <span>SCHÖN, DASS DU DA BIST</span>
          <h1>
            {access?.homeTexts?.welcomeTitle ||
              data.network.settings?.bannerTitle ||
              `Willkommen${access?.firstName ? `, ${access.firstName}` : ""} in deinem Business-Netzwerk.`}
          </h1>
          <p>
            {access?.homeTexts?.welcomeIntro ||
              data.network.settings?.bannerDescription ||
              "Bleib im Gespräch. Entdecke Menschen, Ideen und gemeinsame Chancen – auch zwischen unseren Treffen."}
          </p>
          {enabled("profiles") && (
            <div className="loungeHeroActions">
              <Link href={`${base}/mitglieder` as never}>
                Partner entdecken →
              </Link>
              {!access?.isInitiator && access?.role !== "visitor" && (
                <Link href={`${base}/profil` as never}>
                  Meine Partnerseite ↗
                </Link>
              )}
            </div>
          )}
        </div>
        {!data.network.settings?.bannerImageUrl && <small>Symbolbild</small>}
      </section>
      {access && (
        <NetworkSystemMessages
          key={access.networkId}
          networkId={access.networkId}
          operator={access.role === "platform_admin"}
        />
      )}
      <div
        className={`loungeGrid${["bayer04leverkusen", "bayer-giants"].includes(slug) && enabled("events") ? " loungeGridWithMatchday" : ""}`}
      >
        {["bayer04leverkusen", "bayer-giants"].includes(slug) &&
          enabled("events") && (preview?<section className="networkCard loungeCard" style={{background:preview.secondaryColor,color:"white",padding:24,textAlign:"center"}}><small>{slug==="bayer04leverkusen"?"Bundesliga":"Bayer Giants"}</small><h2>Spieltag</h2><p>Ergebnisse und Tabelle</p></section>:<NetworkMatchdayCard />)}
        {enabled("events") && event && (
          <section className="networkCard loungeCard loungeNextEvent">
            <header>
              <h2>
                {data.upcomingEvents.length
                  ? "Unser nächstes Treffen"
                  : event
                    ? "Letzte Veranstaltung"
                    : "Unser nächstes Treffen"}
              </h2>
              <Link
                href={`${base}/veranstaltungen` as never}
                aria-label="Alle Veranstaltungen"
              >
                ↗
              </Link>
            </header>
            <div className="loungeCardBody">
              {event ? (
                <>
                  <div className="loungeEventVisual">
                    <time dateTime={event.startsAt!}>
                      <strong>{new Date(event.startsAt!).getDate()}</strong>
                      <span>
                        {new Date(event.startsAt!).toLocaleDateString("de-DE", {
                          month: "short",
                        })}
                      </span>
                    </time>
                    {eventImage ? (
                      <img src={eventImage} alt="" />
                    ) : (
                      <div className="loungeEventPlaceholder">
                        <span>RAUM FÜR BEGEGNUNGEN</span>
                        <strong>Persönlich verbunden.</strong>
                      </div>
                    )}
                  </div>
                  <h3>{event.title}</h3>
                  {!data.upcomingEvents.length && (
                    <strong>Bereits stattgefunden</strong>
                  )}
                  <p className="loungeDate">
                    {new Date(event.startsAt!).toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}{" "}
                    ·{" "}
                    {new Date(event.startsAt!).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Berlin",
                    })}{" "}
                    Uhr
                  </p>
                  <p className="loungeExcerpt">{event.description}</p>
                  <Link
                    className="loungeDarkButton"
                    href={
                      `${base}/veranstaltungen?event=${encodeURIComponent(event.id)}` as never
                    }
                  >
                    Treffen ansehen →
                  </Link>
                </>
              ) : (
                <div className="loungeEmpty">
                  <h3>Der nächste Austausch kommt.</h3>
                  <p>
                    Neue Termine findest du hier. Bis dahin kannst du deine
                    Partner schon persönlich kennenlernen.
                  </p>
                  <Link href={`${base}/veranstaltungen` as never}>
                    Kalender öffnen →
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
        {enabled("profiles") && (
          <section className="networkCard loungeCard loungeMemberHighlight">
            <header>
              <div>
                <h2>Netzwerk-Mitglieder</h2>
                <p>Entdecke, wer zu deinem Netzwerk gehört.</p>
              </div>
              <Link
                href={`${base}/mitglieder` as never}
                aria-label="Zum Partnerverzeichnis"
              >
                ↗
              </Link>
            </header>
            <div className="loungeCardBody">
              <div className="loungePartners">
                {cards.length ? (
                  cards.map((member) => (
                    <div key={member.id} className="loungePartnerConnection">
                      <Link href={`${base}/mitglieder` as never}>
                        <span className="loungePartnerLogo">
                          {member.logo ? (
                            <img src={member.logo} alt="" />
                          ) : (
                            <b>{member.company.slice(0, 2)}</b>
                          )}
                        </span>
                        <span>
                          <strong>{member.name}</strong>
                          <small>{member.company}</small>
                          {member.tagline && (
                            <small className="loungePartnerTagline">
                              {member.tagline}
                            </small>
                          )}
                        </span>
                        <b aria-hidden="true">↗</b>
                      </Link>
                      {member.userId && (
                        <NetworkConnectionButton userId={member.userId} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="loungeEmpty">
                    <h3>Hier beginnt dein Netzwerk.</h3>
                    <p>
                      Sobald Partner ihre Unternehmensseite eingerichtet haben,
                      kannst du sie hier entdecken.
                    </p>
                  </div>
                )}
              </div>
              <Link
                className="loungeOutlineButton"
                href={`${base}/mitglieder` as never}
              >
                Alle Partner entdecken →
              </Link>
            </div>
          </section>
        )}
        {enabled("community") && (
          <section
            className="loungeNoticeboard"
            aria-labelledby="noticeboard-title"
          >
            <header className="loungeBoardHeading">
              <div>
                <span>DEIN NETZWERK LEBT</span>
                <h2 id="noticeboard-title">Das schwarze Brett</h2>
                <p>
                  Neuigkeiten, Ideen und Gesprächsstoff – hier bleibt ihr
                  verbunden.
                </p>
              </div>
              <Link
                className="loungeOutlineButton"
                href={`${base}/themen` as never}
              >
                Alle Beiträge →
              </Link>
            </header>
            <div className="loungeBoardSurface">
              {data.announcements.length ? (
                data.announcements.slice(0, 6).map((item, index) => (
                  <button
                    type="button"
                    className={`loungeBoardNote loungeBoardNote${index % 3}`}
                    onClick={() => typeof item.data.welcomeMembershipId === "string" ? router.push(`${base}/mitglieder?profil=${encodeURIComponent(item.data.welcomeMembershipId)}` as never) : setThreadId(item.id)}
                    key={item.id}
                  >
                    <span className="loungeBoardPin" aria-hidden="true" />
                    <div className="loungeNoteMeta">
                      <span>{typeof item.data.welcomeMembershipId === "string" ? "Neu im Netzwerk" : "Netzwerkleitung · Angepinnt"}</span>
                      {Date.now() -
                        Date.parse(item.createdAt || item.updatedAt) <
                        7 * 86400000 && <b>Neu</b>}
                    </div>
                    {itemImage(item) && <img src={itemImage(item)} alt="" />}
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="loungeNoteBottom">
                      <time dateTime={item.createdAt || item.updatedAt}>
                        {new Date(
                          item.createdAt || item.updatedAt,
                        ).toLocaleDateString("de-DE", {
                          timeZone: "Europe/Berlin",
                        })}
                      </time>
                      <span>Beitrag öffnen ↗</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="loungeBoardEmpty">
                  <strong>Platz für neue Impulse.</strong>
                  <p>
                    Sobald die Netzwerkleitung einen Beitrag veröffentlicht,
                    findest du ihn hier am Brett.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        {enabled("events") && recap && (
          <section className="networkCard loungeCard loungeRecapCard">
            <header>
              <h2>Gemeinsam erlebt</h2>
              <Link
                href={`${base}/rueckblicke` as never}
                aria-label="Alle Rückblicke"
              >
                ↗
              </Link>
            </header>
            <div className="loungeCardBody">
              {recap ? (
                <>
                  {recapImage && (
                    <img className="loungeRecapPhoto" src={recapImage} alt="" />
                  )}
                  <h3>{recap.title}</h3>
                  <p className="loungeExcerpt">
                    {String(recap.data.recapSummary || recap.description)}
                  </p>
                  <time className="loungeDate">
                    {new Date(
                      recap.startsAt || recap.updatedAt,
                    ).toLocaleDateString("de-DE")}
                  </time>
                </>
              ) : (
                <div className="loungeEmpty">
                  <h3>Begegnungen, die bleiben.</h3>
                  <p>
                    Nach gemeinsamen Treffen findest du hier Bilder, Eindrücke
                    und Rückblicke aus deinem Netzwerk.
                  </p>
                </div>
              )}
              <Link
                className="loungeOutlineButton"
                href={`${base}/rueckblicke` as never}
              >
                Rückblicke entdecken →
              </Link>
            </div>
          </section>
        )}
      </div>
      {threadId && (
        <NetworkThreadDialog
          contentId={threadId}
          onClose={() => setThreadId(null)}
        />
      )}
      <nav className="loungeQuickAccess" aria-label="Weitere Partnerbereiche">
        {[
          ["kommunikation", "PartnerChat", "communication"],
          ["dokumente", "Dokumente", "documents"],
        ]
          .filter(([, , module]) => enabled(module))
          .map(([path, label]) => (
            <Link key={path} href={`${base}/${path}` as never}>
              {label} <span>→</span>
            </Link>
          ))}
        {access?.isInitiator && (
          <Link href={`${base}/einstellungen` as never}>
            Netzwerk verwalten <span>→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
