"use client";

import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { partnerBranding } from "../lib/partner-branding";
import { verifyPartnerMediaSave } from "../lib/partner-save-verification";
import { PartnerEditablePreview } from "./partner-editable-preview";
import type { PartnerPageProfile } from "./network-members-workspace";

type Profile = {
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
  publishedAt: string | null;
};
type Response = {
  organization: {
    displayName: string;
    legalName: string;
    websiteUrl: string | null;
  };
  profile: Profile | null;
  canEdit: boolean;
};

export function NetworkProfileWorkspace() {
  const profileForm = useRef<HTMLFormElement>(null),
    [sources, setSources] = useState<string[]>([]),
    [preview, setPreview] = useState<Partial<Profile>>({}),
    [editablePreview, setEditablePreview] = useState<PartnerPageProfile | null>(
      null,
    );
  const access = useNetworkAccess(),
    networkId = access?.networkId || "",
    [data, setData] = useState<Response | null>(null),
    [logo, setLogo] = useState<string | null>(null),
    [hero, setHero] = useState<string | null>(null),
    [sections, setSections] = useState<Array<{ title: string; body: string }>>(
      [],
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !networkId) return;
    portalRequest<Response>(`/networks/${networkId}/profile`, { token })
      .then((value) => {
        setData(value);
        setLogo(value.profile?.logoUrl || null);
        setHero(value.profile?.heroImageUrl || null);
        setSections(value.profile?.sections || []);
      })
      .catch((error) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "Partnerseite konnte nicht geladen werden.",
        ),
      );
  }, [networkId]);
  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Bitte wählen Sie eine Bilddatei.");
      return;
    }
    if (file.size > 1_500_000) {
      setNotice("Das Logo darf maximal 1,5 MB groß sein.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setLogo(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }
  function chooseHero(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_500_000
    ) {
      setNotice("Bitte PNG, JPG oder WebP mit maximal 1,5 MB wählen.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setHero(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }
  async function save(formElement: HTMLFormElement, publish: boolean) {
    const token = getPortalSession();
    if (!token || !networkId) return;
    const form = new FormData(formElement);
    setBusy(true);
    try {
      const profile = await portalRequest<Profile>(
        `/networks/${networkId}/profile`,
        {
          token,
          body: {
            companyName: form.get("companyName"),
            tagline: form.get("tagline"),
            description: form.get("description"),
            services: form.get("services"),
            industries: form.get("industries"),
            street: form.get("street"),
            postalCode: form.get("postalCode"),
            city: form.get("city"),
            country: form.get("country"),
            websiteUrl: form.get("websiteUrl"),
            contactName: form.get("contactName"),
            contactPosition: form.get("contactPosition"),
            contactEmail: form.get("contactEmail"),
            contactPhone: form.get("contactPhone"),
            logoUrl: logo,
            heroImageUrl: hero,
            sections,
            personalMessage: form.get("personalMessage"),
            offers: form.get("offers"),
            lookingFor: form.get("lookingFor"),
            meetingUrl: form.get("meetingUrl"),
            primaryColor: form.get("primaryColor"),
            secondaryColor: form.get("secondaryColor"),
            publish,
          },
        },
      );
      verifyPartnerMediaSave({ heroImageUrl: hero, logoUrl: logo }, profile);
      setData((current) => (current ? { ...current, profile } : current));
      setNotice(
        publish
          ? "Ihre Partnerseite ist jetzt im Netzwerk veröffentlicht."
          : "Entwurf gespeichert. Nur Sie und der Initiator können ihn sehen.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Partnerseite konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget),
      token = getPortalSession();
    if (!token || !networkId) return;
    setBusy(true);
    setNotice(
      "Die öffentliche Homepage wird ausgewertet. Das kann etwa eine Minute dauern …",
    );
    try {
      const result = await portalRequest<{
        draft: Record<string, unknown>;
        sources: string[];
      }>(`/networks/${networkId}/profile/import`, {
        token,
        timeoutMs: 120_000,
        body: {
          websiteUrl: input.get("sourceWebsite"),
          consent: input.get("consent") === "on",
        },
      });
      const changes: Record<string, string> = {};
      if (
        Array.isArray(result.draft.sections) &&
        (!sections.length || input.get("replace") === "on")
      )
        setSections(
          result.draft.sections as Array<{ title: string; body: string }>,
        );
      for (const [name, value] of Object.entries(result.draft)) {
        const field = profileForm.current?.elements.namedItem(name);
        if (
          typeof value === "string" &&
          value &&
          (field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement) &&
          (!field.value.trim() || input.get("replace") === "on")
        ) {
          field.value = value;
          changes[name] = value;
        }
      }
      setPreview((current) => ({ ...current, ...changes }));
      setSources(result.sources);
      setNotice(
        "PagePilot-AI-Entwurf übernommen, noch nicht gespeichert oder veröffentlicht. Bitte Texte und Inhaltsbereiche prüfen, persönliche Angaben und Bilder ergänzen.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Homepage konnte nicht ausgewertet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <p role="status">Partnerseite wird geladen …</p>;
  const p = { ...data.profile, ...preview };
  function openEditablePreview() {
    const fields = profileForm.current
      ? Object.fromEntries(new FormData(profileForm.current).entries())
      : {};
    const empty = Object.fromEntries(
      [
        "tagline",
        "description",
        "services",
        "industries",
        "street",
        "postalCode",
        "city",
        "country",
        "contactName",
        "contactPosition",
        "contactEmail",
        "contactPhone",
        "personalMessage",
        "offers",
        "lookingFor",
      ].map((key) => [key, ""]),
    );
    setEditablePreview({
      ...empty,
      ...p,
      ...fields,
      companyName: String(
        fields.companyName || p.companyName || data!.organization.displayName,
      ),
      status: p.status || "draft",
      updatedAt: p.updatedAt || "",
      websiteUrl: String(fields.websiteUrl || ""),
      logoUrl: logo,
      heroImageUrl: hero,
      sections,
    } as PartnerPageProfile);
  }
  async function saveEditablePreview(value: PartnerPageProfile) {
    const token = getPortalSession();
    if (!token || !data?.canEdit)
      throw new Error("Bitte melde dich erneut an.");
    const saved = await portalRequest<Profile>(
      `/networks/${networkId}/profile`,
      { token, body: { ...value, publish: value.status === "published" } },
    );
    verifyPartnerMediaSave(value, saved);
    setData((current) => (current ? { ...current, profile: saved } : current));
    setPreview(saved);
    setHero(saved.heroImageUrl || null);
    setLogo(saved.logoUrl);
    setSections(saved.sections || []);
    for (const [key, value] of Object.entries(saved)) {
      const element = profileForm.current?.elements.namedItem(key);
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
        element.value = typeof value === "string" ? value : "";
    }
    return saved;
  }
  return (
    <div className="networkProfileWorkspace">
      {data.canEdit && (
        <section className="partnerPreviewEntry">
          <div>
            <h2>Deine Seite aus Sicht der Partner</h2>
            <p>
              Öffne die Vorschau und bearbeite Texte, Bilder und Kontaktdaten
              direkt am Stiftsymbol.
            </p>
          </div>
          <button
            type="button"
            className="networkPrimary"
            disabled={busy}
            onClick={openEditablePreview}
          >
            Vorschau öffnen & bearbeiten
          </button>
        </section>
      )}
      <section className="networkProfileGuide">
        <div>
          <span>IHRE PARTNERSEITE</span>
          <h2>In drei übersichtlichen Schritten sichtbar werden</h2>
          <p>
            Diese Angaben sind ausschließlich für freigegebene Mitglieder dieses
            Netzwerks sichtbar. Sie erscheinen nicht öffentlich und nicht in
            anderen Netzwerken.
          </p>
        </div>
        <ol>
          <li>
            <b>1</b>
            <span>
              <strong>Unternehmen zeigen</strong>
              <small>Logo, Name, Kurzbeschreibung und Adresse</small>
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>Leistungen erklären</strong>
              <small>Was Sie anbieten und für wen Sie arbeiten</small>
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>Kontakt ermöglichen</strong>
              <small>
                Persönlicher Ansprechpartner und direkte Kontaktdaten
              </small>
            </span>
          </li>
        </ol>
      </section>
      {data.canEdit && (
        <section className="networkCard networkCompanyImport">
          <header>
            <h2>PagePilot AI · Aus deiner Homepage wird deine Partnerseite</h2>
          </header>
          <form onSubmit={importWebsite}>
            <p>
              PagePilot AI recherchiert deine öffentliche Homepage und relevante
              Unterseiten über OpenAI. Daraus entsteht ein bearbeitbarer
              Onepager-Entwurf mit Vorstellung, Leistungen und weiteren
              passenden Inhaltsbereichen. Du prüfst und veröffentlichst selbst.
              Unbekannte Angaben bleiben leer; Herobild und persönliche
              Netzwerkangebote ergänzt du selbst.
            </p>
            <label>
              Firmenhomepage
              <input
                name="sourceWebsite"
                type="url"
                required
                defaultValue={data.organization.websiteUrl || ""}
                placeholder="https://www.ihr-unternehmen.de"
              />
            </label>
            <label className="networkImportCheck">
              <input name="consent" type="checkbox" required />
              Ich möchte die angegebene öffentliche Homepage mit OpenAI
              auswerten lassen.
            </label>
            <label className="networkImportCheck">
              <input name="replace" type="checkbox" />
              Bereits ausgefüllte Textfelder ersetzen (standardmäßig bleiben sie
              erhalten)
            </label>
            <button className="networkPrimary" disabled={busy}>
              {busy
                ? "PagePilot AI analysiert deine Homepage …"
                : "Partnerseite mit PagePilot AI vorbereiten"}
            </button>
            {sources.length > 0 && (
              <details>
                <summary>Recherchequellen ansehen</summary>
                {sources.map((url) => (
                  <p key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  </p>
                ))}
              </details>
            )}
          </form>
        </section>
      )}
      <form
        ref={profileForm}
        noValidate
        onChange={(event) => {
          const fields = new FormData(event.currentTarget);
          setPreview(
            Object.fromEntries(
              [...fields.entries()].filter(
                ([, value]) => typeof value === "string",
              ),
            ) as Partial<Profile>,
          );
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget, false);
        }}
      >
        <div className="networkProfileLayout">
          <div className="networkProfileForm">
            <section className="networkCard">
              <header>
                <div>
                  <h2>Gestalte deine Partnerseite</h2>
                  <p>
                    Zeig, was dein Unternehmen ausmacht – mit einem starken
                    Titelbild und persönlichen Inhalten.
                  </p>
                </div>
              </header>
              <div className="partnerPageEditor">
                <div className="partnerHeroEditor">
                  <div>
                    <h3>Dein Titelbild</h3>
                    <p>
                      Dieses Bild begrüßt andere Partner ganz oben auf deiner
                      Partnerseite.
                    </p>
                  </div>
                  <label
                    className={`partnerHeroPicker${hero ? " hasImage" : ""}`}
                  >
                    {hero ? (
                      <img
                        src={hero}
                        alt="Dein Titelbild – Vorschau für die Partnerseite"
                      />
                    ) : (
                      <span
                        className="partnerHeroPlaceholder"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 64 48" fill="none">
                          <rect x="2" y="2" width="60" height="44" rx="7" />
                          <circle cx="20" cy="16" r="5" />
                          <path d="m5 40 17-17 12 12 10-12 17 17" />
                        </svg>
                      </span>
                    )}
                    <span className="partnerHeroPickerCaption">
                      <strong>
                        {hero
                          ? "Titelbild ändern"
                          : "Titelbild auswählen und hochladen"}
                      </strong>
                      <span>
                        {hero
                          ? "Klicke hier, um ein anderes Bild auszuwählen"
                          : "Klicke hier und wähle ein Bild deines Unternehmens"}
                      </span>
                    </span>
                    <input
                      className="partnerHeroFileInput"
                      aria-label={
                        hero ? "Titelbild ändern" : "Titelbild hochladen"
                      }
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseHero}
                      disabled={!data.canEdit || busy}
                    />
                  </label>
                  <div className="partnerHeroHelp">
                    <small>
                      Querformat empfohlen · z. B. 1.920 × 800 Pixel · PNG, JPG
                      oder WebP · maximal 1,5 MB
                    </small>
                    {hero && (
                      <button
                        type="button"
                        className="networkSecondary"
                        disabled={!data.canEdit || busy}
                        onClick={() => setHero(null)}
                      >
                        Titelbild entfernen
                      </button>
                    )}
                  </div>
                </div>
                <div className="partnerContentHeading">
                  <h3>Mehr über dein Unternehmen</h3>
                  <p>
                    Ergänze zum Beispiel deine Arbeitsweise, Projekte oder das,
                    was du im Netzwerk suchst.
                  </p>
                </div>
                {sections.map((section, index) => (
                  <fieldset className="full partnerSectionEditor" key={index}>
                    <legend>Inhaltsbereich {index + 1}</legend>
                    <label>
                      Überschrift
                      <input
                        placeholder="Zum Beispiel: Was uns besonders macht"
                        value={section.title}
                        maxLength={160}
                        disabled={!data.canEdit}
                        onChange={(event) =>
                          setSections((current) =>
                            current.map((s, i) =>
                              i === index
                                ? { ...s, title: event.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Inhalt
                      <textarea
                        placeholder="Stell dein Unternehmen persönlich vor. Was sollten andere Partner über euch wissen?"
                        value={section.body}
                        maxLength={3000}
                        rows={5}
                        disabled={!data.canEdit}
                        onChange={(event) =>
                          setSections((current) =>
                            current.map((s, i) =>
                              i === index
                                ? { ...s, body: event.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </label>
                    <div>
                      <button
                        type="button"
                        disabled={!data.canEdit || index === 0}
                        onClick={() =>
                          setSections((current) => {
                            const next = [...current];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            return next;
                          })
                        }
                      >
                        Nach oben
                      </button>
                      <button
                        type="button"
                        disabled={
                          !data.canEdit || index === sections.length - 1
                        }
                        onClick={() =>
                          setSections((current) => {
                            const next = [...current];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            return next;
                          })
                        }
                      >
                        Nach unten
                      </button>
                      <button
                        type="button"
                        disabled={!data.canEdit}
                        onClick={() =>
                          setSections((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Bereich entfernen
                      </button>
                    </div>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="partnerAddSection"
                  disabled={!data.canEdit || sections.length >= 30}
                  onClick={() =>
                    setSections((current) => [
                      ...current,
                      { title: "", body: "" },
                    ])
                  }
                >
                  + Weiteren Bereich hinzufügen
                </button>
              </div>
            </section>
            <section className="networkCard">
              <header>
                <div>
                  <span>SCHRITT 1</span>
                  <h2>Unternehmen und Auftritt</h2>
                  <p>
                    So erkennen andere Mitglieder Ihr Unternehmen auf den ersten
                    Blick.
                  </p>
                </div>
              </header>
              <div className="networkProfileFields">
                <label>
                  Unternehmensfarbe
                  <input
                    type="color"
                    name="primaryColor"
                    defaultValue={p.primaryColor || "#292929"}
                    disabled={!data.canEdit}
                  />
                  <small>
                    Für Ihre Partnerkachel und Ihre Unternehmensseite – nicht
                    für das Netzwerkportal.
                  </small>
                </label>
                <label>
                  Zweite Unternehmensfarbe
                  <input
                    type="color"
                    name="secondaryColor"
                    defaultValue={
                      p.secondaryColor || p.primaryColor || "#454545"
                    }
                    disabled={!data.canEdit}
                  />
                  <small>
                    Ergänzende Farbe für Ihren Unternehmensauftritt.
                  </small>
                </label>
                <label className="networkLogoUpload">
                  <span>Firmenlogo</span>
                  <div>
                    {logo ? (
                      <img src={logo} alt="Logo-Vorschau" />
                    ) : (
                      <b aria-hidden="true">＋</b>
                    )}
                    <p>
                      <strong>Logo auswählen</strong>
                      <small>PNG, JPG oder WebP · maximal 1,5 MB</small>
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={chooseLogo}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Unternehmensname
                  <input
                    name="companyName"
                    required
                    defaultValue={
                      p?.companyName || data.organization.displayName
                    }
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Kurzversprechen
                  <input
                    name="tagline"
                    required
                    maxLength={180}
                    defaultValue={p?.tagline || ""}
                    placeholder="In einem Satz: Wofür steht Ihr Unternehmen?"
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Persönliche Unternehmensbeschreibung
                  <textarea
                    name="description"
                    required
                    rows={6}
                    maxLength={3000}
                    defaultValue={p?.description || ""}
                    placeholder="Wer sind Sie, was zeichnet Sie aus und wie arbeiten Sie mit Partnern zusammen?"
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Straße und Hausnummer
                  <input
                    name="street"
                    required
                    defaultValue={p?.street || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Postleitzahl
                  <input
                    name="postalCode"
                    required
                    defaultValue={p?.postalCode || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Ort
                  <input
                    name="city"
                    required
                    defaultValue={p?.city || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Land
                  <input
                    name="country"
                    required
                    defaultValue={p?.country || "Deutschland"}
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Firmenhomepage
                  <input
                    name="websiteUrl"
                    type="url"
                    defaultValue={
                      p?.websiteUrl || data.organization.websiteUrl || ""
                    }
                    placeholder="https://www.ihr-unternehmen.de"
                    disabled={!data.canEdit}
                  />
                </label>
              </div>
            </section>
            <section className="networkCard">
              <header>
                <div>
                  <span>SCHRITT 2</span>
                  <h2>Leistungen und Erfahrung</h2>
                  <p>
                    Beschreiben Sie verständlich, wobei andere Partner Sie
                    ansprechen können.
                  </p>
                </div>
              </header>
              <div className="networkProfileFields">
                <label className="wide">
                  Leistungen und Kompetenzen
                  <textarea
                    name="services"
                    required
                    rows={7}
                    maxLength={2000}
                    defaultValue={p?.services || ""}
                    placeholder="Welche Leistungen bieten Sie konkret an? Welche Probleme lösen Sie?"
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Branchen und Zielgruppen
                  <input
                    name="industries"
                    maxLength={800}
                    defaultValue={p?.industries || ""}
                    placeholder="z. B. Sport, Mittelstand, Handel, Industrie"
                    disabled={!data.canEdit}
                  />
                </label>
              </div>
            </section>
            <section className="networkCard">
              <header>
                <div>
                  <span>SCHRITT 3</span>
                  <h2>Persönlicher Ansprechpartner</h2>
                  <p>
                    Mitglieder können unmittelbar die richtige Person
                    kontaktieren.
                  </p>
                </div>
              </header>
              <div className="networkProfileFields">
                <label>
                  Name
                  <input
                    name="contactName"
                    required
                    defaultValue={p?.contactName || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Position / Funktion
                  <input
                    name="contactPosition"
                    required
                    defaultValue={p?.contactPosition || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  E-Mail
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    defaultValue={p?.contactEmail || ""}
                    disabled={!data.canEdit}
                  />
                </label>
                <label>
                  Telefon
                  <input
                    name="contactPhone"
                    type="tel"
                    required
                    defaultValue={p?.contactPhone || ""}
                    disabled={!data.canEdit}
                  />
                </label>
              </div>
            </section>
            <section className="networkCard">
              <header>
                <div>
                  <span>OPTIONAL · PERSÖNLICH IM NETZWERK</span>
                  <h2>Persönliches & Zusammenarbeit</h2>
                  <p>
                    Was möchten Sie mit anderen Partnern teilen? Zeigen Sie
                    Angebote, Gesuche und Gesprächsanlässe aus Ihrer
                    persönlichen Sicht.
                  </p>
                </div>
              </header>
              <div className="networkProfileFields">
                <label className="wide">
                  Meine Mitteilung an das Netzwerk
                  <textarea
                    name="personalMessage"
                    rows={5}
                    maxLength={3000}
                    defaultValue={p.personalMessage || ""}
                    placeholder="Was bewegt Sie gerade? Worüber möchten Sie sich austauschen?"
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Das biete ich an
                  <textarea
                    name="offers"
                    rows={4}
                    maxLength={2000}
                    defaultValue={p.offers || ""}
                    placeholder="Aktuelle Angebote, Unterstützung oder gemeinsame Projekte"
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Das suche ich
                  <textarea
                    name="lookingFor"
                    rows={4}
                    maxLength={2000}
                    defaultValue={p.lookingFor || ""}
                    placeholder="Gesuchte Kontakte, Leistungen, Kooperationen oder Erfahrungen"
                    disabled={!data.canEdit}
                  />
                </label>
                <label className="wide">
                  Link zur Online-Terminbuchung
                  <input
                    name="meetingUrl"
                    type="url"
                    maxLength={500}
                    defaultValue={p.meetingUrl || ""}
                    placeholder="https://… – z. B. Ihre Terminbuchungsseite"
                    disabled={!data.canEdit}
                  />
                  <small>
                    Besucher öffnen Ihre externe Buchungsseite und wählen dort
                    einen Termin. Es wird nichts automatisch gebucht.
                  </small>
                </label>
              </div>
            </section>
          </div>
          <aside className="networkProfilePreview" style={partnerBranding(p)}>
            <small>VORSCHAU IM PARTNERVERZEICHNIS</small>
            <div className="networkProfileLogo">
              {logo ? (
                <img src={logo} alt="" />
              ) : (
                (p?.companyName || data.organization.displayName)
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <span
              className={`networkMemberStatus ${p?.status === "published" ? "active" : "pending"}`}
            >
              {p?.status === "published" ? "Veröffentlicht" : "Entwurf"}
            </span>
            <h2>{p?.companyName || data.organization.displayName}</h2>
            <p>{p?.tagline || "Ihr Kurzversprechen erscheint hier."}</p>
            <hr />
            <b>Was wir anbieten</b>
            <p>
              {p?.services ||
                "Beschreiben Sie Ihre wichtigsten Leistungen und Kompetenzen."}
            </p>
            <small>Nur innerhalb dieses Netzwerks sichtbar</small>
          </aside>
        </div>
        {data.canEdit && (
          <div className="networkProfileActions">
            <button type="submit" disabled={busy}>
              Entwurf speichern
            </button>
            <button
              className="networkPrimary"
              type="button"
              disabled={busy}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form?.reportValidity()) void save(form, true);
              }}
            >
              {busy ? "Wird gespeichert …" : "Partnerseite veröffentlichen"}
            </button>
          </div>
        )}
      </form>
      {editablePreview && (
        <PartnerEditablePreview
          initial={editablePreview}
          userId={access?.currentUserId || ""}
          onSave={saveEditablePreview}
          onClose={() => setEditablePreview(null)}
        />
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
