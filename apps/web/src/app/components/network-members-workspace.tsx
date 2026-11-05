"use client";
import { PartnerDocuments, type PartnerDocument } from "./partner-documents";
import { NetworkText } from "./network-text-editor";
import { NetworkConnectionButton } from "./network-connections";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
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
  documents?: PartnerDocument[];
  heroImageUrl?: string | null;
  sections?: Array<{ title: string; body: string; area?: string }>;
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
  const [page,setPage]=useState(1),[total,setTotal]=useState(0),[loading,setLoading]=useState(false);
  const loadSequence=useRef(0);
  async function load() {
    const token = getPortalSession();
    if (!token || !networkId) return;
    const sequence=++loadSequence.current;setLoading(true);
    try {
      const status=Object.entries(labels).find(([,label])=>label===filter)?.[0]||'';
      const result=await portalRequest<{items:Member[];total:number;page:number}>(`/networks/${networkId}/memberships/page?${new URLSearchParams({page:String(page),pageSize:'12',q:query,status})}`, {
          token,
        });
      if(sequence!==loadSequence.current)return;
      setMembers(result.items);setTotal(result.total);setPage(result.page);
      setNotice("");
    } catch (error) {
      if(sequence!==loadSequence.current)return;
      setNotice(
        error instanceof Error
          ? error.message
          : "Partnerverzeichnis konnte nicht geladen werden.",
      );
    }finally{if(sequence===loadSequence.current)setLoading(false);}
  }
  useEffect(() => {
    const timer=setTimeout(()=>void load(),250);
    return()=>{clearTimeout(timer);loadSequence.current++;};
  }, [networkId,page,query,filter]);
  async function openMember(id:string){
    const token=getPortalSession();if(!token)return;
    try{const member=await portalRequest<Member>(`/networks/${networkId}/memberships/${encodeURIComponent(id)}`,{token});setSelected(member);}
    catch(error){setNotice(error instanceof Error?error.message:'Partnerseite konnte nicht geladen werden.');}
  }
  const openedFromLink = useRef("");
  const profileId = useSearchParams().get("profil");
  useEffect(() => {
    const id = profileId;
    if (!id || openedFromLink.current === networkId + id) return;
    if(!networkId)return;openedFromLink.current = networkId + id;
    void openMember(id);
  }, [networkId, profileId]);
  const visible=members;
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
            onChange={(event) => {setQuery(event.target.value);setPage(1);}}
            placeholder="Unternehmen, Leistung oder Person suchen"
          />
        </label>
        <select
          value={filter}
          onChange={(event) => {setFilter(event.target.value);setPage(1);}}
          aria-label="Status filtern"
        >
          <option>Alle</option>
          {Object.values(labels).map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
        {canManage && (
          <button className="networkPrimary" onClick={() => setInvite(true)}>
            <NetworkText id="ui.network-members-workspace.073d3f7eac48c530">
              ＋ Mitglied einladen
            </NetworkText>
          </button>
        )}
      </div>
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-members-workspace.b6dd381c58094fc8">
                GESCHLOSSENES PARTNERVERZEICHNIS
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-members-workspace.340be26d29f40522">
                Unternehmen und Leistungen im Netzwerk
              </NetworkText>
            </h2>
            <p>
              <NetworkText id="ui.network-members-workspace.b7c8f480c76082ca">
                Öffnen Sie eine Partnerseite, um Unternehmen, Kompetenzen und
                Ansprechpartner kennenzulernen.
              </NetworkText>
            </p>
          </div>
        </header>
        <div className="networkPartnerGrid" aria-busy={loading}>
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
                  <NetworkText id="ui.network-members-workspace.04acaf57ccd7c188">
                    {profile?.status === "published"
                      ? "PARTNERSEITE"
                      : "PROFIL NOCH NICHT VERÖFFENTLICHT"}
                  </NetworkText>
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
                    onClick={() => void openMember(member.id)}
                    disabled={!profile}
                  >
                    <NetworkText id="ui.network-members-workspace.8566c8b587fe9e9b">
                      Partnerseite besuchen
                    </NetworkText>
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
                    <NetworkText id="ui.network-members-workspace.09648af336bf127f">
                      {member.billing.status === "paid"
                        ? "Bezahlt"
                        : member.billing.status === "overdue"
                          ? "Überfällig"
                          : "Offen"}
                    </NetworkText>{" "}
                    · {member.billing.remainingDays}
                    <NetworkText id="ui.network-members-workspace.ad49b3508fbe620f">
                      Tage Restlaufzeit
                    </NetworkText>
                  </small>
                )}
              </article>
            );
          })}
        </div>
        {total>12 && <nav className="networkDirectoryPagination" aria-label="Mitgliederseiten">
          <button type="button" className="networkSecondary" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>← Zurück</button>
          <span>Seite {page} von {Math.max(1,Math.ceil(total/12))} · {total} Unternehmen</span>
          <button type="button" className="networkSecondary" disabled={loading||page>=Math.ceil(total/12)} onClick={()=>setPage(p=>p+1)}>Weiter →</button>
        </nav>}
        {!visible.length && !loading && (
          <div className="networkEmpty">
            <b>
              <NetworkText id="ui.network-members-workspace.2f0505572b63828b">
                Keine passenden Partner gefunden
              </NetworkText>
            </b>
            <p>
              <NetworkText id="ui.network-members-workspace.baf5e9fc85e512b9">
                Ändern Sie Suche oder Filter.
              </NetworkText>
            </p>
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
                <span>
                  <NetworkText id="ui.network-members-workspace.ae632b8a2eb45f22">
                    MITGLIEDERVERWALTUNG
                  </NetworkText>
                </span>
                <h2>
                  <NetworkText id="ui.network-members-workspace.accc54dc353c6b20">
                    Persönlich einladen
                  </NetworkText>
                </h2>
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
                <NetworkText id="ui.network-members-workspace.24d7299485041ddc">
                  Der persönliche Link ordnet das neue Unternehmenskonto
                  ausschließlich diesem Netzwerk zu.
                </NetworkText>
              </p>
              <label>
                <NetworkText id="ui.network-members-workspace.57f639dbdaa8c1c6">
                  Geschäftliche E-Mail
                </NetworkText>
                <input name="email" type="email" required />
              </label>
              <label>
                <NetworkText id="ui.network-members-workspace.0038a9cf86613cec">
                  Rolle
                </NetworkText>
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
                  <NetworkText id="ui.network-members-workspace.f7ff1178af202f6f">
                    Abbrechen
                  </NetworkText>
                </button>
                <button className="networkPrimary" disabled={busy}>
                  <NetworkText id="ui.network-members-workspace.10c38f8a522925fd">
                    {busy ? "Wird versendet …" : "Einladung versenden"}
                  </NetworkText>
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
  const [activeArea, setActiveArea] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rubrik") === "offers" ? "offers" : "about"),
    [menuOpen, setMenuOpen] = useState(false);
  const areas = [
    { id: "about", label: "Vorstellung" },
    { id: "services", label: "Leistungen" },
    { id: "personal", label: "Persönlich" },
    { id: "offers", label: "Angebote" },
    { id: "looking", label: "Gesuche" },
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
            <small>
              <NetworkText id="ui.network-members-workspace.5d4245cc9873da9f">
                NETZWERKPARTNER
              </NetworkText>
            </small>
            <h2 id="partner-profile-title">{p.companyName}</h2>
            <p>{p.tagline}</p>
            <div className="partnerHeroActions">
              <button
                type="button"
                className="partnerSiteHeroButton"
                onClick={() => showArea("services")}
              >
                <NetworkText id="ui.network-members-workspace.f5081bc91010da7f">
                  Unsere Leistungen entdecken →
                </NetworkText>
              </button>
              {access?.enabledModules.includes("communication") &&
                member.userId !== access.currentUserId && (
                  <Link
                    className="networkPrimary"
                    href={
                      `/portal/netzwerk/${access.slug}/kommunikation?partner=${member.userId}` as never
                    }
                  >
                    <NetworkText id="ui.network-members-workspace.8b83eeb8287ba472">
                      Nachricht senden
                    </NetworkText>
                  </Link>
                )}
              {!editControls && (
                <NetworkConnectionButton
                  userId={member.userId}
                  label="Vernetzen"
                />
              )}
              {p.meetingUrl && (
                <a
                  className="networkSecondary"
                  href={p.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NetworkText id="ui.network-members-workspace.fabfd7fc0b9ae704">
                    Kennenlernen vereinbaren ↗
                  </NetworkText>
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
              <small>
                <NetworkText id="ui.network-members-workspace.00e9b444ee88ade4">
                  ÜBER UNS
                </NetworkText>
              </small>
              <h3>
                <NetworkText id="ui.network-members-workspace.80a9e2334189c983">
                  Persönlich vorgestellt
                </NetworkText>
              </h3>
              <p>{p.description}</p>
            </section>
            <section id="partner-services" hidden={activeArea !== "services"}>
              {editControls?.("services")}
              <small>
                <NetworkText id="ui.network-members-workspace.3a5f8f13525cfcd6">
                  LEISTUNGEN
                </NetworkText>
              </small>
              <h3>
                <NetworkText id="ui.network-members-workspace.b37ac8f1211d6826">
                  Damit unterstützen wir Netzwerkpartner
                </NetworkText>
              </h3>
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
                  <b>
                    <NetworkText id="ui.network-members-workspace.8bae7d92c763e882">
                      Branchen und Zielgruppen:
                    </NetworkText>
                  </b>{" "}
                  {p.industries}
                </p>
              )}
            </section>
            {((p.documents?.length || 0) > 0 || editControls) && <section hidden={activeArea !== "services"}>
              {editControls?.("documents")}
              <h3>Präsentationen & Unterlagen</h3>
              <PartnerDocuments documents={p.documents || []}/>
            </section>}
            {(p.personalMessage || editControls) && (
              <section hidden={activeArea !== "personal"}>
                {editControls?.("personalMessage")}
                <small>
                  <NetworkText id="ui.network-members-workspace.6d952f96ed2eb85e">
                    PERSÖNLICH IM NETZWERK
                  </NetworkText>
                </small>
                <h3>
                  <NetworkText id="ui.network-members-workspace.d74f07d40d726f3e">
                    Meine Mitteilung an die Partner
                  </NetworkText>
                </h3>
                <p>{p.personalMessage}</p>
              </section>
            )}
            {(p.offers || editControls) && (
              <section hidden={activeArea !== "offers"}>
                {editControls?.("offers")}
                <small>
                  <NetworkText id="ui.network-members-workspace.7897f9dd6bac2998">
                    ANGEBOTE & UNTERSTÜTZUNG
                  </NetworkText>
                </small>
                <h3>
                  <NetworkText id="ui.network-members-workspace.0947baa797351e27">
                    Das biete ich an
                  </NetworkText>
                </h3>
                <p>{p.offers}</p>
              </section>
            )}
            {(p.lookingFor || editControls) && (
              <section hidden={activeArea !== "looking"}>
                {editControls?.("lookingFor")}
                <small>
                  <NetworkText id="ui.network-members-workspace.b90520012000e73c">
                    GESUCHE & KOOPERATIONEN
                  </NetworkText>
                </small>
                <h3>
                  <NetworkText id="ui.network-members-workspace.d14d578f2c84342d">
                    Das suche ich
                  </NetworkText>
                </h3>
                <p>{p.lookingFor}</p>
              </section>
            )}
            {p.sections?.map((section, index) => (
              <section
                className="partnerOnepagerSection"
                id={`partner-section-${index}`}
                key={index}
                hidden={activeArea !== (section.area || "about")}
              >
                {editControls?.(`section-${index}`)}
                <small>
                  {areas.find((a) => a.id === (section.area || "about"))?.label}
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
            {((activeArea === "personal" && !p.personalMessage) ||
              (activeArea === "offers" && !p.offers) ||
              (activeArea === "looking" && !p.lookingFor)) &&
              !editControls &&
              !p.sections?.some((s) => s.area === activeArea) && (
                <p>
                  <NetworkText id="ui.network-members-workspace.8c93950a7dffdc79">
                    Hier sind noch keine Angaben hinterlegt.
                  </NetworkText>
                </p>
              )}
          </main>
          <aside id="partner-contact" hidden={activeArea !== "contact"}>
            {editControls?.("contact")}
            <h3>
              <NetworkText id="ui.network-members-workspace.893dea27cfefb791">
                Digitale Visitenkarte
              </NetworkText>
            </h3>
            <PartnerBusinessCard profile={p} />
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
                  <NetworkText id="ui.network-members-workspace.c03a0ec43f30f32b">
                    PartnerChat beginnen →
                  </NetworkText>
                </Link>
              )}
            {p.meetingUrl && (
              <a
                className="partnerContactDownload"
                href={p.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <NetworkText id="ui.network-members-workspace.3bafbd9d6a1a78df">
                  Online-Termin vereinbaren ↗
                </NetworkText>
              </a>
            )}
          </aside>
        </div>
        <footer className="partnerSiteFooter">
          <strong>{p.companyName}</strong>
          <span>
            <NetworkText id="ui.network-members-workspace.d5720267bb4fcc9b">
              Persönlich verbunden · Im geschlossenen Partnernetzwerk
            </NetworkText>
          </span>
          <button type="button" onClick={() => showArea("contact")}>
            <NetworkText id="ui.network-members-workspace.1cb6a3f8bb26d747">
              Kontakt aufnehmen →
            </NetworkText>
          </button>
        </footer>
      </section>
    </div>
  );
}
