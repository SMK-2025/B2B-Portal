"use client";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";

type Network = {
  id: string;
  name: string;
  legalName: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  settings: {
    admissionRules: string | null;
    setupCompletedAt?: string | null;
    welcomeTitle?: string | null;
    welcomeIntro?: string | null;
    bannerTitle?: string | null;
    bannerDescription?: string | null;
    bannerImageUrl?: string | null;
  };
};
type Dashboard = {
  members: { active: number; pending: number };
  content: { total: number; events: number };
  recent: Array<{ id: string; title: string; type: string; updatedAt: string }>;
};

export function NetworkAdministrationWorkspace({
  mode,
  slug,
}: {
  mode: "settings" | "analytics";
  slug: string;
}) {
  const router = useRouter();
  const access = useNetworkAccess();
  const [network, setNetwork] = useState<Network | null>(null),
    [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [logo, setLogo] = useState<string | null>(null),
    [bannerImage, setBannerImage] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const token = getPortalSession();
    if (!token) {
      setNotice("Bitte melden Sie sich erneut an.");
      return;
    }
    try {
      const n = await portalRequest<Network>(`/networks/public/${slug}`, {
        token,
      });
      setNetwork(n);
      setLogo(n.logoUrl);
      setBannerImage(n.settings.bannerImageUrl || null);
      setDashboard(
        await portalRequest<Dashboard>(`/networks/${n.id}/dashboard`, {
          token,
        }),
      );
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Netzwerkverwaltung konnte nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [slug]);
  function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) {
      setNotice("Bitte wählen Sie eine Bilddatei mit maximal 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setLogo(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }
  function uploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_500_000
    ) {
      setNotice("Bitte PNG, JPG oder WebP mit maximal 1,5 MB auswählen.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setBannerImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!network) return;
    const token = getPortalSession();
    if (!token) return;
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const updated = await portalRequest<Network>(
        `/networks/${network.id}/settings`,
        {
          token,
          body: {
            name: f.get("name"),
            legalName: f.get("legalName"),
            websiteUrl: f.get("websiteUrl"),
            logoUrl: logo,
            primaryColor: f.get("primaryColor"),
            secondaryColor: f.get("secondaryColor"),
            admissionRules: f.get("admissionRules"),
            welcomeTitle: f.get("welcomeTitle"),
            welcomeIntro: f.get("welcomeIntro"),
            bannerTitle: f.get("bannerTitle"),
            bannerDescription: f.get("bannerDescription"),
            bannerImageUrl: bannerImage,
            completeSetup: true,
          },
        },
      );
      if ((updated.settings.bannerImageUrl || null) !== bannerImage)
        throw new Error(
          "Das Titelbild wurde vom Server noch nicht übernommen. Die Bildauswahl bleibt erhalten. Bitte prüfen Sie den Backend-Bereitstellungsstatus.",
        );
      setNetwork(updated);
      setNotice("Netzwerkauftritt und Einstellungen wurden gespeichert.");
      if (!network.settings.setupCompletedAt)
        router.push(`/portal/netzwerk/${slug}` as never);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Speichern nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  if (!network || !dashboard)
    return (
      <section className="networkCard networkLoading">
        <p>{notice || "Netzwerkdaten werden geladen …"}</p>
      </section>
    );
  if (mode === "analytics")
    return (
      <div className="networkAnalytics">
        <section className="networkStats">
          {[
            [dashboard.members.active, "Aktive Nutzer"],
            [dashboard.members.pending, "Offene Aufnahmen"],
            [dashboard.content.events, "Veranstaltungen"],
            [dashboard.content.total, "Inhalte"],
          ].map(([v, l]) => (
            <article key={String(l)}>
              <strong>{v}</strong>
              <span>
                {l}
                <small>Aktueller Datenstand</small>
              </span>
            </article>
          ))}
        </section>
        <section className="networkCard">
          <header>
            <div>
              <span>AKTIVITÄT</span>
              <h2>Letzte Netzwerkaktivitäten</h2>
            </div>
            <button onClick={() => window.print()}>Drucken</button>
          </header>
          <div className="networkActivity">
            {dashboard.recent.map((i) => (
              <p key={i.id}>
                <b>{i.type.slice(0, 2).toUpperCase()}</b>
                <span>
                  <strong>{i.title}</strong>
                  <small>{new Date(i.updatedAt).toLocaleString("de-DE")}</small>
                </span>
              </p>
            ))}
            {!dashboard.recent.length && (
              <div className="networkEmpty">
                <b>Noch keine Aktivitäten</b>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  if (!access?.isInitiator)
    return (
      <section className="networkCard networkLoading">
        <p>Nur der Initiator darf den Netzwerkauftritt verwalten.</p>
      </section>
    );
  return (
    <form className="networkSettingsForm" onSubmit={save}>
      {!network.settings.setupCompletedAt && (
        <section className="networkSetupIntro">
          <span>ERSTEINRICHTUNG</span>
          <h2>
            Gestalten Sie die gemeinsame Startseite Ihres Partnernetzwerks.
          </h2>
          <p>
            Legen Sie Name, Logo, Farben und Netzwerkregeln fest. Alle
            Funktionen sind enthalten; die Netzwerkverwaltung bleibt für
            Initiatoren kostenlos.
          </p>
        </section>
      )}
      <section className="networkCard">
        <header>
          <div>
            <span>KOSTENLOS INKLUSIVE</span>
            <h2>Whitelabel und Stammdaten</h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <label>
            Netzwerkname
            <input name="name" required defaultValue={network.name} />
          </label>
          <label>
            Rechtlicher Name
            <input name="legalName" defaultValue={network.legalName || ""} />
          </label>
          <label>
            Website
            <input
              name="websiteUrl"
              type="url"
              defaultValue={network.websiteUrl || ""}
            />
          </label>
          <label className="networkLogoUpload">
            Netzwerklogo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={uploadLogo}
            />
            <small>PNG, JPG, WebP oder SVG · maximal 1,5 MB</small>
          </label>
          {logo && (
            <div className="networkLogoPreview">
              <img src={logo} alt="Vorschau des Netzwerklogos" />
              <button type="button" onClick={() => setLogo(null)}>
                Logo entfernen
              </button>
            </div>
          )}
          <label>
            Primärfarbe
            <input
              name="primaryColor"
              type="color"
              defaultValue={network.primaryColor}
            />
          </label>
          <label>
            Sekundärfarbe
            <input
              name="secondaryColor"
              type="color"
              defaultValue={network.secondaryColor}
            />
          </label>
          <p className="full">
            Nur der Initiator kann Logo, Farben und Netzwerkauftritt verändern.
          </p>
        </div>
      </section>
      <section className="networkCard">
        <header>
          <div>
            <span>ALLE FUNKTIONEN INKLUSIVE</span>
            <h2>Kostenlose Netzwerkverwaltung für Initiatoren</h2>
            <p>
              Partnermitglieder buchen ihren eigenen vollständigen Zugang bei
              der Registrierung für zwölf Monate im Voraus. Den individuellen
              Mitgliedspreis bestimmt ausschließlich der Plattforminhaber.
            </p>
          </div>
        </header>
        <p className="networkModuleExplanation">
          Es gibt keine einzelne Modulauswahl und keine Zahlungspflicht für den
          Initiator.
        </p>
      </section>
      <section className="networkCard">
        <header>
          <div>
            <h2>Texte Ihrer Partnerportal-Startseite</h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <p className="full">
            Diese Texte sehen alle Partner dieses Netzwerks. Leere Felder
            verwenden wieder den Standardtext.
          </p>
          <label className="full">
            Willkommensüberschrift
            <input
              name="welcomeTitle"
              maxLength={160}
              defaultValue={network.settings.welcomeTitle || ""}
              placeholder={`Willkommen im ${network.name} Partnerportal.`}
            />
          </label>
          <label className="full">
            Einleitung unter der Überschrift
            <textarea
              name="welcomeIntro"
              maxLength={600}
              rows={3}
              defaultValue={network.settings.welcomeIntro || ""}
              placeholder="Ihr zentraler Ort für Kontakte, Neuigkeiten, Veranstaltungen und die Zusammenarbeit im Partnerportal."
            />
          </label>
          <label className="full">
            Titel im Bildbanner
            <input
              name="bannerTitle"
              maxLength={160}
              defaultValue={network.settings.bannerTitle || ""}
              placeholder={network.name}
            />
          </label>
          <label className="full">
            Beschreibung im Bildbanner
            <textarea
              name="bannerDescription"
              maxLength={600}
              rows={3}
              defaultValue={network.settings.bannerDescription || ""}
              placeholder="Informationen, Kontakte und Aktivitäten Ihres geschlossenen Partnerportals an einem Ort."
            />
          </label>
          <div className="full networkBannerUpload">
            <strong>Titelbild der Netzwerk-Startseite</strong>
            <label className="networkBannerUploadTarget">
              <img
                src={
                  bannerImage ||
                  (slug === "bayer-giants"
                    ? "/images/network-meeting-sport.webp"
                    : "/images/network-meeting-club.webp")
                }
                alt="Vorschau des Netzwerk-Titelbilds"
              />
              <span>Bild auswählen oder wechseln</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={uploadBanner}
              />
            </label>
            <p>
              Breites Querformat empfohlen · PNG, JPG oder WebP · maximal 1,5
              MB. Das Bild wird beim Speichern für dieses Netzwerk übernommen.
            </p>
            {bannerImage && (
              <button
                type="button"
                className="networkSecondary"
                onClick={() => setBannerImage(null)}
              >
                Standardbild verwenden
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="networkCard">
        <header>
          <div>
            <span>REGELN</span>
            <h2>Aufnahmebedingungen</h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <label className="full">
            Netzwerkregeln
            <textarea
              name="admissionRules"
              rows={6}
              defaultValue={network.settings.admissionRules || ""}
            />
          </label>
          <p className="full">
            Selbstregistrierung und netzwerkübergreifendes Matching bleiben
            deaktiviert.
          </p>
        </div>
      </section>
      <div className="networkSettingsActions">
        <button className="networkPrimary" disabled={busy}>
          {busy
            ? "Wird gespeichert …"
            : network.settings.setupCompletedAt
              ? "Änderungen speichern"
              : "Netzwerk einrichten und zur Übersicht"}
        </button>
      </div>
      {notice && (
        <div className="networkNotice">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </form>
  );
}
