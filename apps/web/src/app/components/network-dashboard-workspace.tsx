"use client";
import { NetworkConnectionButton } from "./network-connections";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { NetworkMatchdayCard } from "./network-bundesliga-card";
import { NetworkSystemMessages } from "./network-system-messages";
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
    networkProfile: { contactName: string; logoUrl: string | null } | null;
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
export function NetworkDashboardWorkspace({ slug }: { slug: string }) {
  const access = useNetworkAccess(),
    [data, setData] = useState<Dashboard | null>(null),
    [partners, setPartners] = useState<Partner[]>([]),
    [message, setMessage] = useState("");
  const base = `/portal/netzwerk/${slug}`;
  useEffect(() => {
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
  }, [slug, access?.currentUserId]);
  if (!data)
    return (
      <section className="networkCard networkLoading">
        <p role="status">{message || "Dein Netzwerk wird geladen …"}</p>
      </section>
    );
  const enabled = (module: string) => access?.enabledModules.includes(module),
    event = data.upcomingEvents[0] || data.recentEvents?.[0],
    recap = data.eventRecaps[0],
    eventImage = itemImage(event),
    recapImage = itemImage(recap);
  const cards = partners.length
    ? partners.slice(0, 3).map((member) => ({
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
      }))
    : data.recentMembers.slice(0, 3).map((member) => ({
        id: member.id,
        userId: "",
        name: member.name,
        company: "Netzwerkpartner",
        logo: member.logoUrl,
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
            (slug === "bayer-giants"
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
            <Link href={`${base}/mitglieder` as never}>
              Partner kennenlernen →
            </Link>
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
      <section
        className="loungeWelcomeText"
        aria-label="Willkommen im Business-Netzwerk"
      >
        <h2>Dein Business-Netzwerk. Persönlich verbunden.</h2>
        <p>
          Hier vernetzt du dich einfacher mit den Menschen und Unternehmen aus
          unserem Business-Bereich. Lerne andere Partner kennen, entdecke ihre
          Angebote und Leistungen und besuche ihre Unternehmensseiten. Im
          PartnerChat kommst du direkt ins Gespräch – für neue Kontakte,
          gemeinsame Ideen und Zusammenarbeit, auch zwischen unseren Treffen.
        </p>
      </section>
      <div
        className={`loungeGrid${["bayer04leverkusen", "bayer-giants"].includes(slug) && enabled("events") ? " loungeGridWithMatchday" : ""}`}
      >
        {["bayer04leverkusen", "bayer-giants"].includes(slug) &&
          enabled("events") && <NetworkMatchdayCard />}
        {enabled("events") && (
          <section className="networkCard loungeCard">
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
                <h2>Menschen hinter den Unternehmen</h2>
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
          <section className="networkCard loungeCard">
            <header>
              <h2>Aus unserem Netzwerk</h2>
              <Link
                href={`${base}/themen` as never}
                aria-label="Alle Neuigkeiten"
              >
                ↗
              </Link>
            </header>
            <div className="loungeCardBody">
              <div className="loungeNews">
                {data.announcements.length ? (
                  data.announcements.slice(0, 2).map((item) => (
                    <Link
                      href={
                        `${base}/themen?article=${encodeURIComponent(item.id)}` as never
                      }
                      key={item.id}
                    >
                      <time
                        className="loungeArticleDate"
                        dateTime={item.createdAt || item.updatedAt}
                      >
                        <strong>
                          {new Date(
                            item.createdAt || item.updatedAt,
                          ).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            timeZone: "Europe/Berlin",
                          })}
                        </strong>
                        <span>
                          {new Date(
                            item.createdAt || item.updatedAt,
                          ).toLocaleDateString("de-DE", {
                            month: "short",
                            timeZone: "Europe/Berlin",
                          })}
                        </span>
                      </time>
                      {itemImage(item) && <img src={itemImage(item)} alt="" />}
                      <div>
                        <h3>{item.title}</h3>
                        <p className="loungeExcerpt">{item.description}</p>
                        <time>
                          {new Date(
                            item.createdAt || item.updatedAt,
                          ).toLocaleDateString("de-DE", {
                            timeZone: "Europe/Berlin",
                          })}
                        </time>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="loungeEmpty">
                    <h3>Neue Impulse. Gemeinsame Ideen.</h3>
                    <p>
                      Hier teilt die Netzwerkleitung Neuigkeiten und
                      Gesprächsanlässe mit dir.
                    </p>
                  </div>
                )}
              </div>
              <Link
                className="loungeOutlineButton"
                href={`${base}/themen` as never}
              >
                Alle Neuigkeiten →
              </Link>
            </div>
          </section>
        )}
        {enabled("events") && (
          <section className="networkCard loungeCard">
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
        {enabled("communication") && (
          <section className="networkCard loungeCard">
            <header>
              <h2>Direkt ins Gespräch</h2>
            </header>
            <div className="loungeCardBody">
              <p className="loungeExcerpt">
                Eine Frage, eine Idee oder einfach ein persönliches Hallo?
                Schreibe deinen Netzwerkpartnern direkt im PartnerChat.
              </p>
              <Link
                className="loungeOutlineButton"
                href={`${base}/kommunikation` as never}
              >
                PartnerChat öffnen →
              </Link>
            </div>
          </section>
        )}
        {enabled("profiles") && (
          <section className="networkCard loungeCard">
            <header>
              <h2>Leistungen entdecken</h2>
            </header>
            <div className="loungeCardBody">
              <p className="loungeExcerpt">
                Wer kann dich unterstützen? Entdecke Kompetenzen, Angebote und
                Unternehmensseiten aus deinem Business-Netzwerk.
              </p>
              <Link
                className="loungeOutlineButton"
                href={`${base}/mitglieder` as never}
              >
                Unternehmen kennenlernen →
              </Link>
            </div>
          </section>
        )}
      </div>
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
