"use client";
import { NetworkText } from "./network-text-editor";
import { NetworkPulse, CooperationRevenue } from './network-pulse';
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
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  modules: string[];
  bannerImageUrl: string | null;
  bannerTitle: string | null;
  bannerDescription: string | null;
};
export function NetworkDashboardWorkspace({
  slug,
  preview,
}: {
  slug: string;
  preview?: LockedDashboardBrand;
}) {
  const access = useNetworkAccess(),
    [loaded, setData] = useState<Dashboard | null>(null),
    [partners, setPartners] = useState<Partner[]>([]),
    [threadId, setThreadId] = useState<string | null>(null),
    [boardPage, setBoardPage] = useState(0),
    [message, setMessage] = useState("");
  const router = useRouter();
  const base = `/portal/netzwerk/${slug}`;
  useEffect(() => setBoardPage(0), [slug]);
  useEffect(() => {
    if (preview) return;
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
          portalRequest<{items:Partner[]}>(`/networks/${network.id}/memberships/page?pageSize=6&status=active`, {
            token,
          }).then(value=>value.items).catch(() => []),
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
  }, [slug, access?.currentUserId, preview]);
  const data: Dashboard | null = preview
    ? {
        network: {
          id: "",
          name: preview.name,
          status: "active",
          settings: preview,
        },
        recentMembers: [],
        upcomingEvents: [],
        eventRecaps: [],
        announcements: [],
      }
    : loaded;
  if (!data)
    return (
      <section className="networkCard networkLoading">
        <p role="status">{message || "Dein Netzwerk wird geladen …"}</p>
      </section>
    );
  const enabled = (module: string) =>
      (preview?.modules || access?.enabledModules)?.includes(module),
    event = data.upcomingEvents[0] || data.recentEvents?.[0],
    recap = data.eventRecaps[0],
    eventImage = itemImage(event),
    recapImage = itemImage(recap);
  const boardHasEvent = Boolean(enabled("events") && event);
  const boardAnnouncements = enabled("community") ? data.announcements.slice(0, 6) : [];
  const boardPages = Math.max(1, Math.ceil((boardAnnouncements.length + Number(boardHasEvent)) / 2));
  const currentBoardPage = Math.min(boardPage, boardPages - 1);
  const boardStart = currentBoardPage * 2;
  const visibleAnnouncements = boardAnnouncements.slice(
    Math.max(0, boardStart - Number(boardHasEvent)),
    boardStart + 2 - Number(boardHasEvent),
  );
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
            <strong>
              <NetworkText id="ui.network-dashboard-workspace.76f6cf1882e6dc6d">
                Deinen Zugang vervollständigen
              </NetworkText>
            </strong>
            <p>
              <NetworkText id="ui.network-dashboard-workspace.9d61026e47990f27">
                Für die vollständige Nutzung prüfe bitte deine
                Jahresmitgliedschaft.
              </NetworkText>
            </p>
            <Link href={`${base}/buchen` as never}>
              <NetworkText id="ui.network-dashboard-workspace.db3e2a15d1f960b6">
                Informationen zur Mitgliedschaft →
              </NetworkText>
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
          <span>
            <NetworkText id="ui.network-dashboard-workspace.bd558538b31ec0f8">
              SCHÖN, DASS DU DA BIST
            </NetworkText>
          </span>
          <h1>
            <NetworkText id="ui.home.title">
              {access?.homeTexts?.welcomeTitle ||
                data.network.settings?.bannerTitle ||
                `Willkommen${access?.firstName ? `, ${access.firstName}` : ""} in deinem Business-Netzwerk.`}
            </NetworkText>
          </h1>
          <p>
            <NetworkText id="ui.home.intro">
              {access?.homeTexts?.welcomeIntro ||
                data.network.settings?.bannerDescription ||
                "Bleib im Gespräch. Entdecke Menschen, Ideen und gemeinsame Chancen – auch zwischen unseren Treffen."}
            </NetworkText>
          </p>
          {enabled("profiles") && (
            <div className="loungeHeroActions">
              <Link href={`${base}/mitglieder` as never}>
                <NetworkText id="ui.network-dashboard-workspace.cd5868c8b1bdae7a">
                  Partner entdecken →
                </NetworkText>
              </Link>
              {!access?.isInitiator && access?.role !== "visitor" && (
                <Link href={`${base}/profil` as never}>
                  <NetworkText id="ui.network-dashboard-workspace.762130b9921be98b">
                    Meine Partnerseite ↗
                  </NetworkText>
                </Link>
              )}
            </div>
          )}
        </div>
        {!preview && <aside className="loungeHeroRevenue"><CooperationRevenue /></aside>}
        {!data.network.settings?.bannerImageUrl && (
          <small>
            <NetworkText id="ui.network-dashboard-workspace.4ac20bf8f99a0af1">
              Symbolbild
            </NetworkText>
          </small>
        )}
      </section>
      {access && (
        <NetworkSystemMessages
          key={access.networkId}
          networkId={access.networkId}
          operator={access.role === "platform_admin"}
        />
      )}
      <div className="loungePulseMembersRow">
        {!preview && <NetworkPulse />}
        {enabled("profiles") && (
          <section className="networkCard loungeCard loungeMemberHighlight">
            <header>
              <div>
                <h2>
                  <NetworkText id="ui.network-dashboard-workspace.001b224fb9b1593b">
                    Netzwerk-Mitglieder
                  </NetworkText>
                </h2>
                <p>
                  <NetworkText id="ui.network-dashboard-workspace.add127b41119abde">
                    Entdecke, wer zu deinem Netzwerk gehört.
                  </NetworkText>
                </p>
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
                    <h3>
                      <NetworkText id="ui.network-dashboard-workspace.f1d54a324f2ff6a2">
                        Hier beginnt dein Netzwerk.
                      </NetworkText>
                    </h3>
                    <p>
                      <NetworkText id="ui.network-dashboard-workspace.bc28911527b40506">
                        Sobald Partner ihre Unternehmensseite eingerichtet
                        haben, kannst du sie hier entdecken.
                      </NetworkText>
                    </p>
                  </div>
                )}
              </div>
              <Link
                className="loungeOutlineButton"
                href={`${base}/mitglieder` as never}
              >
                <NetworkText id="ui.network-dashboard-workspace.9866dbd37e9587a8">
                  Alle Partner entdecken →
                </NetworkText>
              </Link>
            </div>
          </section>
        )}
      </div>
      <div
        className={`loungeGrid${["bayer04leverkusen", "bayer-giants"].includes(slug) && enabled("events") ? " loungeGridWithMatchday" : ""}`}
      >
        {["bayer04leverkusen", "bayer-giants"].includes(slug) &&
          enabled("events") &&
          (preview ? (
            <section
              className="networkCard loungeCard"
              style={{
                background: preview.secondaryColor,
                color: "white",
                padding: 24,
                textAlign: "center",
              }}
            >
              <small>
                <NetworkText id="ui.network-dashboard-workspace.0ac26d78bd69d1c8">
                  {slug === "bayer04leverkusen" ? "Bundesliga" : "Bayer Giants"}
                </NetworkText>
              </small>
              <h2>
                <NetworkText id="ui.network-dashboard-workspace.b86b1055dbb9eb8a">
                  Spieltag
                </NetworkText>
              </h2>
              <p>
                <NetworkText id="ui.network-dashboard-workspace.36f4f1f120ee8266">
                  Ergebnisse und Tabelle
                </NetworkText>
              </p>
            </section>
          ) : (
            <NetworkMatchdayCard />
          ))}
        {(enabled("community") || (enabled("events") && event)) && (
          <section
            className="loungeNoticeboard"
            aria-labelledby="noticeboard-title"
          >
            <header className="loungeBoardHeading">
              <div>
                <h2 id="noticeboard-title">
                  <NetworkText id="ui.network-dashboard-workspace.d456e70d0528b350">
                    Das schwarze Brett
                  </NetworkText>
                </h2>
                <p>
                  <NetworkText id="ui.network-dashboard-workspace.2ec9dd8ae7607c0c">
                    Neuigkeiten, Ideen und Gesprächsstoff – hier bleibt ihr
                    verbunden.
                  </NetworkText>
                </p>
              </div>
              <Link
                className="loungeOutlineButton"
                href={`${base}/themen` as never}
              >
                <NetworkText id="ui.network-dashboard-workspace.c7a09c5d018e3b86">
                  Alle Beiträge →
                </NetworkText>
              </Link>
            </header>
            <div className="loungeBoardSurface">
              {enabled("events") && event && currentBoardPage === 0 && (
                <Link
                  className="loungeBoardNote loungeBoardNote0"
                  href={`${base}/veranstaltungen?event=${encodeURIComponent(event.id)}` as never}
                >
                  <span className="loungeBoardPin" aria-hidden="true" />
                  <div className="loungeNoteMeta">
                    <span><NetworkText id="dashboard.board.event.pinned">Veranstaltung · Angepinnt</NetworkText></span>
                    <b style={{background:"#edf0f3",color:"#243a4c"}}><NetworkText id={data.upcomingEvents.length ? "dashboard.board.event.upcoming" : "dashboard.board.event.past"}>{data.upcomingEvents.length ? "Bevorstehend" : "Bereits stattgefunden"}</NetworkText></b>
                  </div>
                  <img src={eventImage || data.network.settings?.bannerImageUrl || "/images/network-meeting-club.webp"} alt="" />
                  <h3>{event.title}</h3>
                  <time className="loungeDate" dateTime={event.startsAt!}>
                    {new Date(event.startsAt!).toLocaleString("de-DE", { weekday:"long", day:"2-digit", month:"long", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" })} Uhr
                  </time>
                  <p>{event.description}</p>
                  <div className="loungeNoteBottom"><span><NetworkText id="dashboard.board.event.open">Veranstaltung ansehen →</NetworkText></span></div>
                </Link>
              )}
              {enabled("community") && data.announcements.length ? (
                visibleAnnouncements.map((item, index) => (
                  <button
                    type="button"
                    className={`loungeBoardNote loungeBoardNote${index % 3}`}
                    onClick={() =>
                      typeof (item.data.welcomeMembershipId || item.data.partnerMembershipId) === "string"
                        ? router.push(
                            `${base}/mitglieder?profil=${encodeURIComponent(String(item.data.welcomeMembershipId || item.data.partnerMembershipId))}${item.data.partnerMembershipId ? "&rubrik=offers" : ""}` as never,
                          )
                        : setThreadId(item.id)
                    }
                    key={item.id}
                  >
                    <span className="loungeBoardPin" aria-hidden="true" />
                    <div className="loungeNoteMeta">
                      <span>
                        <NetworkText id="ui.network-dashboard-workspace.1b9564380e33fad5">
                          {typeof item.data.welcomeMembershipId === "string"
                            ? "Neu im Netzwerk"
                            : item.data.partnerMembershipId ? "Angebot eines Mitglieds" : "Netzwerkleitung · Angepinnt"}
                        </NetworkText>
                      </span>
                      {Date.now() -
                        Date.parse(item.createdAt || item.updatedAt) <
                        7 * 86400000 && (
                        <b>
                          <NetworkText id="ui.network-dashboard-workspace.d9b1e13f3b97c8b0">
                            Neu
                          </NetworkText>
                        </b>
                      )}
                    </div>
                    <img
                      src={String(
                        item.data.boardImageUrl ||
                          itemImage(item) ||
                          data.network.settings?.bannerImageUrl ||
                          "/images/network-meeting-club.webp",
                      )}
                      style={
                        item.data.boardImageIsLogo
                          ? {
                              objectFit: "contain",
                              background: "white",
                              width: "66.6667%",
                              marginInline: "auto",
                              display: "block",
                              maxHeight: "96px",
                            }
                          : undefined
                      }
                      alt=""
                    />
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
                      <span>
                        <NetworkText id="ui.network-dashboard-workspace.54e043bdabb639ef">
                          Beitrag öffnen ↗
                        </NetworkText>
                      </span>
                    </div>
                  </button>
                ))
              ) : !enabled("events") || !event ? (
                <div className="loungeBoardEmpty">
                  <strong>
                    <NetworkText id="ui.network-dashboard-workspace.006f6cebf5393796">
                      Platz für neue Impulse.
                    </NetworkText>
                  </strong>
                  <p>
                    <NetworkText id="ui.network-dashboard-workspace.6c1a94ffa41d4f8a">
                      Sobald die Netzwerkleitung einen Beitrag veröffentlicht,
                      findest du ihn hier am Brett.
                    </NetworkText>
                  </p>
                </div>
              ) : null}
            </div>
            {boardPages > 1 && (
              <nav className="loungeBoardPagination" aria-label="Beiträge am schwarzen Brett">
                <button type="button" aria-label="Vorherige Beiträge" disabled={currentBoardPage === 0} onClick={() => setBoardPage(currentBoardPage - 1)}>←</button>
                <span aria-live="polite">{currentBoardPage + 1} / {boardPages}</span>
                <button type="button" aria-label="Weitere Beiträge" disabled={currentBoardPage === boardPages - 1} onClick={() => setBoardPage(currentBoardPage + 1)}>→</button>
              </nav>
            )}
          </section>
        )}
        {enabled("events") && recap && (
          <section className="networkCard loungeCard loungeRecapCard">
            <header>
              <h2>
                <NetworkText id="ui.network-dashboard-workspace.103a665f83dfa37a">
                  Gemeinsam erlebt
                </NetworkText>
              </h2>
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
                  <h3>
                    <NetworkText id="ui.network-dashboard-workspace.b9d05c9b268d4bfb">
                      Begegnungen, die bleiben.
                    </NetworkText>
                  </h3>
                  <p>
                    <NetworkText id="ui.network-dashboard-workspace.cd5d0c6cfe1ba77a">
                      Nach gemeinsamen Treffen findest du hier Bilder, Eindrücke
                      und Rückblicke aus deinem Netzwerk.
                    </NetworkText>
                  </p>
                </div>
              )}
              <Link
                className="loungeOutlineButton"
                href={`${base}/rueckblicke` as never}
              >
                <NetworkText id="ui.network-dashboard-workspace.6101c10cb75b2396">
                  Rückblicke entdecken →
                </NetworkText>
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
          ["kommunikation", "Mitglieder-Chat", "communication"],
        ]
          .filter(([, , module]) => enabled(module))
          .map(([path, label]) => (
            <Link key={path} href={`${base}/${path}` as never}>
              {label} <span>→</span>
            </Link>
          ))}
        {access?.isInitiator && (
          <Link href={`${base}/einstellungen` as never}>
            <NetworkText id="ui.network-dashboard-workspace.75c7ce68919cf91c">
              Netzwerk verwalten{" "}
            </NetworkText>
            <span>→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
