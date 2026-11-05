"use client";
import { PartnerDocumentsEditor, type PartnerDocument } from "./partner-documents";
import { NetworkText } from "./network-text-editor";

import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import "./partner-setup.css";
import { useNetworkAccess } from "./network-shell";
import { partnerBranding } from "../lib/partner-branding";
import { verifyPartnerMediaSave } from "../lib/partner-save-verification";
import { PartnerEditablePreview } from "./partner-editable-preview";
import type { PartnerPageProfile } from "./network-members-workspace";

type Profile = {
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

export function NetworkProfileWorkspace({
  service,
}: { service?: { networkId: string; userId: string } } = {}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnToSetup=useRef(false);
  const [step, setStep] = useState(0);
  const [aiResult,setAiResult]=useState<{fields:number;sections:number;missing:string[]}|null>(null);
  const [aiWorking,setAiWorking]=useState(false);
  const steps = ["Unternehmen", "Leistungen", "Gestaltung", "Kontakt"];
  const autoOpen = useRef(false);
  const profileForm = useRef<HTMLFormElement>(null),
    [sources, setSources] = useState<string[]>([]),
    [preview, setPreview] = useState<Partial<Profile>>({}),
    [editablePreview, setEditablePreview] = useState<PartnerPageProfile | null>(
      null,
    );
  const access = useNetworkAccess(),
    networkId = service?.networkId || access?.networkId || "",
    profilePath = service
      ? `/networks/admin/${networkId}/service-members/${service.userId}/profile`
      : `/networks/${networkId}/profile`,
    [data, setData] = useState<Response | null>(null),
    [logo, setLogo] = useState<string | null>(null),
    [hero, setHero] = useState<string | null>(null),
    [documents, setDocuments] = useState<PartnerDocument[]>([]),
    [readingDocuments, setReadingDocuments] = useState(false),
    [sections, setSections] = useState<
      Array<{ title: string; body: string; area?: string }>
    >([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !networkId) return;
    portalRequest<Response>(profilePath, { token })
      .then((value) => {
        setData(value);
        autoOpen.current =
          value.canEdit &&
          (!value.profile ||
            new URLSearchParams(window.location.search).has("einrichten"));
        setLogo(value.profile?.logoUrl || null);
        setHero(value.profile?.heroImageUrl || null);
        setSections(value.profile?.sections || []);
        setDocuments(value.profile?.documents || []);
      })
      .catch((error) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "Partnerseite konnte nicht geladen werden.",
        ),
      );
  }, [networkId, profilePath]);
  const reviewed = useRef(false);
  useEffect(() => {
    if (
      data &&
      !service &&
      !reviewed.current &&
      new URLSearchParams(location.search).has("pruefen")
    ) {
      reviewed.current = true;
      openEditablePreview();
    }
  }, [data, service]);
  useEffect(() => {
    if (data && autoOpen.current) {
      autoOpen.current = false;
      dialog.current?.showModal();
    }
  }, [data]);
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
    if (readingDocuments || busy) return;
    const token = getPortalSession();
    if (!token || !networkId) return;
    const form = new FormData(formElement);
    setBusy(true);
    try {
      const profile = await portalRequest<Profile>(profilePath, {
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
          documents,
          personalMessage: form.get("personalMessage"),
          offers: form.get("offers"),
          lookingFor: form.get("lookingFor"),
          meetingUrl: form.get("meetingUrl"),
          primaryColor: form.get("primaryColor"),
          secondaryColor: form.get("secondaryColor"),
          publish,
        },
      });
      verifyPartnerMediaSave({ heroImageUrl: hero, logoUrl: logo }, profile);
      setData((current) => (current ? { ...current, profile } : current));
      if (publish) dialog.current?.close();
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
    if (readingDocuments || busy) return;
    const input = new FormData(event.currentTarget),
      token = getPortalSession();
    if (!token || !networkId) return;
    setBusy(true);
    setAiWorking(true);
    setNotice(
      "Die öffentliche Homepage wird ausgewertet. Das kann etwa eine Minute dauern …",
    );
    try {
      const result = await portalRequest<{
        draft: Record<string, unknown>;
        sources: string[];
        missing?:string[];
      }>(profilePath + "/import", {
        token,
        timeoutMs: 180_000,
        body: {
          websiteUrl: input.get("sourceWebsite"),
          consent: input.get("consent") === "on",
        },
      });
      const changes: Record<string, string> = {};
      const replace=input.get('replace')==='on';
      if(typeof result.draft.logoUrl==='string' && (!logo||replace))setLogo(result.draft.logoUrl);
      if(typeof result.draft.heroImageUrl==='string' && (!hero||replace))setHero(result.draft.heroImageUrl);
      if (
        Array.isArray(result.draft.sections) &&
        (!sections.length || input.get("replace") === "on")
      )
        setSections(
          result.draft.sections as Array<{
            title: string;
            body: string;
            area?: string;
          }>,
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
      setAiResult({fields:Object.keys(changes).length,sections:Array.isArray(result.draft.sections)?result.draft.sections.length:0,missing:result.missing||[]});
      setNotice(
        "Deine Unternehmensseite ist vorbereitet. Schau dir die Vorschau an und veröffentliche sie nach deiner Prüfung. Noch wurde nichts gespeichert.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Homepage konnte nicht ausgewertet werden.",
      );
    } finally {
      setBusy(false);
      setAiWorking(false);
    }
  }
  if (!data)
    return (
      <p role="status">
        <NetworkText id="ui.network-profile-workspace.27799630fcbecccf">
          Partnerseite wird geladen …
        </NetworkText>
      </p>
    );
  const p = { ...data.profile, ...preview };
  function openEditablePreview() {
    returnToSetup.current=Boolean(dialog.current?.open);
    dialog.current?.close();
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
      documents,
      sections,
    } as PartnerPageProfile);
  }
  async function saveEditablePreview(value: PartnerPageProfile) {
    const token = getPortalSession();
    if (!token || !data?.canEdit)
      throw new Error("Bitte melde dich erneut an.");
    const saved = await portalRequest<Profile>(profilePath, {
      token,
      body: { ...value, publish: value.status === "published" },
    });
    verifyPartnerMediaSave(value, saved);
    setData((current) => (current ? { ...current, profile: saved } : current));
    setPreview(saved);
    setHero(saved.heroImageUrl || null);
    setLogo(saved.logoUrl);
    setSections(saved.sections || []);
    setDocuments(saved.documents || []);
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
            <h2>
              <NetworkText id="ui.network-profile-workspace.fabf96449c76483d">
                Deine Seite aus Sicht der Partner
              </NetworkText>
            </h2>
            <p>
              <NetworkText id="ui.network-profile-workspace.91fe4e1a8af28acd">
                Öffne die Vorschau und bearbeite Texte, Bilder und Kontaktdaten
                direkt am Stiftsymbol.
              </NetworkText>
            </p>
          </div>
          <button
            type="button"
            className="networkPrimary"
            disabled={busy}
            onClick={openEditablePreview}
          >
            <NetworkText id="ui.network-profile-workspace.63bdf8145020b810">
              Vorschau öffnen & bearbeiten
            </NetworkText>
          </button>
        </section>
      )}
      {data.canEdit && (
        <section className="partnerSetupEntry">
          <div>
            <small>
              <NetworkText id="ui.network-profile-workspace.173cd356890598a2">
                DEIN NETZWERKAUFTRITT
              </NetworkText>
            </small>
            <h2>
              <NetworkText id="ui.network-profile-workspace.ddb10ad58d642477">
                {data.profile
                  ? "Deine Partnerseite gestalten"
                  : "Stell dein Unternehmen vor"}
              </NetworkText>
            </h2>
            <p>
              <NetworkText id="ui.network-profile-workspace.27d8fa195e93b721">
                Vom ersten Kurzprofil bis zur fertigen Seite: Du kannst
                jederzeit einen Entwurf speichern.
              </NetworkText>
            </p>
          </div>
          <button
            className="networkPrimary"
            onClick={() => {
              setStep(0);
              dialog.current?.showModal();
            }}
          >
            <NetworkText id="ui.network-profile-workspace.e721fe556a3946d3">
              {data.profile ? "Einrichtung öffnen" : "Partnerseite einrichten"}
            </NetworkText>{" "}
            →
          </button>
        </section>
      )}
      <dialog
        ref={dialog}
        open={!data.canEdit || undefined}
        className="partnerSetupDialog"
        data-step={step}
        aria-labelledby="setup-title"
      >
        <header className="setupHead">
          <small>
            <NetworkText id="ui.network-profile-workspace.d98049d4627d1949">
              PARTNERSEITE · SCHRITT{" "}
            </NetworkText>
            {step + 1}
            <NetworkText id="ui.network-profile-workspace.52b1ba331ccbeef1">
              VON 4
            </NetworkText>
          </small>
          <h2 id="setup-title">{steps[step]}</h2>
          {data.canEdit && (
            <button
              type="button"
              aria-label="Einrichtung schließen"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          )}
          <nav aria-label="Einrichtungsschritte">
            {steps.map((s, i) => (
              <button
                type="button"
                key={s}
                aria-current={step === i ? "step" : undefined}
                onClick={() => setStep(i)}
              >
                {i + 1} · {s}
              </button>
            ))}
          </nav>
        </header>
        {data.canEdit && (
          <details
            className="networkCard networkCompanyImport pagePilotStudio"
            open
            hidden={step !== 0}
          >
            <summary>
              <NetworkText id="ui.network-profile-workspace.ddd220b09055c251">
                ✦ PagePilot AI · Deine Homepage wird zur Unternehmensseite
              </NetworkText>
            </summary>
            <header>
              <h2>
                <NetworkText id="ui.network-profile-workspace.ac32b98b4710f872">
                  Deine Website rein. Deine Partnerseite vorbereitet.
                </NetworkText>
              </h2>
            </header>
            <form onSubmit={importWebsite}>
              <p>
                <NetworkText id="ui.network-profile-workspace.01f221c05f13332a">
                  Unser innovativer Seitenassistent übernimmt verfügbare Texte,
                  Logo und Titelbild, erkennt Leistungen und ordnet Inhalte in
                  deine Rubriken ein. Du siehst das Ergebnis direkt als bearbeitbare
                  Unternehmensseite. Prüfen, verfeinern, veröffentlichen – ganz ohne leere Seite.
                </NetworkText>
              </p>
              <div className="pagePilotFeatures" aria-label="Automatische Vorbereitung">
                <span>↗ Homepage verstehen</span><span>▧ Bilder übernehmen</span><span>☷ Inhalte einordnen</span><span>✎ Alles bearbeitbar</span>
              </div>
              <label>
                <NetworkText id="ui.network-profile-workspace.5c542a37edb01ebf">
                  Firmenhomepage
                </NetworkText>
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
                <NetworkText id="ui.network-profile-workspace.3ae4e3f412f3456e">
                  Ich möchte meine öffentliche Firmenhomepage mit PagePilot AI
                  auswerten lassen.
                </NetworkText>
              </label>
              <label className="networkImportCheck">
                <input name="replace" type="checkbox" />
                <NetworkText id="ui.network-profile-workspace.9da7d07e378bb730">
                  Vorhandene Texte und Bilder ersetzen (sonst bleiben sie erhalten)
                </NetworkText>
              </label>
              <button className="networkPrimary" disabled={busy}>
                <NetworkText id="ui.network-profile-workspace.80e090dd9a8bccfb">
                  {aiWorking
                    ? "PagePilot AI analysiert deine Homepage …"
                    : "✦ Meine Unternehmensseite automatisch erstellen"}
                </NetworkText>
              </button>
              {aiWorking && <div className="pagePilotProgress" role="status"><span />Homepage, Inhalte und Bilder werden geprüft. Das dauert meist ein bis zwei Minuten. Bitte dieses Fenster geöffnet lassen.</div>}
              {aiResult && <section className="pagePilotResult" aria-live="polite">
                <strong>Deine Seite nimmt Gestalt an.</strong>
                <p>{aiResult.fields} Angaben vorbereitet · {aiResult.sections} Inhaltsbereiche eingeordnet</p>
                <div className="pagePilotMediaReview">
                  <div>{logo?<img src={logo} alt="Übernommenes Firmenlogo"/>:<span>Logo ergänzen</span>}<small>Firmenlogo</small></div>
                  <div>{hero?<img src={hero} alt="Übernommenes Titelbild"/>:<span>Titelbild ergänzen</span>}<small>Titelbild</small></div>
                </div>
                {aiResult.missing.length>0 && <p>Bitte noch prüfen oder ergänzen: {aiResult.missing.join(', ')}. Nicht auffindbare Angaben werden nicht erfunden.</p>}
                <button type="button" className="networkPrimary" onClick={openEditablePreview}>Vorschau öffnen &amp; verfeinern →</button>
                <small>Du entscheidest, was veröffentlicht wird. Bitte kontrolliere die Angaben und die Nutzungsrechte der übernommenen Bilder.</small>
              </section>}
              {sources.length > 0 && (
                <details>
                  <summary>
                    <NetworkText id="ui.network-profile-workspace.354cac51b38829cc">
                      Recherchequellen ansehen
                    </NetworkText>
                  </summary>
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
          </details>
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
              <section
                className="networkCard"
                data-wizard-step="2"
                hidden={step !== 2}
              >
                <header>
                  <div>
                    <h2>
                      <NetworkText id="ui.network-profile-workspace.b538240ac04b7791">
                        Gestalte deine Partnerseite
                      </NetworkText>
                    </h2>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.67fbc850bf92ae45">
                        Zeig, was dein Unternehmen ausmacht – mit einem starken
                        Titelbild und persönlichen Inhalten.
                      </NetworkText>
                    </p>
                  </div>
                </header>
                <div className="partnerPageEditor">
                  <div className="partnerHeroEditor">
                    <div>
                      <h3>
                        <NetworkText id="ui.network-profile-workspace.795619adc9ecd918">
                          Dein Titelbild
                        </NetworkText>
                      </h3>
                      <p>
                        <NetworkText id="ui.network-profile-workspace.b4f01b941a1f774e">
                          Dieses Bild begrüßt andere Partner ganz oben auf
                          deiner Partnerseite.
                        </NetworkText>
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
                          <NetworkText id="ui.network-profile-workspace.c90087a1574ebbea">
                            {hero
                              ? "Titelbild ändern"
                              : "Titelbild auswählen und hochladen"}
                          </NetworkText>
                        </strong>
                        <span>
                          <NetworkText id="ui.network-profile-workspace.28e54af25a7d6eb9">
                            {hero
                              ? "Klicke hier, um ein anderes Bild auszuwählen"
                              : "Klicke hier und wähle ein Bild deines Unternehmens"}
                          </NetworkText>
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
                        <NetworkText id="ui.network-profile-workspace.9287549ecf6f8e21">
                          Querformat empfohlen · z. B. 1.920 × 800 Pixel · PNG,
                          JPG oder WebP · maximal 1,5 MB
                        </NetworkText>
                      </small>
                      {hero && (
                        <button
                          type="button"
                          className="networkSecondary"
                          disabled={!data.canEdit || busy}
                          onClick={() => setHero(null)}
                        >
                          <NetworkText id="ui.network-profile-workspace.1523eb5190f7e9e9">
                            Titelbild entfernen
                          </NetworkText>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="partnerContentHeading">
                    <h3>
                      <NetworkText id="ui.network-profile-workspace.3ecaa2137489709d">
                        Mehr über dein Unternehmen
                      </NetworkText>
                    </h3>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.003eef8c69232a25">
                        Ergänze zum Beispiel deine Arbeitsweise, Projekte oder
                        das, was du im Netzwerk suchst.
                      </NetworkText>
                    </p>
                  </div>
                  {sections.map((section, index) => (
                    <fieldset className="full partnerSectionEditor" key={index}>
                      <legend>
                        <NetworkText id="ui.network-profile-workspace.e3b4011d14668478">
                          Inhaltsbereich{" "}
                        </NetworkText>
                        {index + 1}
                      </legend>
                      <label>
                        <NetworkText id="ui.network-profile-workspace.8f1bec7517e75c60">
                          Rubrik
                        </NetworkText>
                        <select
                          value={section.area || "about"}
                          disabled={!data.canEdit}
                          onChange={(event) =>
                            setSections((current) =>
                              current.map((s, i) =>
                                i === index
                                  ? { ...s, area: event.target.value }
                                  : s,
                              ),
                            )
                          }
                        >
                          <option value="about">Vorstellung</option>
                          <option value="services">Leistungen</option>
                          <option value="personal">Persönlich</option>
                          <option value="offers">Angebote</option>
                          <option value="looking">Gesuche</option>
                        </select>
                      </label>
                      <label>
                        <NetworkText id="ui.network-profile-workspace.fb039458a3350cb1">
                          Überschrift
                        </NetworkText>
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
                        <NetworkText id="ui.network-profile-workspace.3cc46559245da378">
                          Inhalt
                        </NetworkText>
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
                          <NetworkText id="ui.network-profile-workspace.ed16527abbf53609">
                            Nach oben
                          </NetworkText>
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
                          <NetworkText id="ui.network-profile-workspace.54245735eed0043a">
                            Nach unten
                          </NetworkText>
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
                          <NetworkText id="ui.network-profile-workspace.7dd31affdd9a75b5">
                            Bereich entfernen
                          </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.81d0c1bc7298baf8">
                      + Weiteren Bereich hinzufügen
                    </NetworkText>
                  </button>
                </div>
              </section>
              <section
                className="networkCard"
                data-wizard-step="0"
                hidden={step !== 0}
              >
                <header>
                  <div>
                    <span>
                      <NetworkText id="ui.network-profile-workspace.06f913bff2f11a2a">
                        SCHRITT 1
                      </NetworkText>
                    </span>
                    <h2>
                      <NetworkText id="ui.network-profile-workspace.c3cea3134bbf8b6d">
                        Unternehmen und Auftritt
                      </NetworkText>
                    </h2>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.3bf92b2fed26e276">
                        So erkennen andere Mitglieder Ihr Unternehmen auf den
                        ersten Blick.
                      </NetworkText>
                    </p>
                  </div>
                </header>
                <div className="networkProfileFields">
                  <label>
                    <NetworkText id="ui.network-profile-workspace.1f9bbd6f11d8cd7c">
                      Unternehmensfarbe
                    </NetworkText>
                    <input
                      type="color"
                      name="primaryColor"
                      defaultValue={p.primaryColor || "#292929"}
                      disabled={!data.canEdit}
                    />
                    <small>
                      <NetworkText id="ui.network-profile-workspace.48017b9b1889c1b1">
                        Für Ihre Partnerkachel und Ihre Unternehmensseite –
                        nicht für das Netzwerkportal.
                      </NetworkText>
                    </small>
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.4743a0e751c43f02">
                      Zweite Unternehmensfarbe
                    </NetworkText>
                    <input
                      type="color"
                      name="secondaryColor"
                      defaultValue={
                        p.secondaryColor || p.primaryColor || "#454545"
                      }
                      disabled={!data.canEdit}
                    />
                    <small>
                      <NetworkText id="ui.network-profile-workspace.c1370ae2d7493014">
                        Ergänzende Farbe für Ihren Unternehmensauftritt.
                      </NetworkText>
                    </small>
                  </label>
                  <label className="networkLogoUpload">
                    <span>
                      <NetworkText id="ui.network-profile-workspace.d89ef6ecaf32f5d9">
                        Firmenlogo
                      </NetworkText>
                    </span>
                    <div>
                      {logo ? (
                        <img src={logo} alt="Logo-Vorschau" />
                      ) : (
                        <b aria-hidden="true">＋</b>
                      )}
                      <p>
                        <strong>
                          <NetworkText id="ui.network-profile-workspace.5450471f841c24bc">
                            Logo auswählen
                          </NetworkText>
                        </strong>
                        <small>
                          <NetworkText id="ui.network-profile-workspace.c225c868ff872ff1">
                            PNG, JPG oder WebP · maximal 1,5 MB
                          </NetworkText>
                        </small>
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
                    <NetworkText id="ui.network-profile-workspace.65c49d007fa35219">
                      Unternehmensname
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.5d817df6ecaf2a57">
                      Kurzversprechen
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.70b44587002772d4">
                      Persönliche Unternehmensbeschreibung
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.b805ebc3ac8db230">
                      Straße und Hausnummer
                    </NetworkText>
                    <input
                      name="street"
                      required
                      defaultValue={p?.street || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.3b48d17e95d1f0cd">
                      Postleitzahl
                    </NetworkText>
                    <input
                      name="postalCode"
                      required
                      defaultValue={p?.postalCode || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.30fb259129e56944">
                      Ort
                    </NetworkText>
                    <input
                      name="city"
                      required
                      defaultValue={p?.city || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.b6baff9358ddd8f7">
                      Land
                    </NetworkText>
                    <input
                      name="country"
                      required
                      defaultValue={p?.country || "Deutschland"}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label className="wide">
                    <NetworkText id="ui.network-profile-workspace.5c542a37edb01ebf">
                      Firmenhomepage
                    </NetworkText>
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
              <section
                className="networkCard"
                data-wizard-step="1"
                hidden={step !== 1}
              >
                <header>
                  <div>
                    <span>
                      <NetworkText id="ui.network-profile-workspace.f1355c5bc97cd173">
                        SCHRITT 2
                      </NetworkText>
                    </span>
                    <h2>
                      <NetworkText id="ui.network-profile-workspace.8a45d97ff0394ce7">
                        Leistungen und Erfahrung
                      </NetworkText>
                    </h2>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.e111857b7da58219">
                        Beschreiben Sie verständlich, wobei andere Partner Sie
                        ansprechen können.
                      </NetworkText>
                    </p>
                  </div>
                </header>
                <div className="networkProfileFields">
                  <label className="wide">
                    <NetworkText id="ui.network-profile-workspace.c991fbca10ae6907">
                      Leistungen und Kompetenzen
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.c4c5826fc1545399">
                      Branchen und Zielgruppen
                    </NetworkText>
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
              <section className="networkCard" hidden={step !== 1}>
                <header><div><h2>Präsentationen & Unterlagen</h2><p>Ergänze deine Leistungen mit PDF-Dokumenten auf deiner Unternehmensseite.</p></div></header>
                <div className="networkCardBody"><PartnerDocumentsEditor value={documents} onChange={setDocuments} disabled={busy || !data.canEdit} onBusyChange={setReadingDocuments}/></div>
              </section>
              <section
                className="networkCard"
                data-wizard-step="3"
                hidden={step !== 3}
              >
                <header>
                  <div>
                    <span>
                      <NetworkText id="ui.network-profile-workspace.7d7414b48d6d5b13">
                        SCHRITT 4
                      </NetworkText>
                    </span>
                    <h2>
                      <NetworkText id="ui.network-profile-workspace.ebdaccce46ec60f3">
                        Persönlicher Ansprechpartner
                      </NetworkText>
                    </h2>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.c0929438e552f31d">
                        Mitglieder können unmittelbar die richtige Person
                        kontaktieren.
                      </NetworkText>
                    </p>
                  </div>
                </header>
                <div className="networkProfileFields">
                  <label>
                    <NetworkText id="ui.network-profile-workspace.dcd1d5223f73b3a9">
                      Name
                    </NetworkText>
                    <input
                      name="contactName"
                      required
                      defaultValue={p?.contactName || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.a91c3335e552d5fc">
                      Position / Funktion
                    </NetworkText>
                    <input
                      name="contactPosition"
                      required
                      defaultValue={p?.contactPosition || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.2fae6fb30b0d0077">
                      E-Mail
                    </NetworkText>
                    <input
                      name="contactEmail"
                      type="email"
                      required
                      defaultValue={p?.contactEmail || ""}
                      disabled={!data.canEdit}
                    />
                  </label>
                  <label>
                    <NetworkText id="ui.network-profile-workspace.fa6906d76ee94d4e">
                      Telefon
                    </NetworkText>
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
              <section
                className="networkCard"
                data-wizard-step="1"
                hidden={step !== 1}
              >
                <header>
                  <div>
                    <span>
                      <NetworkText id="ui.network-profile-workspace.18eec2681007d0ec">
                        OPTIONAL · PERSÖNLICH IM NETZWERK
                      </NetworkText>
                    </span>
                    <h2>
                      <NetworkText id="ui.network-profile-workspace.14d429aeee4aeb79">
                        Persönliches & Zusammenarbeit
                      </NetworkText>
                    </h2>
                    <p>
                      <NetworkText id="ui.network-profile-workspace.50a54b670610db64">
                        Was möchten Sie mit anderen Partnern teilen? Zeigen Sie
                        Angebote, Gesuche und Gesprächsanlässe aus Ihrer
                        persönlichen Sicht.
                      </NetworkText>
                    </p>
                  </div>
                </header>
                <div className="networkProfileFields">
                  <label className="wide">
                    <NetworkText id="ui.network-profile-workspace.4019af0cd41792ea">
                      Meine Mitteilung an das Netzwerk
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.0947baa797351e27">
                      Das biete ich an
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.d14d578f2c84342d">
                      Das suche ich
                    </NetworkText>
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
                    <NetworkText id="ui.network-profile-workspace.dd5846ce1eef368e">
                      Link zur Online-Terminbuchung
                    </NetworkText>
                    <input
                      name="meetingUrl"
                      type="url"
                      maxLength={500}
                      defaultValue={p.meetingUrl || ""}
                      placeholder="https://… – z. B. Ihre Terminbuchungsseite"
                      disabled={!data.canEdit}
                    />
                    <small>
                      <NetworkText id="ui.network-profile-workspace.e71d86d5ca7fc19c">
                        Besucher öffnen Ihre externe Buchungsseite und wählen
                        dort einen Termin. Es wird nichts automatisch gebucht.
                      </NetworkText>
                    </small>
                  </label>
                </div>
              </section>
            </div>
            <aside className="networkProfilePreview" style={partnerBranding(p)}>
              <small>
                <NetworkText id="ui.network-profile-workspace.92d2fe5a58cee12e">
                  VORSCHAU IM PARTNERVERZEICHNIS
                </NetworkText>
              </small>
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
                <NetworkText id="ui.network-profile-workspace.4d9b41655dcd1cf5">
                  {p?.status === "published" ? "Veröffentlicht" : "Entwurf"}
                </NetworkText>
              </span>
              <h2>{p?.companyName || data.organization.displayName}</h2>
              <p>{p?.tagline || "Ihr Kurzversprechen erscheint hier."}</p>
              <hr />
              <b>
                <NetworkText id="ui.network-profile-workspace.d8d08e1939b1b6c8">
                  Was wir anbieten
                </NetworkText>
              </b>
              <p>
                {p?.services ||
                  "Beschreiben Sie Ihre wichtigsten Leistungen und Kompetenzen."}
              </p>
              <small>
                <NetworkText id="ui.network-profile-workspace.ca797e54c2f852c8">
                  Nur innerhalb dieses Netzwerks sichtbar
                </NetworkText>
              </small>
            </aside>
          </div>
          {data.canEdit && (
            <div className="networkProfileActions">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)}>
                  <NetworkText id="ui.network-profile-workspace.548611ce58f71a17">
                    Zurück
                  </NetworkText>
                </button>
              )}
              <button type="submit" disabled={busy}>
                <NetworkText id="ui.network-profile-workspace.955b417c326ed28c">
                  Entwurf speichern
                </NetworkText>
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  className="networkPrimary"
                  onClick={() => setStep(step + 1)}
                >
                  <NetworkText id="ui.network-profile-workspace.b3e3f54b2131b6dd">
                    Weiter →
                  </NetworkText>
                </button>
              ) : (
                <button
                  className="networkPrimary"
                  type="button"
                  disabled={busy}
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    const invalid = form?.querySelector<HTMLInputElement>(
                      "input:invalid,textarea:invalid",
                    );
                    if (invalid) {
                      setStep(
                        Number(
                          invalid.closest<HTMLElement>("[data-wizard-step]")
                            ?.dataset.wizardStep || 0,
                        ),
                      );
                      requestAnimationFrame(() => {
                        invalid.focus();
                        invalid.reportValidity();
                      });
                      return;
                    }
                    if (form?.reportValidity()) void save(form, !service);
                  }}
                >
                  <NetworkText id="ui.network-profile-workspace.9ab4c85de41db444">
                    {busy
                      ? "Wird gespeichert …"
                      : service
                        ? "Für die Übergabe speichern"
                        : "Partnerseite veröffentlichen"}
                  </NetworkText>
                </button>
              )}
            </div>
          )}
        </form>
        {notice && <p role="status">{notice}</p>}
      </dialog>
      {editablePreview && (
        <PartnerEditablePreview
          initial={editablePreview}
          userId={access?.currentUserId || ""}
          onSave={saveEditablePreview}
          canPublish={!service}
          onClose={() => {setEditablePreview(null);if(returnToSetup.current){returnToSetup.current=false;requestAnimationFrame(()=>dialog.current?.showModal());}}}
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
