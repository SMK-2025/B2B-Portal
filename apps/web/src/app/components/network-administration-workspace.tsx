"use client";
import { NetworkText } from "./network-text-editor";
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
                <small>
                  <NetworkText id="ui.network-administration-workspace.aeefb4574f4569d3">
                    Aktueller Datenstand
                  </NetworkText>
                </small>
              </span>
            </article>
          ))}
        </section>
        <section className="networkCard">
          <header>
            <div>
              <span>
                <NetworkText id="ui.network-administration-workspace.43eac9ee84df3204">
                  AKTIVITÄT
                </NetworkText>
              </span>
              <h2>
                <NetworkText id="ui.network-administration-workspace.4476f45baa2edacd">
                  Letzte Netzwerkaktivitäten
                </NetworkText>
              </h2>
            </div>
            <button onClick={() => window.print()}>
              <NetworkText id="ui.network-administration-workspace.0052e8965a466048">
                Drucken
              </NetworkText>
            </button>
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
                <b>
                  <NetworkText id="ui.network-administration-workspace.a7749b9b03602566">
                    Noch keine Aktivitäten
                  </NetworkText>
                </b>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  if (!access?.isInitiator)
    return (
      <section className="networkCard networkLoading">
        <p>
          <NetworkText id="ui.network-administration-workspace.36655c42c94c500b">
            Nur der Initiator darf den Netzwerkauftritt verwalten.
          </NetworkText>
        </p>
      </section>
    );
  return (
    <form className="networkSettingsForm" onSubmit={save}>
      {!network.settings.setupCompletedAt && (
        <section className="networkSetupIntro">
          <span>
            <NetworkText id="ui.network-administration-workspace.b6c6a3edb3f9b1ca">
              ERSTEINRICHTUNG
            </NetworkText>
          </span>
          <h2>
            <NetworkText id="ui.network-administration-workspace.9e2da667da1c0357">
              Gestalten Sie die gemeinsame Startseite Ihres Partnernetzwerks.
            </NetworkText>
          </h2>
          <p>
            <NetworkText id="ui.network-administration-workspace.10dc787cbd43b7dc">
              Legen Sie Name, Logo, Farben und Netzwerkregeln fest. Alle
              Funktionen sind enthalten; die Netzwerkverwaltung bleibt für
              Initiatoren kostenlos.
            </NetworkText>
          </p>
        </section>
      )}
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-administration-workspace.d92677290c642919">
                KOSTENLOS INKLUSIVE
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-administration-workspace.9cf9d6f16baa82f9">
                Whitelabel und Stammdaten
              </NetworkText>
            </h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <label>
            <NetworkText id="ui.network-administration-workspace.177da3226573b01b">
              Netzwerkname
            </NetworkText>
            <input name="name" required defaultValue={network.name} />
          </label>
          <label>
            <NetworkText id="ui.network-administration-workspace.24e3a0843b8b5c99">
              Rechtlicher Name
            </NetworkText>
            <input name="legalName" defaultValue={network.legalName || ""} />
          </label>
          <label>
            <NetworkText id="ui.network-administration-workspace.b5a229ac8becc603">
              Website
            </NetworkText>
            <input
              name="websiteUrl"
              type="url"
              defaultValue={network.websiteUrl || ""}
            />
          </label>
          <label className="networkLogoUpload">
            <NetworkText id="ui.network-administration-workspace.f773b51ce730c1cf">
              Netzwerklogo
            </NetworkText>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={uploadLogo}
            />
            <small>
              <NetworkText id="ui.network-administration-workspace.d6db3a77357954fe">
                PNG, JPG, WebP oder SVG · maximal 1,5 MB
              </NetworkText>
            </small>
          </label>
          {logo && (
            <div className="networkLogoPreview">
              <img src={logo} alt="Vorschau des Netzwerklogos" />
              <button type="button" onClick={() => setLogo(null)}>
                <NetworkText id="ui.network-administration-workspace.256f3d2e173567a3">
                  Logo entfernen
                </NetworkText>
              </button>
            </div>
          )}
          <label>
            <NetworkText id="ui.network-administration-workspace.fe0a128a4d0c1138">
              Primärfarbe
            </NetworkText>
            <input
              name="primaryColor"
              type="color"
              defaultValue={network.primaryColor}
            />
          </label>
          <label>
            <NetworkText id="ui.network-administration-workspace.6fe84f7f5298c126">
              Sekundärfarbe
            </NetworkText>
            <input
              name="secondaryColor"
              type="color"
              defaultValue={network.secondaryColor}
            />
          </label>
          <p className="full">
            <NetworkText id="ui.network-administration-workspace.4eb14e7342bf072e">
              Nur der Initiator kann Logo, Farben und Netzwerkauftritt
              verändern.
            </NetworkText>
          </p>
        </div>
      </section>
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-administration-workspace.353fe9cfae8bb8b5">
                ALLE FUNKTIONEN INKLUSIVE
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-administration-workspace.33b57b1bb6194bd3">
                Kostenlose Netzwerkverwaltung für Initiatoren
              </NetworkText>
            </h2>
            <p>
              <NetworkText id="ui.network-administration-workspace.b777408d12943703">
                Partnermitglieder buchen ihren eigenen vollständigen Zugang bei
                der Registrierung für zwölf Monate im Voraus. Den individuellen
                Mitgliedspreis bestimmt ausschließlich der Plattforminhaber.
              </NetworkText>
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
            <h2>
              <NetworkText id="ui.network-administration-workspace.8e708612ef76f6a2">
                Texte Ihrer Partnerportal-Startseite
              </NetworkText>
            </h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <p className="full">
            <NetworkText id="ui.network-administration-workspace.7554f451997ea743">
              Diese Texte sehen alle Partner dieses Netzwerks. Leere Felder
              verwenden wieder den Standardtext.
            </NetworkText>
          </p>
          <label className="full">
            <NetworkText id="ui.network-administration-workspace.2b539a69bc2bbdeb">
              Willkommensüberschrift
            </NetworkText>
            <input
              name="welcomeTitle"
              maxLength={160}
              defaultValue={network.settings.welcomeTitle || ""}
              placeholder={`Willkommen im ${network.name} Partnerportal.`}
            />
          </label>
          <label className="full">
            <NetworkText id="ui.network-administration-workspace.7cb79c746a59728d">
              Einleitung unter der Überschrift
            </NetworkText>
            <textarea
              name="welcomeIntro"
              maxLength={600}
              rows={3}
              defaultValue={network.settings.welcomeIntro || ""}
              placeholder="Ihr zentraler Ort für Kontakte, Neuigkeiten, Veranstaltungen und die Zusammenarbeit im Partnerportal."
            />
          </label>
          <label className="full">
            <NetworkText id="ui.network-administration-workspace.bbb3595e96362225">
              Titel im Bildbanner
            </NetworkText>
            <input
              name="bannerTitle"
              maxLength={160}
              defaultValue={network.settings.bannerTitle || ""}
              placeholder={network.name}
            />
          </label>
          <label className="full">
            <NetworkText id="ui.network-administration-workspace.665b5269f18ff0e8">
              Beschreibung im Bildbanner
            </NetworkText>
            <textarea
              name="bannerDescription"
              maxLength={600}
              rows={3}
              defaultValue={network.settings.bannerDescription || ""}
              placeholder="Informationen, Kontakte und Aktivitäten Ihres geschlossenen Partnerportals an einem Ort."
            />
          </label>
          <div className="full networkBannerUpload">
            <strong>
              <NetworkText id="ui.network-administration-workspace.bbe8757c87f77529">
                Titelbild der Netzwerk-Startseite
              </NetworkText>
            </strong>
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
              <span>
                <NetworkText id="ui.network-administration-workspace.58a90e7a1ea7bf85">
                  Bild auswählen oder wechseln
                </NetworkText>
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={uploadBanner}
              />
            </label>
            <p>
              <NetworkText id="ui.network-administration-workspace.c043a2900daa89de">
                Breites Querformat empfohlen · PNG, JPG oder WebP · maximal 1,5
                MB. Das Bild wird beim Speichern für dieses Netzwerk übernommen.
              </NetworkText>
            </p>
            {bannerImage && (
              <button
                type="button"
                className="networkSecondary"
                onClick={() => setBannerImage(null)}
              >
                <NetworkText id="ui.network-administration-workspace.4090ef16852c9d78">
                  Standardbild verwenden
                </NetworkText>
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-administration-workspace.428c9f62700675af">
                REGELN
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-administration-workspace.d67f5259852d7d89">
                Aufnahmebedingungen
              </NetworkText>
            </h2>
          </div>
        </header>
        <div className="networkSettingsFields">
          <label className="full">
            <NetworkText id="ui.network-administration-workspace.9e5e27673f99022c">
              Netzwerkregeln
            </NetworkText>
            <textarea
              name="admissionRules"
              rows={6}
              defaultValue={network.settings.admissionRules || ""}
            />
          </label>
          <p className="full">
            <NetworkText id="ui.network-administration-workspace.136ce5141c37f92b">
              Selbstregistrierung und netzwerkübergreifendes Matching bleiben
              deaktiviert.
            </NetworkText>
          </p>
        </div>
      </section>
      <div className="networkSettingsActions">
        <button className="networkPrimary" disabled={busy}>
          <NetworkText id="ui.network-administration-workspace.12a6625a680d5202">
            {busy
              ? "Wird gespeichert …"
              : network.settings.setupCompletedAt
                ? "Änderungen speichern"
                : "Netzwerk einrichten und zur Übersicht"}
          </NetworkText>
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
