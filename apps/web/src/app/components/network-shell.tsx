"use client";
import { NetworkNotifications } from "./network-notifications";
import { NetworkSystemMessages } from "./network-system-messages";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  clearPortalSession,
  getPortalSession,
  portalRequest,
} from "../lib/portal-api";
function NetworkNavigationIcon({ path }: { path: string }) {
  const icons: Record<string, string[]> = {
    "": ["m3 10 9-7 9 7", "M5 9v12h14V9", "M9 21v-7h6v7"],
    mitglieder: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
      "M18 8a3 3 0 0 1 0 6",
      "M22 21v-2a4 4 0 0 0-3-4",
    ],
    spielplan: [
      "M7 3h10v6a5 5 0 0 1-10 0Z",
      "M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4",
      "M12 14v7m-5 0h10",
    ],
    veranstaltungen: ["M4 5h16v16H4Z", "M8 2v6m8-6v6M4 11h16"],
    kommunikation: ["M3 3h18v14H9l-6 4Z", "M7 8h10M7 12h7"],
    profil: ["M3 4h18v16H3Z", "M3 9h18M8 9v11"],
    rueckblicke: ["M3 5h18v15H3Z", "m3 17 6-6 4 4 3-3 5 5", "M15 8h2"],
    konto: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M4 21a8 8 0 0 1 16 0"],
    einstellungen: [
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
      "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
    ],
    dokumente: ["M5 2h9l5 5v15H5Z", "M14 2v6h5M8 12h8M8 16h8"],
    themen: ["M4 3h16v13H9l-5 5Z", "M8 7h8M8 11h5"],
    angebote: ["M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3"],
    aufgaben: ["M4 4h16v17H4Z", "m8 12 3 3 5-6"],
    auswertungen: ["M4 3v18h17", "M8 16v-4m5 4V8m5 8V5"],
    umsaetze: ["M19 5a7 7 0 1 0 0 14", "M3 10h12M3 14h10"],
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(
        icons[path] || ["M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z"]
      ).map((d, index) => (
        <path d={d} key={index} />
      ))}
    </svg>
  );
}
type Access = {
  homeTexts?: { welcomeTitle?: string | null; welcomeIntro?: string | null };
  membershipYear?: {
    startsAt: string;
    endsAt: string;
    endingSoon: boolean;
  } | null;
  currentUserId: string;
  firstName?: string;
  lastName?: string;
  networkId: string;
  slug: string;
  networkName: string;
  role: string;
  canManage: boolean;
  isInitiator: boolean;
  readOnly: boolean;
  status: string;
  enabledModules: string[];
  offeredModules: string[];
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};
type Mine = {
  membership: { role: string };
  network: {
    id: string;
    slug: string;
    name: string;
    status: string;
    trialEndsAt: string | null;
  };
};
const NetworkAccessContext = createContext<Access | null>(null);
export const useNetworkAccess = () => useContext(NetworkAccessContext);
const primaryPartnerItems = [
  { path: "", label: "Startseite", icon: "⌂" },
  {
    path: "mitglieder",
    label: "Partner entdecken",
    icon: "♙",
    module: "profiles",
  },
  { path: "spielplan", label: "ProB-Spielplan", icon: "◷", module: "events" },
  {
    path: "veranstaltungen",
    label: "Veranstaltungen",
    icon: "□",
    module: "events",
  },
  {
    path: "kommunikation",
    label: "PartnerChat",
    icon: "✉",
    module: "communication",
  },
  {
    path: "profil",
    label: "Meine Partnerseite",
    icon: "▣",
    module: "profiles",
  },
];
const morePartnerItems = [
  {
    path: "rueckblicke",
    label: "Veranstaltungsrückblicke",
    icon: "◫",
    module: "events",
  },
  {
    path: "angebote",
    label: "Anfragen & Angebote",
    icon: "◇",
    module: "services",
  },
  { path: "themen", label: "Community", icon: "◉", module: "community" },
  { path: "aufgaben", label: "Aufgaben", icon: "✓", module: "tasks" },
  { path: "dokumente", label: "Dokumente", icon: "▤", module: "documents" },
];
const adminItems = [
  { path: "einstellungen", label: "Branding & Einstellungen", icon: "⚙" },
  {
    path: "mitglieder",
    label: "Mitglieder & Einladungen",
    icon: "♙",
    module: "profiles",
  },
  {
    path: "veranstaltungen",
    label: "Veranstaltungen verwalten",
    icon: "□",
    module: "events",
  },
  {
    path: "themen",
    label: "Mitteilungen & Community",
    icon: "◉",
    module: "community",
  },
  {
    path: "auswertungen",
    label: "Auswertungen",
    icon: "↗",
    module: "analytics",
  },
  {
    path: "umsaetze",
    label: "Vermittelter Umsatz",
    icon: "€",
    module: "revenue",
  },
];
export function NetworkShell({
  title,
  intro,
  children,
  action,
  slug,
  networkName = "Netzwerk",
}: {
  title: string;
  intro: string;
  children: ReactNode;
  action?: ReactNode;
  slug: string;
  networkName?: string;
}) {
  const pathname = usePathname(),
    router = useRouter(),
    [account, setAccount] = useState(false),
    [access, setAccess] = useState<Access | null>(null),
    [error, setError] = useState(""),
    [trialAcknowledged, setTrialAcknowledged] = useState(false),
    base = `/portal/netzwerk/${slug}`;
  useEffect(() => {
    let active = true;
    const validate = async () => {
      const token = getPortalSession();
      if (!token) {
        router.replace(
          `/anmelden?network=${encodeURIComponent(slug)}` as never,
        );
        return;
      }
      try {
        const [session, network, mine] = await Promise.all([
          portalRequest<{
            accountRole: string;
            userId: string;
            firstName?: string;
            lastName?: string;
          }>("/auth/session/check", { token, body: {} }),
          portalRequest<{
            membershipYear?: {
              startsAt: string;
              endsAt: string;
              endingSoon: boolean;
            } | null;
            id: string;
            slug: string;
            name: string;
            status: string;
            enabledModules: string[];
            offeredModules: string[];
            logoUrl: string | null;
            primaryColor: string;
            secondaryColor: string;
            settings?: {
              welcomeTitle?: string | null;
              welcomeIntro?: string | null;
            };
          }>(`/networks/public/${slug}`, { token }),
          portalRequest<Mine[]>("/networks/mine", { token }),
        ]);
        const membership = mine.find((item) => item.network.id === network.id);
        if (session.accountRole !== "platform_admin" && !membership)
          throw new Error(
            "Sie sind diesem Netzwerk nicht als aktives Mitglied zugeordnet.",
          );
        const role =
            session.accountRole === "platform_admin"
              ? "platform_admin"
              : membership!.membership.role,
          isInitiator =
            session.accountRole === "platform_admin" ||
            role === "network_admin";
        if (active)
          setAccess({
            currentUserId: session.userId,
            firstName: session.firstName,
            lastName: session.lastName,
            homeTexts: network.settings,
            membershipYear: network.membershipYear,
            networkId: network.id,
            slug: network.slug,
            networkName: network.name,
            role,
            canManage: isInitiator || role === "moderator",
            isInitiator,
            readOnly:
              role === "visitor" ||
              (network.status === "trial" &&
                session.accountRole !== "platform_admin"),
            status: network.status,
            enabledModules: network.enabledModules,
            offeredModules: network.offeredModules,
            logoUrl: network.logoUrl,
            primaryColor: network.primaryColor,
            secondaryColor: network.secondaryColor,
          });
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Der Netzwerkzugang konnte nicht geprüft werden.",
          );
      }
    };
    void validate();
    return () => {
      active = false;
    };
  }, [pathname, router, slug]);
  useEffect(() => {
    if (!access) return;
    if (!access.readOnly) {
      setTrialAcknowledged(true);
      return;
    }
    setTrialAcknowledged(
      sessionStorage.getItem(`network-trial-understood:${access.networkId}`) ===
        "yes",
    );
  }, [access]);
  if (error)
    return (
      <main className="networkAccessState">
        <section>
          <span>ZUGRIFF GESCHÜTZT</span>
          <h1>Dieser Netzwerkbereich ist nicht verfügbar.</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  if (!access)
    return (
      <main className="networkAccessState">
        <section>
          <span>SICHERER ZUGANG</span>
          <h1>Netzwerkzugang wird geprüft.</h1>
        </section>
      </main>
    );
  const shownName = access.networkName || networkName,
    initials = shownName.slice(0, 2).toUpperCase(),
    moduleVisible = (item: { path: string; module?: string }) =>
      (!item.module ||
        access.enabledModules.includes(item.module) ||
        (item.path === "spielplan" &&
          access.offeredModules.includes("events"))) &&
      (item.path !== "spielplan" ||
        ["bayer-giants", "bayer04leverkusen"].includes(slug)),
    visiblePrimary = primaryPartnerItems.filter(
      (item) =>
        moduleVisible(item) &&
        !(
          (access.isInitiator || access.role === "visitor") &&
          item.path === "profil"
        ),
    ),
    visibleMore = morePartnerItems.filter(moduleVisible),
    visibleAdmin = adminItems.filter(
      (item) => !item.module || access.enabledModules.includes(item.module),
    ),
    href = (path: string) => (path ? `${base}/${path}` : base),
    isActive = (path: string) => pathname === href(path),
    logout = () => {
      clearPortalSession();
      router.replace(`/anmelden?network=${encodeURIComponent(slug)}` as never);
    },
    style = {
      "--network-accent": access.primaryColor,
      "--network-dark": access.secondaryColor,
      "--network-soft": `${access.primaryColor}18`,
    } as CSSProperties;
  const itemLink = (item: { path: string; label: string; icon: string }) => (
    <Link
      key={item.path || "home"}
      className={isActive(item.path) ? "active" : ""}
      href={href(item.path) as never}
    >
      <span>
        <NetworkNavigationIcon path={item.path} />
      </span>
      {item.path === "spielplan" && slug === "bayer04leverkusen"
        ? "Bundesliga"
        : item.label}
    </Link>
  );
  const navigation = (
    <>
      <nav className="networkSimpleNav" aria-label="Netzwerk">
        <small>NETZWERK</small>
        {visiblePrimary.map(itemLink)}
      </nav>
      {visibleMore.length > 0 && (
        <details className="networkMoreNav">
          <summary>
            <span>＋</span>
            <b>Weitere Funktionen</b>
          </summary>
          <nav>{visibleMore.map(itemLink)}</nav>
        </details>
      )}
      {access.isInitiator && (
        <details className="networkAdminNav">
          <summary>
            <span>⚙</span>
            <b>Netzwerk-Verwaltung</b>
            <small>Initiator</small>
          </summary>
          <nav>{visibleAdmin.map(itemLink)}</nav>
        </details>
      )}
    </>
  );
  const acknowledgeTrial = () => {
    sessionStorage.setItem(
      `network-trial-understood:${access.networkId}`,
      "yes",
    );
    setTrialAcknowledged(true);
  };
  return (
    <NetworkAccessContext.Provider value={access}>
      <main className="networkPortal" style={style}>
        <aside className="networkSidebar">
          <Link href={base as never} className="networkBrand">
            <span>
              {access.logoUrl ? <img src={access.logoUrl} alt="" /> : initials}
            </span>
            <div>
              <strong>Das Netzwerkpartner-Portal!</strong>
              <small>Partnerportal</small>
            </div>
          </Link>
          {navigation}
          <div className="networkSupport">
            <b>Hilfe & Kontakt</b>
            <p>Fragen zum Netzwerkzugang?</p>
            <a href="mailto:service@b2b-matching.de">Support kontaktieren</a>
          </div>
          <small className="networkOperatorSignature">
            Media Online Innovations Group
          </small>
        </aside>
        <section className="networkMain">
          <header className="networkTop">
            <details className="networkMobileNav">
              <summary aria-label="Netzwerkmenü öffnen">☰</summary>
              {navigation}
            </details>
            <div className="networkContext">
              {access.logoUrl ? (
                <img src={access.logoUrl} alt="" />
              ) : (
                <span>
                  {access.firstName?.[0] || initials[0]}
                  {access.lastName?.[0] || initials[1]}
                </span>
              )}
              <p>
                <b>Das Netzwerkpartner-Portal!</b>
                <small>Geschlossenes Partnernetzwerk</small>
              </p>
            </div>
            <div className="networkTopActions">
              <NetworkNotifications />
              {access.enabledModules.includes("communication") && (
                <Link
                  href={`${base}/kommunikation` as never}
                  aria-label="Nachrichten"
                >
                  ✉
                </Link>
              )}
              <button
                type="button"
                onClick={() => setAccount(!account)}
                aria-expanded={account}
              >
                <span>{initials}</span>
                <p>
                  <b>
                    {access.firstName ||
                      (access.role === "visitor"
                        ? "Besucher"
                        : access.isInitiator
                          ? "Initiator"
                          : "Netzwerkpartner")}
                  </b>
                  <small>Mein Zugang</small>
                </p>
              </button>
              {account && (
                <div className="networkAccountMenu">
                  <Link href={`${base}/konto` as never}>
                    Mein Konto & Sicherheit
                  </Link>
                  {access.isInitiator ? (
                    <Link href={`${base}/einstellungen` as never}>
                      Netzwerk-Verwaltung
                    </Link>
                  ) : (
                    <Link href={`${base}/profil` as never}>
                      Meine Partnerseite
                    </Link>
                  )}
                  <button type="button" onClick={logout}>
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </header>
          <div
            className="networkContent"
            onSubmitCapture={(event) => {
              if (access.role === "visitor") {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {access.readOnly && (
              <div className="networkReadOnlyNotice">
                {access.role === "visitor"
                  ? "Besucheransicht · Nur lesen. Keine Änderungen, Buchungen, Nachrichten oder Kommentare möglich. Private Gespräche bleiben geschützt."
                  : "Testansicht: Änderungen und Einladungen sind bis zur Aktivierung eingeschränkt."}
              </div>
            )}
            {pathname.replace(/\/$/, "") !== base && (
              <header className="networkWelcome">
                <div>
                  <span>
                    {pathname.replace(/\/$/, "") === base
                      ? "SCHÖN, DASS DU DA BIST"
                      : shownName.toUpperCase()}
                  </span>
                  <h1>
                    {pathname.replace(/\/$/, "") === `/portal/netzwerk/${slug}`
                      ? access.homeTexts?.welcomeTitle ||
                        `${new Date().getHours() < 11 ? "Guten Morgen" : new Date().getHours() < 18 ? "Hallo" : "Guten Abend"}${access.firstName ? `, ${access.firstName}` : ""}.`
                      : title}
                  </h1>
                  <p>
                    {pathname.replace(/\/$/, "") === `/portal/netzwerk/${slug}`
                      ? access.homeTexts?.welcomeIntro ||
                        "Bleib im Gespräch. Entdecke Menschen, Ideen und gemeinsame Chancen."
                      : intro}
                  </p>
                </div>
                {action ||
                  (pathname.replace(/\/$/, "") === base &&
                  !access.isInitiator &&
                  access.role !== "visitor" &&
                  access.enabledModules.includes("profiles") ? (
                    <Link
                      className="loungeProfileLink"
                      href={`${base}/profil` as never}
                    >
                      Meine Partnerseite →
                    </Link>
                  ) : null)}
              </header>
            )}
            {access.membershipYear?.endingSoon && (
              <div className="memberBillingEnding" role="status">
                <strong>Mitgliedschaft endet</strong>
                <p>
                  Ihre Jahresmitgliedschaft läuft bis{" "}
                  {new Date(
                    Date.parse(access.membershipYear.endsAt) - 1,
                  ).toLocaleDateString("de-DE")}
                  . Bitte wenden Sie sich rechtzeitig zur Verlängerung an den
                  Plattformbetreiber.
                </p>
              </div>
            )}
            {pathname.replace(/\/$/, "") !== base && (
              <NetworkSystemMessages
                key={access.networkId}
                networkId={access.networkId}
                operator={access.role === "platform_admin"}
              />
            )}
            {children}
          </div>
        </section>
      </main>
      {access.readOnly && access.role !== "visitor" && !trialAcknowledged && (
        <div className="networkTrialGate">
          <section role="dialog" aria-modal="true">
            <span>TESTANSICHT</span>
            <h2>Willkommen bei {shownName}</h2>
            <p>
              Sie können Aufbau und Funktionen ansehen. Produktive Einladungen
              und Veröffentlichungen werden nach der Aktivierung freigeschaltet.
            </p>
            <button type="button" onClick={acknowledgeTrial}>
              Verstanden – Netzwerk öffnen
            </button>
          </section>
        </div>
      )}
    </NetworkAccessContext.Provider>
  );
}
