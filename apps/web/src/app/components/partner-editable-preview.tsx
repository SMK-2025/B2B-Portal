"use client";
import { useState, type FormEvent } from "react";
import {
  ProfileDialog,
  type PartnerPageProfile,
} from "./network-members-workspace";
type Field = {
  key: string;
  label: string;
  multiline?: boolean;
  type?: string;
  max?: number;
};
const groups: Record<string, { title: string; fields: Field[] }> = {
  hero: {
    title: "Titelbereich und Branding",
    fields: [
      { key: "companyName", label: "Unternehmensname", max: 160 },
      { key: "tagline", label: "Kurzbeschreibung", max: 180, multiline: true },
      { key: "primaryColor", label: "Hauptfarbe", type: "color" },
      { key: "secondaryColor", label: "Zweite Farbe", type: "color" },
    ],
  },
  about: {
    title: "Vorstellung bearbeiten",
    fields: [
      {
        key: "description",
        label: "Über dein Unternehmen",
        multiline: true,
        max: 3000,
      },
    ],
  },
  services: {
    title: "Leistungen bearbeiten",
    fields: [
      {
        key: "services",
        label: "Leistungen · eine pro Zeile",
        multiline: true,
        max: 2000,
      },
      { key: "industries", label: "Branchen und Zielgruppen", max: 800 },
    ],
  },
  personalMessage: {
    title: "Persönliche Mitteilung",
    fields: [
      {
        key: "personalMessage",
        label: "Deine Mitteilung",
        multiline: true,
        max: 3000,
      },
    ],
  },
  offers: {
    title: "Deine Angebote",
    fields: [
      { key: "offers", label: "Das bietest du an", multiline: true, max: 2000 },
    ],
  },
  lookingFor: {
    title: "Deine Gesuche",
    fields: [
      { key: "lookingFor", label: "Das suchst du", multiline: true, max: 2000 },
    ],
  },
  contact: {
    title: "Kontakt und Terminbuchung",
    fields: [
      { key: "contactName", label: "Ansprechpartner" },
      { key: "contactPosition", label: "Position" },
      { key: "contactEmail", label: "E-Mail", type: "email" },
      { key: "contactPhone", label: "Telefon", type: "tel" },
      { key: "street", label: "Straße und Hausnummer" },
      { key: "postalCode", label: "Postleitzahl" },
      { key: "city", label: "Ort" },
      { key: "country", label: "Land" },
      { key: "websiteUrl", label: "Firmenhomepage", type: "url" },
      { key: "meetingUrl", label: "Link zur Terminbuchung", type: "url" },
    ],
  },
};
export function PartnerEditablePreview({
  initial,
  onSave,
  onClose,
  userId,
}: {
  initial: PartnerPageProfile;
  onSave: (value: PartnerPageProfile) => Promise<PartnerPageProfile>;
  onClose: () => void;
  userId: string;
}) {
  const [draft, setDraft] = useState(initial),
    [editing, setEditing] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [readingImage, setReadingImage] = useState(false),
    [message, setMessage] = useState("");
  const [hero, setHero] = useState(initial.heroImageUrl || null),
    [logo, setLogo] = useState(initial.logoUrl);
  function close() {
    if (
      !busy &&
      (!editing || window.confirm("Nicht gespeicherte Änderungen verwerfen?"))
    )
      onClose();
  }
  async function image(
    file: File | undefined,
    set: (value: string | null) => void,
  ) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_500_000
    ) {
      setMessage("Bitte PNG, JPG oder WebP mit maximal 1,5 MB auswählen.");
      return;
    }
    setReadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      set(typeof reader.result === "string" ? reader.result : null);
      setReadingImage(false);
    };
    reader.onerror = () => {
      setMessage("Das Bild konnte nicht gelesen werden.");
      setReadingImage(false);
    };
    reader.readAsDataURL(file);
  }
  async function save(
    event: FormEvent<HTMLFormElement>,
    area: string,
    fields: Field[],
  ) {
    event.preventDefault();
    if (busy || readingImage) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    let next = { ...draft };
    if (area.startsWith("section-")) {
      const index = Number(area.slice(8));
      const sections = [...(draft.sections || [])];
      sections[index] = {
        title: String(form.get("title") || ""),
        body: String(form.get("body") || ""),
      };
      next = { ...next, sections };
    } else {
      next = {
        ...next,
        ...Object.fromEntries(
          fields.map((field) => [field.key, String(form.get(field.key) || "")]),
        ),
      };
      if (area === "hero")
        next = { ...next, heroImageUrl: hero, logoUrl: logo };
    }
    try {
      const saved = await onSave(next);
      setDraft(saved);
      setEditing(null);
      setMessage("Änderungen gespeichert.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.",
      );
    } finally {
      setBusy(false);
    }
  }
  function controls(area: string) {
    const index = area.startsWith("section-") ? Number(area.slice(8)) : null;
    const group =
      index === null
        ? groups[area]
        : {
            title: "Inhaltsbereich bearbeiten",
            fields: [
              { key: "title", label: "Überschrift", max: 160 },
              { key: "body", label: "Inhalt", multiline: true, max: 3000 },
            ],
          };
    if (!group) return null;
    const values: Record<string, unknown> =
      index === null
        ? (draft as unknown as Record<string, unknown>)
        : draft.sections?.[index] || {};
    return (
      <div className="partnerInlineControls">
        <button
          type="button"
          className="partnerEditPencil"
          aria-label={group.title}
          disabled={busy}
          onClick={() => {
            if (
              editing &&
              editing !== area &&
              !window.confirm("Nicht gespeicherte Änderungen verwerfen?")
            )
              return;
            setHero(draft.heroImageUrl || null);
            setLogo(draft.logoUrl);
            setEditing(area);
            setMessage("");
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" />
          </svg>
          <span>Bearbeiten</span>
        </button>
        {editing === area && (
          <form
            className={`partnerInlineForm${area === "hero" ? " partnerHeroEditForm" : ""}`}
            onSubmit={(event) => void save(event, area, group.fields)}
          >
            <h3>{group.title}</h3>
            {group.fields.map((field) => (
              <label
                key={field.key}
                className={
                  field.multiline
                    ? "partnerEditWide"
                    : field.type === "color"
                      ? "partnerColorField"
                      : ""
                }
              >
                {field.label}
                {field.multiline ? (
                  <textarea
                    name={field.key}
                    defaultValue={String(values[field.key] || "")}
                    rows={field.key === "tagline" ? 2 : 5}
                    maxLength={field.max}
                    disabled={busy}
                    autoFocus={field === group.fields[0]}
                  />
                ) : (
                  <input
                    name={field.key}
                    type={field.type || "text"}
                    defaultValue={String(
                      values[field.key] ||
                        (field.type === "color" ? "#163047" : ""),
                    )}
                    maxLength={field.max || 500}
                    disabled={busy}
                    autoFocus={field === group.fields[0]}
                  />
                )}
              </label>
            ))}
            {area === "hero" && (
              <div className="partnerEditImages">
                {[
                  ["Titelbild", hero, setHero],
                  ["Firmenlogo", logo, setLogo],
                ].map(([label, url, set]) => (
                  <div className="partnerInlineImage" key={String(label)}>
                    <h4>{String(label)}</h4>
                    <label className="partnerPreviewImagePicker">
                      {url ? (
                        <img src={String(url)} alt={`${label} Vorschau`} />
                      ) : (
                        <span
                          className="partnerPreviewImageEmpty"
                          aria-hidden="true"
                        >
                          ＋
                        </span>
                      )}
                      <span>{url ? "Bild wechseln" : "Bild auswählen"}</span>
                      <input
                        aria-label={`${label} hochladen`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy || readingImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          void image(
                            file,
                            set as (value: string | null) => void,
                          );
                        }}
                      />
                    </label>
                    <small>PNG, JPG oder WebP · max. 1,5 MB</small>
                    {url && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          (set as (value: string | null) => void)(null)
                        }
                      >
                        Bild entfernen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="partnerInlineFormActions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  setMessage("");
                }}
              >
                Abbrechen
              </button>
              <button
                className="networkPrimary"
                disabled={busy || readingImage}
              >
                {readingImage
                  ? "Bild wird vorbereitet …"
                  : busy
                    ? "Wird gespeichert …"
                    : "Änderungen speichern"}
              </button>
            </div>
            {message && <p role="status">{message}</p>}
          </form>
        )}
      </div>
    );
  }
  return (
    <div className="partnerEditingPreview">
      <ProfileDialog
        member={{
          id: "own-preview",
          userId,
          role: "organization_admin",
          status: "active",
          updatedAt: draft.updatedAt,
          user: null,
          organization: {
            displayName: draft.companyName,
            legalName: draft.companyName,
            websiteUrl: draft.websiteUrl,
            networkProfile: draft,
          },
        }}
        onClose={close}
        editControls={controls}
      />
      {!editing && message && (
        <div className="networkNotice" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
