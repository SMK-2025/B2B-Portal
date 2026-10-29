"use client";
import { NetworkConnectionButton } from "./network-connections";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { partnerBranding } from "../lib/partner-branding";
import { PartnerBusinessCard } from "./partner-business-card";
export type PartnerPageProfile = {
  heroImageUrl?: string | null;
  sections?: Array<{ title: string; body: string }>;
  personalMessage?: string;
  offers?: string;
  lookingFor?: string;
  meetingUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  status: "draft" | "published";
  logoUrl: string | null;
  companyName: string;
  tagline: string;
  description: string;
  services: string;
  industries: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  websiteUrl: string | null;
  contactName: string;
  contactPosition: string;
  contactEmail: string;
  contactPhone: string;
  updatedAt: string;
};
type Profile = PartnerPageProfile;
export type Member = {
  id: string;
  userId: string;
  role: string;
  status: "pending" | "active" | "rejected" | "suspended" | "left";
  updatedAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
  organization: {
    displayName: string;
    legalName: string;
    websiteUrl: string | null;
    networkProfile: Profile | null;
  } | null;
  billing?: {
    orderId: string;
    status: "open" | "paid" | "overdue";
    dueAt: string | null;
    paidAt: string | null;
    modules: string[];
    startsAt: string | null;
    endsAt: string | null;
    remainingDays: number;
  } | null;
};
const labels = {
  pending: "Antrag",
  active: "Aktiv",
  rejected: "Abgelehnt",
  suspended: "Deaktiviert",
  left: "Ausgetreten",
} as const;
export function NetworkMembersWorkspace() {
  const access = useNetworkAccess(),
    networkId = access?.networkId || "",
    canManage = Boolean(access?.canManage && !access.readOnly),
    [members, setMembers] = useState<Member[]>([]),
    [selected, setSelected] = useState<Member | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Alle"),
    [invite, setInvite] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const token = getPortalSession();
    if (!token || !networkId) return;
    try {
      setMembers(
        await portalRequest<Member[]>(`/networks/${networkId}/memberships`, {
          token,
        }),
      );
      setNotice("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Partnerverzeichnis konnte nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [networkId]);
  const visible = useMemo(
    () =>
      members.filter(
        (member) =>
          (filter === "Alle" || labels[member.status] === filter) &&
          `${member.organization?.displayName || ""} ${member.organization?.networkProfile?.services || ""} ${member.user?.firstName || ""} ${member.user?.lastName || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [members, query, filter],
  );
  async function change(member: Member, status: Member["status"]) {
    const token = getPortalSession();
    if (!token || !canManage) return;
    try {
      const updated = await portalRequest<Member>(
        `/networks/${networkId}/memberships/${member.id}/status`,
        { token, body: { status } },
      );
      setMembers((all) =>
        all.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setNotice("Mitgliederstatus aktualisiert.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Änderung nicht möglich.",
      );
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token || !canManage) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await portalRequest<{
        registrationRequired?: boolean;
        alreadyActive?: boolean;
      }>(`/networks/${networkId}/memberships/invite`, {
        token,
        body: { email: form.get("email"), role: form.get("role") },
      });
      setInvite(false);
      await load();
      setNotice(
        result.registrationRequired
          ? "Ein persönlicher Registrierungslink wurde versendet."
          : result.alreadyActive
            ? "Die Person ist bereits aktives Netzwerkmitglied. Die Zugangsmail wurde erneut versendet."
            : "Das bestehende Konto wurde hinzugefügt und die Zugangsmail versendet.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Einladung nicht möglich.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function markPaid(member: Member) {
    const token = getPortalSession();
    if (!token || access?.role !== "platform_admin" || !member.billing) return;
    try {
      await portalRequest(
        `/networks/${networkId}/orders/${member.billing.orderId}/payment`,
        { token, body: { status: "paid" } },
      );
      await load();
      setNotice("Rechnung als bezahlt markiert.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Rechnungsstatus konnte nicht geändert werden.",
      );
    }
  }
  return (
    <div className="adminNetworkWorkspace">
      <div className="networkMemberToolbar">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Unternehmen, Leistung oder Person suchen"
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Status filtern"
        >
          <option>Alle</option>
          {Object.values(labels).map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
        {canManage && (
          <button className="networkPrimary" onClick={() => setInvite(true)}>
            ＋ Mitglied einladen
          </button>
        )}
      </div>
      <section className="networkCard">
        <header>
          <div>
            <span>GESCHLOSSENES PARTNERVERZEICHNIS</span>
            <h2>Unternehmen und Leistungen im Netzwerk</h2>
            <p>
              Öffnen Sie eine Partnerseite, um Unternehmen, Kompetenzen und
              Ansprechpartner kennenzulernen.
            </p>
          </div>
        </header>
        <div className="networkPartnerGrid">
          {visible.map((member) => {
            const profile = member.organization?.networkProfile;
            return (
              <article
                key={member.id}
                className="networkPartnerCard"
                style={partnerBranding(profile)}
              >
                <div className="networkPartnerCardTop">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} alt="" />
                  ) : (
                    <span>
                      {(member.organization?.displayName || "UN")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                  <b className={`networkMemberStatus ${member.status}`}>
                    {labels[member.status]}
                  </b>
                </div>
                <small>
                  {profile?.status === "published"
                    ? "PARTNERSEITE"
                    : "PROFIL NOCH NICHT VERÖFFENTLICHT"}
                </small>
                <h3>
                  {member.organization?.displayName ||
                    member.organization?.legalName ||
                    "Unternehmen"}
                </h3>
                <p>
                  {profile?.tagline ||
                    "Dieses Unternehmen ergänzt seine Partnerseite noch."}
                </p>
                {profile?.services && (
                  <div className="networkPartnerServices">
                    {profile.services
                      .split(/[,;\n]/)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((value) => (
                        <span key={value}>{value.trim()}</span>
                      ))}
                  </div>
                )}
                <div className="networkPartnerCardActions">
                  <button
                    type="button"
                    onClick={() => setSelected(member)}
                    disabled={!profile}
                  >
                    Partnerseite besuchen
                  </button>
                  {canManage && (
                    <div className="networkMemberActions">
                      {access?.role === "platform_admin" &&
                        member.billing &&
                        member.billing.status !== "paid" && (
                          <button
                            onClick={() => void markPaid(member)}
                            title="Rechnung als bezahlt markieren"
                          >
                            €
                          </button>
                        )}
                      {member.status === "pending" && (
                        <>
                          <button
                            onClick={() => void change(member, "active")}
                            title="Freigeben"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => void change(member, "rejected")}
                            title="Ablehnen"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {member.billing && (
                  <small className="networkBillingHint">
                    {member.billing.status === "paid"
                      ? "Bezahlt"
                      : member.billing.status === "overdue"
                        ? "Überfällig"
                        : "Offen"}{" "}
                    · {member.billing.remainingDays} Tage Restlaufzeit
                  </small>
                )}
              </article>
            );
          })}
        </div>
        {!visible.length && (
          <div className="networkEmpty">
            <b>Keine passenden Partner gefunden</b>
            <p>Ändern Sie Suche oder Filter.</p>
          </div>
        )}
      </section>
      {selected?.organization?.networkProfile && (
        <ProfileDialog member={selected} onClose={() => setSelected(null)} />
      )}
      {canManage && invite && (
        <div className="networkModalBackdrop">
          <section
            className="networkModal adminNetworkModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>MITGLIEDERVERWALTUNG</span>
                <h2>Persönlich einladen</h2>
              </div>
              <button
                onClick={() => setInvite(false)}
                aria-label="Dialog schließen"
              >
                ×
              </button>
            </header>
            <form onSubmit={submit}>
              <p>
                Der persönliche Link ordnet das neue Unternehmenskonto
                ausschließlich diesem Netzwerk zu.
              </p>
              <label>
                Geschäftliche E-Mail
                <input name="email" type="email" required />
              </label>
              <label>
                Rolle
                <select name="role">
                  <option value="organization_admin">
                    Unternehmensadministrator
                  </option>
                  <option value="member">Mitglied</option>
                  <option value="moderator">Moderator</option>
                </select>
              </label>
              <div className="adminNetworkDialogActions">
                <button type="button" onClick={() => setInvite(false)}>
                  Abbrechen
                </button>
                <button className="networkPrimary" disabled={busy}>
                  {busy ? "Wird versendet …" : "Einladung versenden"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {notice && (
        <div className="networkNotice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Meldung schließen">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
export function ProfileDialog({
  member,
  onClose,
  editControls,
}: {
  member: Member;
  onClose: () => void;
  editControls?: (area: string) => ReactNode;
}) {
  const access = useNetworkAccess();
  const p = member.organization!.networkProfile!;
  const [activeArea, setActiveArea] = useState("about"),
    [menuOpen, setMenuOpen] = useState(false);
  const areas = [
    { id: "about", label: "Vorstellung" },
    { id: "services", label: "Leistungen" },
    ...(p.personalMessage || editControls
      ? [{ id: "personal", label: "Persönlich" }]
      : []),
    ...(p.sections || []).map((section, index) => ({
      id: `section-${index}`,
      label: section.title,
    })),
    ...(p.offers || editControls ? [{ id: "offers", label: "Angebote" }] : []),
    ...(p.lookingFor || editControls
      ? [{ id: "looking", label: "Gesuche" }]
      : []),
    { id: "contact", label: "Kontakt" },
  ];
  function showArea(id: string) {
    setActiveArea(id);
    setMenuOpen(false);
    window.setTimeout(() => {
      const content =
        dialog.current?.querySelector<HTMLElement>("#partner-content");
      content?.focus({ preventScroll: true });
      content?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, 0);
  }
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ) || [],
        ).filter((element) => element.getClientRects().length > 0);
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="networkModalBackdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialog}
        className="networkPartnerProfileModal partnerMiniSite"
        style={partnerBranding(p)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-profile-title"
      >
        <div className="partnerSiteTopbar">
          <button
            type="button"
            className="partnerSiteBrand"
            onClick={() => {
              setMenuOpen(false);
              dialog.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label={`${p.companyName} – Seitenanfang`}
          >
            {p.logoUrl ? (
              <img src={p.logoUrl} alt={p.companyName} />
            ) : (
              <strong>{p.companyName}</strong>
            )}
          </button>
          <nav
            id="partner-site-navigation"
            className={`partnerSiteNavigation${menuOpen ? " isOpen" : ""}`}
            aria-label="Navigation der Partnerseite"
          >
            {areas.map((area) => (
              <button
                type="button"
                key={area.id}
                aria-current={activeArea === area.id ? "page" : undefined}
                onClick={() => showArea(area.id)}
              >
                {area.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="partnerSiteMenuToggle"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menuOpen}
            aria-controls="partner-site-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            type="button"
            className="partnerSiteClose"
            onClick={onClose}
            aria-label="Partnerseite schließen"
          >
            ×
          </button>
        </div>
        {editControls?.("hero")}
        <header
          className={`partnerOnepagerHero${p.heroImageUrl ? " hasHeroImage" : ""}`}
        >
          {p.heroImageUrl && (
            <img className="partnerHeroPhoto" src={p.heroImageUrl} alt="" />
          )}
          <div>
            <small>NETZWERKPARTNER</small>
            <h2 id="partner-profile-title">{p.companyName}</h2>
            <p>{p.tagline}</p>
            <div className="partnerHeroActions">
              <button
                type="button"
                className="partnerSiteHeroButton"
                onClick={() => showArea("services")}
              >
                Unsere Leistungen entdecken →
              </button>
              {access?.enabledModules.includes("communication") &&
                member.userId !== access.currentUserId && (
                  <Link
                    className="networkPrimary"
                    href={
                      `/portal/netzwerk/${access.slug}/kommunikation?partner=${member.userId}` as never
                    }
                  >
                    Nachricht senden
                  </Link>
                )}
              {p.meetingUrl && (
                <a
                  className="networkSecondary"
                  href={p.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kennenlernen vereinbaren ↗
                </a>
              )}
            </div>
          </div>
        </header>
        <div
          className="networkPartnerProfileBody"
          id="partner-content"
          tabIndex={-1}
          role="region"
          aria-label={areas.find((area) => area.id === activeArea)?.label}
        >
          <main hidden={activeArea === "contact"}>
            <section id="partner-about" hidden={activeArea !== "about"}>
              {editControls?.("about")}
              <small>ÜBER UNS</small>
              <h3>Persönlich vorgestellt</h3>
              <p>{p.description}</p>
            </section>
            <section id="partner-services" hidden={activeArea !== "services"}>
              {editControls?.("services")}
              <small>LEISTUNGEN</small>
              <h3>Damit unterstützen wir Netzwerkpartner</h3>
              <div className="networkCompanyServices">
                {p.services
                  .split(/\n+/)
                  .filter((line) => line.trim())
                  .map((line, index) => (
                    <article key={index}>
                      <span aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p>{line.replace(/^[-•]\s*/, "")}</p>
                    </article>
                  ))}
              </div>
              {p.industries && (
                <p>
                  <b>Branchen und Zielgruppen:</b> {p.industries}
                </p>
              )}
            </section>
            {(p.personalMessage || editControls) && (
              <section hidden={activeArea !== "personal"}>
                {editControls?.("personalMessage")}
                <small>PERSÖNLICH IM NETZWERK</small>
                <h3>Meine Mitteilung an die Partner</h3>
                <p>{p.personalMessage}</p>
              </section>
            )}
            {p.sections?.map((section, index) => (
              <section
                className="partnerOnepagerSection"
                id={`partner-section-${index}`}
                key={index}
                hidden={activeArea !== `section-${index}`}
              >
                {editControls?.(`section-${index}`)}
                <small>
                  UNSER UNTERNEHMEN · {String(index + 1).padStart(2, "0")}
                </small>
                <h3>{section.title}</h3>
                {section.body
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </section>
            ))}
            {(p.offers || editControls) && (
              <section hidden={activeArea !== "offers"}>
                {editControls?.("offers")}
                <small>ANGEBOTE & UNTERSTÜTZUNG</small>
                <h3>Das biete ich an</h3>
                <p>{p.offers}</p>
              </section>
            )}
            {(p.lookingFor || editControls) && (
              <section hidden={activeArea !== "looking"}>
                {editControls?.("lookingFor")}
                <small>GESUCHE & KOOPERATIONEN</small>
                <h3>Das suche ich</h3>
                <p>{p.lookingFor}</p>
              </section>
            )}
          </main>
          <aside id="partner-contact" hidden={activeArea !== "contact"}>
            {editControls?.("contact")}
            <h3>Digitale Visitenkarte</h3>
            <PartnerBusinessCard profile={p} />
            <NetworkConnectionButton userId={member.userId} />
            {access?.enabledModules.includes("communication") &&
              member.userId !== access.currentUserId && (
                <Link
                  className="networkPrimary"
                  href={
                    ("/portal/netzwerk/" +
                      access.slug +
                      "/kommunikation?partner=" +
                      member.userId) as never
                  }
                >
                  PartnerChat beginnen →
                </Link>
              )}
            {p.meetingUrl && (
              <a
                className="partnerContactDownload"
                href={p.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Online-Termin vereinbaren ↗
              </a>
            )}
          </aside>
        </div>
        <footer className="partnerSiteFooter">
          <strong>{p.companyName}</strong>
          <span>Persönlich verbunden · Im geschlossenen Partnernetzwerk</span>
          <button type="button" onClick={() => showArea("contact")}>
            Kontakt aufnehmen →
          </button>
        </footer>
      </section>
    </div>
  );
}
