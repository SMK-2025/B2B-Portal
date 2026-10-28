"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
const fields = {
  title: "Unternehmensname",
  description: "Beschreibung",
  industry: "Branche",
  services: "Leistungen",
  website: "Website",
  image: "Logo",
  email: "Kontakt-E-Mail",
  phone: "Telefon",
};
type Item = {
  id: string;
  hidden: boolean;
  grant: { enabled: boolean; fields: string[] };
  preview: Record<string, unknown> | null;
};
function Preview({ value }: { value: Record<string, unknown> | null }) {
  return (
    <div aria-label="Öffentliche Profilvorschau">
      {value ? (
        <>
          {typeof value.image === "string" && (
            <img
              src={value.image}
              alt="Logo in deiner öffentlichen Vorschau"
              style={{ maxWidth: 180, maxHeight: 180 }}
            />
          )}
          <h3>{String(value.title || "")}</h3>
          <p>{String(value.description || "")}</p>
          {Object.entries(value)
            .filter(
              ([key]) =>
                ![
                  "id",
                  "network",
                  "publication",
                  "updatedAt",
                  "title",
                  "description",
                  "image",
                ].includes(key),
            )
            .map(([key, v]) => (
              <p key={key}>
                <strong>{fields[key as keyof typeof fields] || key}: </strong>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </p>
            ))}
        </>
      ) : (
        <p>
          Keine öffentliche Ausgabe. Wähle mindestens Name und Beschreibung;
          dein Profil muss im Portal veröffentlicht und deine Mitgliedschaft
          aktiv sein.
        </p>
      )}
    </div>
  );
}
function Consent({
  item,
  onSaved,
}: {
  item: Item;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(item.grant.fields),
    [enabled, setEnabled] = useState(item.grant.enabled),
    [rights, setRights] = useState(false),
    [preview, setPreview] = useState(item.preview),
    [previewedFields, setPreviewedFields] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(action: "preview" | "consent", revoke = false) {
    const token = getPortalSession();
    if (!token || busy) return;
    setBusy(true);
    try {
      const result = await portalRequest<{
        preview: Record<string, unknown> | null;
      }>(`/networks/homepage/unternehmerfreunde/members/${item.id}/${action}`, {
        token,
        body: {
          enabled: !revoke && enabled,
          fields: selected,
          rightsConfirmed: rights,
        },
      });
      if (action === "preview") {
        setPreview(result.preview);
        setPreviewedFields(
          result.preview ? JSON.stringify([...selected].sort()) : null,
        );
        setNotice(
          "Vorschau der ausgewählten Felder. Noch keine Zustimmung gespeichert.",
        );
      } else {
        setNotice(
          revoke
            ? "Öffentliche Zustimmung widerrufen."
            : "Deine Zustimmung wurde gespeichert.",
        );
        await onSaved();
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void act("consent");
      }}
      className="homepageConsentCard"
    >
      <h3>Meine öffentliche Profilfreigabe</h3>
      <p>
        Gilt ausschließlich für diese Mitgliedschaft bei den
        Unternehmerfreunden. Änderungen an bereits freigegebenen Profilfeldern
        erscheinen nach dem Speichern auch öffentlich. Inhalte pflegst du unter
        „Meine Partnerseite“. Vorschau neu laden, bevor du zustimmst.
      </p>
      {item.hidden && (
        <p>
          Die Netzwerkverwaltung hat die öffentliche Anzeige zusätzlich
          ausgeblendet. Deine Zustimmung hebt diese Ausblendung nicht auf.
        </p>
      )}
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        Öffentlich auf der Homepage veröffentlichen
      </label>
      <fieldset>
        <legend>Meine ausdrücklich erlaubten Felder</legend>
        {Object.entries(fields).map(([key, label]) => (
          <label key={key} className="homepageConsentChoice">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, key]
                    : selected.filter((k) => k !== key),
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />{" "}
        Ich stimme der öffentlichen Veröffentlichung dieser Felder zu und
        bestätige meine Berechtigung an Texten, Kontaktdaten und Bildern.
      </label>
      <p className="homepageConsentActions">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("preview")}
        >
          Öffentliche Vorschau prüfen
        </button>{" "}
        <button
          className="portalPrimary"
          disabled={
            busy ||
            (enabled &&
              (!rights ||
                previewedFields !== JSON.stringify([...selected].sort())))
          }
        >
          Meine Freigabe speichern
        </button>{" "}
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("consent", true)}
        >
          Jederzeit widerrufen
        </button>
      </p>
      <p role="status">{notice}</p>
      {enabled && previewedFields !== JSON.stringify([...selected].sort()) && (
        <p>
          Bitte prüfe vor der Freigabe die Vorschau deiner aktuellen
          Feldauswahl.
        </p>
      )}
      <Preview value={preview} />
    </form>
  );
}
export function HomepageProfileConsent() {
  const [items, setItems] = useState<Item[]>([]),
    [notice, setNotice] = useState("");
  async function load() {
    const token = getPortalSession();
    if (!token) return;
    try {
      setItems(
        await portalRequest(
          "/networks/homepage/unternehmerfreunde/my-profiles",
          { token },
        ),
      );
    } catch {
      setNotice("Deine Profilfreigabe kann gerade nicht geladen werden.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="homepageConsentPanel">
      <h2>Mein Profil auf der öffentlichen Homepage</h2>
      <p>
        Standardmäßig bleibt alles privat. Bestehende Freigaben der Verwaltung
        sind keine persönliche Zustimmung. Ein Widerruf entfernt die Ausgabe
        beim nächsten Abruf; bereits gespeicherte Suchmaschinenkopien benötigen
        eine gesonderte Aktualisierung.
      </p>
      <p role="status">{notice}</p>
      {!items.length && !notice && <p>Für deinen Zugang ist hier noch keine Partnerseite zugeordnet. Es ist keine öffentliche Profilfreigabe aktiv.</p>}
      {items.map((item) => (
        <Consent
          key={item.id + JSON.stringify(item.grant)}
          item={item}
          onSaved={load}
        />
      ))}
    </section>
  );
}
