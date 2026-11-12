"use client";
import { NetworkText } from "./network-text-editor";
import { networkPageLabel } from "../lib/network-page-label";
import { NetworkReferralButton } from "./network-referral-button";
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
    hilfe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20", "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4", "M12 17h.01"],
    abmelden: ["M9 3H4v18h5", "M9 12h12", "m17 8 4 4-4 4"],
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
  features: Record<string, boolean>;
  sportSelection?: string;
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
  companyLogoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
};
type Mine = {
  organization?: { networkProfile?: { logoUrl?: string | null } | null } | null;
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
  { path: "themen", label: "Schwarzes Brett", icon: "◉", module: "community" },
  {
    path: "mitglieder",
    label: "Netzwerk-Mitglieder",
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
    label: "Mitglieder-Chat",
    icon: "✉",
    module: "communication",
  },
  { path: "rueckblicke", label: "Rückblicke", icon: "◫", module: "events" },
  {
    path: "profil",
    label: "Meine Unternehmensseiten",
    icon: "▣",
    module: "profiles",
  },
];
const adminItems = [
  { path: "funktionen", label: "Funktionen", icon: "⚙" },
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
    label: "Aktuelles & Mitteilungen",
    icon: "◉",
    module: "community",
  },
  {
    path: "auswertungen",
    label: "Auswertungen",
    icon: "↗",
    module: "analytics",
  },
];
export function NetworkShell(props: {
  title: string;
  intro: string;
  children: ReactNode;
  action?: ReactNode;
  slug: string;
  networkName?: string;
}) {
  const access = useNetworkAccess();
  const pathname = usePathname();
  if (!access) return <NetworkFrame {...props} />;
  const section = pathname.split("/").filter(Boolean).pop() || "home";
  return (
    <>
      {pathname.replace(/\/$/, "") !== `/portal/netzwerk/${props.slug}` && (
        <header className="networkWelcome">
          <div>
            <span>
              <NetworkText id="ui.page.network-label">
                {networkPageLabel(access.slug, access.networkName)}
              </NetworkText>
            </span>
            <h1>
              <NetworkText id={`ui.heading.${section}`}>
                {props.title}
              </NetworkText>
            </h1>
            <p>
              <NetworkText id={`ui.intro.${section}`}>
                {props.intro}
              </NetworkText>
            </p>
          </div>
          {props.action}
        </header>
      )}
      {props.children}
    </>
  );
}
function NetworkFrame({
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
    [mobileOpen, setMobileOpen] = useState(false),
    [navPanel, setNavPanel] = useState<"admin" | null>(null),
    [access, setAccess] = useState<Access | null>(null),
    [featureRefresh, setFeatureRefresh] = useState(0),
    [error, setError] = useState(""),
    [trialAcknowledged, setTrialAcknowledged] = useState(false),
    base = `/portal/netzwerk/${slug}`;
  useEffect(() => {
    let active = true;
    const validate = async () => {
      const token = getPortalSession();
      if (!token) {
        router.replace(
          `/anmelden?network=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}` as never,
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
            features: Record<string, boolean>;
            sportSelection?: string;
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
            features: network.features,
            sportSelection: network.sportSelection,
            offeredModules: network.offeredModules,
            logoUrl: network.logoUrl,
            companyLogoUrl:
              membership?.organization?.networkProfile?.logoUrl || null,
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
  }, [router, slug, featureRefresh]);
  useEffect(() => {
    const refresh = () => setFeatureRefresh(v => v + 1);
    window.addEventListener("network-features-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("network-features-changed", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setAccount(false);
    const section = pathname.split("/").pop();
    if (
      [
        "einstellungen",
        "funktionen",
        "auswertungen",
        "umsaetze",
        "veroeffentlichungen",
      ].includes(section || "")
    )
      setNavPanel("admin");
    else setNavPanel(null);
  }, [pathname]);
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
          <span>
            <NetworkText id="ui.network-shell.3aa6b050d2ff56be">
              ZUGRIFF GESCHÜTZT
            </NetworkText>
          </span>
          <h1>
            <NetworkText id="ui.network-shell.42e5424f527d03c2">
              Dieser Netzwerkbereich ist nicht verfügbar.
            </NetworkText>
          </h1>
          <p>{error}</p>
        </section>
      </main>
    );
  if (!access)
    return (
      <main className="networkAccessState">
        <section>
          <span>
            <NetworkText id="ui.network-shell.9de93d4b2332d9a9">
              SICHERER ZUGANG
            </NetworkText>
          </span>
          <h1>
            <NetworkText id="ui.network-shell.8183b2c31f34aae9">
              Netzwerkzugang wird geprüft.
            </NetworkText>
          </h1>
        </section>
      </main>
    );
  const shownName = access.networkName || networkName,
    initials = shownName.slice(0, 2).toUpperCase(),
    moduleVisible = (item: { path: string; module?: string }) =>
      access.features?.[({themen:"board",mitglieder:"profiles",profil:"profiles",spielplan:"sports",veranstaltungen:"events",kommunikation:"chat",rueckblicke:"recaps"} as Record<string,string>)[item.path]] !== false &&
      (item.path === "spielplan" || !item.module ||
        access.enabledModules.includes(item.module) ||
        (item.path === "spielplan" &&
          access.offeredModules.includes("events"))) &&
      (item.path !== "spielplan" || access.features?.sports === true),
    visiblePrimary = primaryPartnerItems.filter(
      (item) =>
        moduleVisible(item) &&
        item.path !== "profil" &&
        !(
          (access.isInitiator || access.role === "visitor") &&
          item.path === "profil"
        ),
    ),
    visibleAdmin = adminItems.filter(
      (item) => item.path === "mitglieder" || !item.module || access.enabledModules.includes(item.module),
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
      aria-current={isActive(item.path) ? "page" : undefined}
      onClick={() => {
        setMobileOpen(false);
        setAccount(false);
      }}
      href={href(item.path) as never}
      title={
        item.path === "spielplan" && (access.sportSelection || slug) === "bayer04leverkusen"
          ? "Bundesliga"
          : item.label
      }
    >
      <span>
        <NetworkNavigationIcon path={item.path} />
      </span>
      <NetworkText id={`ui.nav.${item.path || "home"}`}>
        {item.path === "spielplan" && (access.sportSelection || slug) === "bayer04leverkusen"
          ? "Bundesliga"
          : item.label}
      </NetworkText>
    </Link>
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
      <main className="networkPortal networkHorizontal" style={style}>
        <section className="networkMain">
          <header className="networkTop">
            <button
              className="networkMenuToggle"
              type="button"
              aria-label="Netzwerkmenü"
              aria-expanded={mobileOpen}
              aria-controls="network-horizontal-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>
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
                <b>
                  <NetworkText id="ui.portal.name">
                    Das Netzwerkpartner-Portal!
                  </NetworkText>
                </b>
                <small>
                  <NetworkText id="ui.portal.subtitle">
                    Geschlossenes Partnernetzwerk
                  </NetworkText>
                </small>
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
                <span className="networkAccountAvatar">
                  {access.companyLogoUrl ? (
                    <img
                      src={access.companyLogoUrl}
                      alt="Unternehmenslogo"
                      onError={() =>
                        setAccess((previous) =>
                          previous
                            ? { ...previous, companyLogoUrl: null }
                            : previous,
                        )
                      }
                    />
                  ) : (
                    initials
                  )}
                </span>
                <p>
                  <b>
                    {access.firstName ||
                      (access.role === "visitor"
                        ? "Besucher"
                        : access.isInitiator
                          ? "Initiator"
                          : "Netzwerkpartner")}
                  </b>
                  <small>
                    <NetworkText id="ui.network-shell.d1a9e0c3f0c2c273">
                      Mein Zugang
                    </NetworkText>
                  </small>
                </p>
              </button>
              {account && (
                <div className="networkAccountMenu">
                  <Link href={`${base}/konto` as never}>
                    <NetworkNavigationIcon path="konto"/>
                    <NetworkText id="ui.network-shell.43c0137e4397f2b1">
                      Mein Konto & Sicherheit
                    </NetworkText>
                  </Link>
                  {access.isInitiator ? (
                    <Link href={`${base}/einstellungen` as never}>
                      <NetworkNavigationIcon path="einstellungen"/>
                      <NetworkText id="ui.network-shell.9c119d7d91c5b647">
                        Netzwerk-Verwaltung
                      </NetworkText>
                    </Link>
                  ) : null}
                  {access.role !== "visitor" && access.role !== "platform_admin" &&
                    access.enabledModules.includes("profiles") ? (
                    <Link href={`${base}/profil` as never}>
                      <NetworkNavigationIcon path="profil"/>
                      <NetworkText id="ui.network-shell.890fd7c24aa9279c">
                        Meine Unternehmensseiten
                      </NetworkText>
                    </Link>
                  ) : null}
                  <a href="mailto:service@b2b-matching.de"><NetworkNavigationIcon path="hilfe"/><NetworkText id="ui.network-shell.5109b38afaef193f">Hilfe & Kontakt</NetworkText></a>
                  {!access.readOnly && access.role !== "platform_admin" && access.features?.referrals !== false && <NetworkReferralButton key={access.networkId} networkId={access.networkId}/>}
                  <button type="button" className="networkAccountLogout" onClick={logout}>
                    <NetworkNavigationIcon path="abmelden"/>
                    <NetworkText id="ui.network-shell.545f8be33bf06a1c">
                      Abmelden
                    </NetworkText>
                  </button>
                </div>
              )}
            </div>
          </header>
          <div
            id="network-horizontal-navigation"
            className={`networkHorizontalNavigation${mobileOpen ? " isOpen" : ""}`}
          >
            <nav aria-label="Netzwerkbereiche" className="networkPrimaryTabs">
              {visiblePrimary.map((item) => (
                <span key={item.path} onClick={() => setNavPanel(null)}>
                  {itemLink(item)}
                </span>
              ))}
              {access.isInitiator && (
                <button
                  type="button"
                  className={navPanel === "admin" ? "active" : ""}
                  aria-expanded={navPanel === "admin"}
                  onClick={() =>
                    setNavPanel(navPanel === "admin" ? null : "admin")
                  }
                >
                  <NetworkText id="ui.network-shell.38f4e49c6fed5db1">
                    Netzwerkverwaltung ▾
                  </NetworkText>
                </button>
              )}
            </nav>
            {navPanel === "admin" && access.isInitiator && (
              <nav
                className="networkSecondaryTabs"
                aria-label="Netzwerkverwaltung"
              >
                {visibleAdmin.map(itemLink)}
                {navPanel === "admin" && access.features?.publicHomepage === true && (
                  <Link
                    href={`${base}/veroeffentlichungen` as never}
                    className={isActive("veroeffentlichungen") ? "active" : ""}
                  >
                    <NetworkText id="ui.network-shell.8c5501654aed9fee">
                      Homepage-Freigaben
                    </NetworkText>
                  </Link>
                )}

              </nav>
            )}
          </div>
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
                <NetworkText id="ui.network-shell.145eccb9a624567b">
                  {access.role === "visitor"
                    ? "Besucheransicht · Nur lesen. Keine Änderungen, Buchungen, Nachrichten oder Kommentare möglich. Private Gespräche bleiben geschützt."
                    : "Testansicht: Änderungen und Einladungen sind bis zur Aktivierung eingeschränkt."}
                </NetworkText>
              </div>
            )}
            {title && pathname.replace(/\/$/, "") !== base && (
              <header className="networkWelcome">
                <div>
                  <span>
                    {pathname.replace(/\/$/, "") === base ? (
                      "SCHÖN, DASS DU DA BIST"
                    ) : (
                      <NetworkText id="ui.page.network-label">
                        {networkPageLabel(slug, shownName)}
                      </NetworkText>
                    )}
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
                  access.role !== "visitor" &&
                  access.enabledModules.includes("profiles") ? (
                    <Link
                      className="loungeProfileLink"
                      href={`${base}/profil` as never}
                    >
                      <NetworkText id="ui.network-shell.15adb2e6d8ea2179">
                        Meine Unternehmensseiten →
                      </NetworkText>
                    </Link>
                  ) : null)}
              </header>
            )}
            {access.membershipYear?.endingSoon && (
              <div className="memberBillingEnding" role="status">
                <strong>
                  <NetworkText id="ui.network-shell.4d4bc5891e7d2077">
                    Mitgliedschaft endet
                  </NetworkText>
                </strong>
                <p>
                  <NetworkText id="ui.network-shell.6ec5fa532a5a1cca">
                    Ihre Jahresmitgliedschaft läuft bis
                  </NetworkText>{" "}
                  {new Date(
                    Date.parse(access.membershipYear.endsAt) - 1,
                  ).toLocaleDateString("de-DE")}
                  <NetworkText id="ui.network-shell.dcf204e7534d1dbd">
                    . Bitte wenden Sie sich rechtzeitig zur Verlängerung an den
                    Plattformbetreiber.
                  </NetworkText>
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
            {access.features?.[({mitglieder:"profiles",profil:"profiles",kommunikation:"chat",themen:"board",veranstaltungen:"events",rueckblicke:"recaps",spielplan:"sports",auswertungen:"analytics",veroeffentlichungen:"publicHomepage"} as Record<string,string>)[pathname.split("/").pop() || ""]] === false ? <section className="networkCard networkLoading"><h2>Funktion ausgeschaltet</h2><p>Die Netzwerkleitung hat diesen Bereich derzeit deaktiviert.</p><Link href={base as never}>Zur Startseite</Link></section> : children}
          </div>
        </section>
      </main>
      {access.readOnly && access.role !== "visitor" && !trialAcknowledged && (
        <div className="networkTrialGate">
          <section role="dialog" aria-modal="true">
            <span>
              <NetworkText id="ui.network-shell.83131b6ea6750a64">
                TESTANSICHT
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-shell.18d4ee1f322ff03d">
                Willkommen bei{" "}
              </NetworkText>
              {shownName}
            </h2>
            <p>
              <NetworkText id="ui.network-shell.355dcbbe846b7bee">
                Sie können Aufbau und Funktionen ansehen. Produktive Einladungen
                und Veröffentlichungen werden nach der Aktivierung
                freigeschaltet.
              </NetworkText>
            </p>
            <button type="button" onClick={acknowledgeTrial}>
              <NetworkText id="ui.network-shell.de8174a036c929cf">
                Verstanden – Netzwerk öffnen
              </NetworkText>
            </button>
          </section>
        </div>
      )}
    </NetworkAccessContext.Provider>
  );
}
