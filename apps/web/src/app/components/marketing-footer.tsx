"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import photos from "../lib/city-photos.json";
import { targetAudiences } from "./public-site-data";
import { marketingHref } from "../lib/marketing-pages";
import { CookieSettingsButton } from "./cookie-consent";

function ImageSources() {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const visible = photos.filter((p) =>
    `${p.city} ${p.author} ${p.title}`
      .toLocaleLowerCase("de")
      .includes(query.toLocaleLowerCase("de")),
  );
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    if (!node) return;
    const previous = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (node.open) node.close();
    };
  }, [open]);
  return (
    <div className="cm-source-bar" id="bildnachweise">
      <button
        type="button"
        className="cm-source-trigger"
        aria-haspopup="dialog"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        Bildquellen
      </button>
      <dialog
        ref={dialog}
        className="cm-sources-dialog"
        aria-modal="true"
        aria-labelledby={title}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="cm-sources-panel">
          <header>
            <div>
              <h2 id={title}>Bilder und Bildquellen</h2>
              <p>
                Alle Stadtmotive mit Urhebern, Originalquellen, Lizenzen und
                Angaben zur Bearbeitung.
              </p>
            </div>
            <button
              type="button"
              className="cm-source-close"
              onClick={() => setOpen(false)}
            >
              Schließen
            </button>
          </header>
          <div className="cm-sources-tools">
            <label htmlFor={title + "-search"}>
              Stadt oder Urheber suchen
              <input
                id={title + "-search"}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zum Beispiel Bremen"
              />
            </label>
            <p role="status">
              {visible.length} von {photos.length} Stadtmotiven
            </p>
          </div>
          <div className="cm-sources-scroll">
            <div className="cm-sources-grid">
              {visible.map((photo) => (
                <article key={photo.key}>
                  <a
                    href={photo.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Bild ${photo.city} in voller Größe öffnen`}
                  >
                    <img
                      src={photo.small}
                      alt={`Stadtansicht ${photo.city}`}
                      loading="lazy"
                      width="440"
                      height="280"
                    />
                  </a>
                  <div>
                    <h3>{photo.city}</h3>
                    <p>
                      <strong>Urheber:</strong> {photo.author}
                    </p>
                    <p>
                      <strong>Bild:</strong> {photo.title}
                    </p>
                    <p>
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Originalquelle öffnen
                      </a>
                    </p>
                    <p>
                      <a
                        href={photo.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {photo.license}
                      </a>
                    </p>
                    <details>
                      <summary>Bearbeitung und Darstellung</summary>
                      <p>{photo.changes}</p>
                      <p>
                        Auf dieser Website kann das Motiv mit responsivem
                        Ausschnitt und einem Farb-Overlay dargestellt werden.
                      </p>
                    </details>
                  </div>
                </article>
              ))}
            </div>
            {visible.length === 0 && (
              <p>Keine passenden Bildquellen gefunden.</p>
            )}
            <p className="cm-source-document">
              <a
                href="/images/cities-manus/BILDNACHWEISE.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vollständige Bilddokumentation öffnen
              </a>
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
export function MarketingFooter({ prefix }: { prefix: string }) {
  return (
    <>
      <footer className="cm-footer" aria-label="Seiteninformationen">
        <div className="cm-footer-top">
          <div className="cm-footer-brand">
            <Link
              href={(prefix || "/") as never}
              aria-label="B2B Matching Startseite"
            >
              <img
                src="/images/b2b-matching-logo-full.png"
                alt="B2B Matching"
                width="240"
                height="40"
              />
            </Link>
            <p>
              Unternehmen kennenlernen.
              <br />
              Kontakte knüpfen.
              <br />
              Gemeinsam weiterkommen.
            </p>
            <p>
              Ein Service der
              <br />
              <strong>Media Online Innovations Group</strong>
            </p>
            <a href="mailto:service@b2b-matching.de">service@b2b-matching.de</a>
          </div>
          <nav aria-label="Netzwerke und Plattform">
            <h3>Netzwerke &amp; Plattform</h3>
            <Link href={marketingHref(prefix, "vorteile") as never}>
              Ihre Vorteile
            </Link>
            <Link href={marketingHref(prefix, "netzwerke") as never}>
              Alle Stadtnetzwerke
            </Link>
            <Link href={(prefix ? `${prefix}/Koeln` : "/Koeln") as never}>
              Unternehmernetzwerk Köln
            </Link>
            <Link
              href={(prefix ? `${prefix}/Leverkusen` : "/Leverkusen") as never}
            >
              Unternehmernetzwerk Leverkusen
            </Link>
            <Link href={marketingHref(prefix, "funktionen") as never}>
              Funktionen kennenlernen
            </Link>
            <Link href={marketingHref(prefix, "so-funktionierts") as never}>
              So funktioniert’s
            </Link>
            <Link href={marketingHref(prefix, "sicherheit") as never}>
              Sicherheit
            </Link>
            <Link href={marketingHref(prefix, "fragen") as never}>
              Häufige Fragen
            </Link>
            <Link href="/anmelden">Login</Link>
            <Link href={marketingHref(prefix, "eigenes-portal") as never}>
              Eigenes Portal
            </Link>
          </nav>
          <nav aria-label="Eigene Netzwerkportale">
            <h3>Für Ihr Netzwerk</h3>
            {targetAudiences.map((item) => (
              <Link
                key={item.href}
                href={
                  `${marketingHref(prefix, "fuer-wen")}#${item.href.split("/").pop()}` as never
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Rechtliche Informationen">
            <h3>Rechtliches &amp; Datenschutz</h3>
            <Link href="/impressum">Impressum</Link>
            <Link href="/agb">AGB</Link>
            <Link href="/datenschutz/unternehmen">Datenschutzerklärung</Link>
            <Link href="/datenschutz/mailings">
              Datenschutz bei Netzwerk-Mails
            </Link>
            <Link href="/cookies">Cookie-Hinweise</Link>
            <CookieSettingsButton />
            <Link href="/barrierefreiheit">Barrierefreiheit</Link>
          </nav>
        </div>
        <div className="cm-footer-bottom">
          <span>
            © {new Date().getFullYear()} B2B Matching · Media Online Innovations
            Group
          </span>
          <span>Regional vernetzt. Persönlich verbunden.</span>
        </div>
      </footer>
      <ImageSources />
    </>
  );
}
