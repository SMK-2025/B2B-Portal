"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CITY_NETWORKS } from "../lib/city-networks";
import photos from "../lib/city-photos.json";
import { LeverkusenOffer, type CityMembershipOffer } from "./leverkusen-offer";
import { MarketingFooter } from "./marketing-footer";
import {
  MARKETING_NAV,
  MARKETING_PAGES,
  marketingHref,
  type MarketingPageKey,
} from "../lib/marketing-pages";
import "./city-marketing.css";
import { CityOrbit } from "./city-orbit";
import { CityContributionPresentation } from "./city-contribution-presentation";

type City = (typeof CITY_NETWORKS)[number];
const HERO_PHOTO_KEYS = ["bremen", "koeln", "leverkusen", "hamburg", "berlin", "muenchen"];
const features = [
  [
    "Unternehmensseite",
    "Zeigen Sie, wofür man Sie ansprechen kann.",
    "Stellen Sie Ihr Unternehmen mit Logo, Titelbild, Leistungen und Ansprechpartnern vor. Angebote und Gesuche machen deutlich, was Sie anbieten und wobei Sie Unterstützung suchen.",
    "Ein aussagekräftiger Auftritt statt einer Visitenkarte, die in der Schublade verschwindet.",
  ],
  [
    "Unternehmen und Leistungen finden",
    "Suchen Sie nach dem, was Sie gerade brauchen.",
    "Durchsuchen Sie die Unternehmen, Leistungen und Produkte Ihres Netzwerks. Entdecken Sie passende Ansprechpartner für Ihr nächstes Vorhaben.",
    "Nicht auf das nächste Treffen warten, sondern dann suchen, wenn ein Bedarf entsteht.",
  ],
  [
    "Vernetzung und Mitglieder-Chat",
    "Aus einem Kontakt wird ein Gespräch.",
    "Senden Sie eine Vernetzungsanfrage und schreiben Sie direkt im Mitglieder-Chat. Besprechen Sie Ihr Vorhaben persönlich – nur die Gesprächspartner können mitlesen.",
    "Angebote und Zusammenarbeit direkt mit dem passenden Unternehmen besprechen.",
  ],
  [
    "Angebote und Gesuche",
    "Teilen Sie, was Sie anbieten. Sagen Sie, was Sie suchen.",
    "Präsentieren Sie Ihre Angebote und machen Sie auf einen konkreten Bedarf aufmerksam. So erfahren andere Mitglieder, wann sich ein Gespräch mit Ihnen lohnt.",
    "Im Netzwerk sichtbar werden – mit einem konkreten Anlass für den nächsten Kontakt.",
  ],
  [
    "Schwarzes Brett und Veranstaltungen",
    "Auch zwischen Treffen verbunden bleiben.",
    "Neuigkeiten und Beiträge am schwarzen Brett halten Ihr Netzwerk auf dem Laufenden. Veranstaltungen ergänzen den digitalen Austausch um persönliche Begegnungen.",
    "Welche Bereiche genutzt werden und welche Termine stattfinden, bestimmt die jeweilige Netzwerkleitung.",
  ],
  [
    "Digitale Visitenkarte und PagePilot AI",
    "Einfach starten. Leicht in Kontakt bleiben.",
    "Lassen Sie aus Ihrer bestehenden Homepage mit PagePilot AI einen Entwurf Ihrer Unternehmensseite vorbereiten. Prüfen, ergänzen und veröffentlichen Sie ihn selbst. Ihre digitale Visitenkarte lässt sich per QR-Code weitergeben.",
    "Weniger Einrichtungsaufwand, mehr Zeit für den persönlichen Austausch.",
  ],
] as const;
function Icon({ kind }: { kind: number }) {
  const paths = [
    "M4 21V4h16v17M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2M10 21v-3h4v3",
    "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    "M3 4h18v13H9l-6 4V4M7 8h10M7 12h7",
    "M3 5h18v14H3zM7 9h10M7 13h6",
    "M3 5h18v16H3zM7 2v6M17 2v6M3 10h18",
    "M4 4h16v16H4zM8 8h3v3H8zM14 8h2M8 15h2M14 14v3h3",
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind % paths.length]} />
    </svg>
  );
}
function Header({
  prefix,
  city,
  currentPage,
}: {
  prefix: string;
  city?: City;
  currentPage?: MarketingPageKey;
}) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const closeDesktop = () => { if (window.innerWidth > 1150) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("resize", closeDesktop);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("resize", closeDesktop);
    };
  }, [open]);
  return (
    <header className="cm-header" ref={header}>
      <Link
        href={(prefix || "/") as never}
        aria-label="B2B Matching Startseite"
        onClick={() => setOpen(false)}
      >
        <img
          src="/images/b2b-matching-logo-full.png"
          alt="B2B Matching"
          width="240"
          height="40"
        />
      </Link>
      <button
        ref={menuButton}
        type="button"
        className="cm-menu"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        aria-controls="cm-navigation"
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>
      <div id="cm-navigation" className={open ? "cm-navigation is-open" : "cm-navigation"}>
      <nav
        id="cm-nav"
        aria-label="Hauptnavigation"
      >
        {MARKETING_NAV.map((page) => (
          <Link
            key={page}
            href={marketingHref(prefix, page) as never}
            aria-current={currentPage === page ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {MARKETING_PAGES[page].label}
          </Link>
        ))}
      </nav>
      <div className="cm-header-actions">
        <Link
          className="cm-login"
          onClick={() => setOpen(false)}
          href={
            (city ? `/anmelden?network=${city.slug}` : "/anmelden") as never
          }
        >
          Login
        </Link>
        <Link
          className="cm-button"
          onClick={() => setOpen(false)}
          href={marketingHref(prefix, "eigenes-portal") as never}
        >
          Eigenes Portal
        </Link>
      </div>
      </div>
    </header>
  );
}
function HeroBackdrop({ photo }: { photo: (typeof photos)[number] }) {
  const [layers, setLayers] = useState<((typeof photos)[number] | null)[]>([photo, null]);
  const [active, setActive] = useState(0);
  const activeLayer = useRef(0);
  useEffect(() => {
    const next = 1 - activeLayer.current;
    setLayers((current) => current[activeLayer.current]?.key === photo.key
      ? current : current.map((layer, i) => i === next ? photo : layer));
  }, [photo.key]);
  return <div className="cm-hero-backdrop" aria-hidden="true">
    {layers.map((layer, i) => layer && <Image
      key={i}
      src={layer.src}
      alt=""
      fill
      sizes="100vw"
      priority={i === 0}
      loading={i === 0 ? undefined : "eager"}
      className={`cm-hero-image cm-hero-image-layer${i === active ? " is-visible" : ""}`}
      onLoad={() => {
        if (layer.key !== photo.key) return;
        activeLayer.current = i;
        setActive(i);
      }}
    />)}
  </div>;
}
function Hero({ city, prefix }: { city?: City; prefix: string }) {
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false);
  const selected = city
    ? photos.find((p) => p.key === city.key)!
    : photos.find((p) => p.key === HERO_PHOTO_KEYS[index])!;
  useEffect(() => {
    if (!city && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setPlaying(true);
  }, [city]);
  useEffect(() => {
    if (!playing || city) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % HERO_PHOTO_KEYS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [playing, city]);
  const registration = city
    ? `/registrieren?network=${city.slug}`
    : marketingHref(prefix, "netzwerke");
  return (
    <section
      className={`cm-hero${city ? " cm-hero-city" : ""}`}
      aria-labelledby="cm-title"
    >
      {city ? <Image
        key={selected.src}
        src={selected.src}
        alt={`Stadtansicht ${selected.city}`}
        fill
        sizes="100vw"
        priority
        className="cm-hero-image"
      /> : <HeroBackdrop photo={selected} />}
      <div className="cm-hero-shade" />
      {selected.key==="aachen" && <a className="cm-required-credit" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">© CEphoto, Uwe Aranas · CC BY-SA 3.0</a>}
      <div className="cm-hero-content">
        {city && (
          <nav className="cm-breadcrumb" aria-label="Brotkrumennavigation">
            <Link href={(prefix || "/") as never}>Startseite</Link>
            <span>/</span>
            <Link href={marketingHref(prefix, "netzwerke") as never}>
              Netzwerke
            </Link>
            <span>/ {city.city}</span>
          </nav>
        )}
        <p className="cm-eyebrow">
          {city
            ? `Unternehmernetzwerk ${city.city}`
            : "Gemeinsam netzwerken. Mehr Kontakte gewinnen."}
        </p>
        <h1 id="cm-title">
          {city ? (
            <>
              Eine Stadt voller Unternehmen.
              <br />
              <em>Und Sie mittendrin.</em>
            </>
          ) : (
            <>
              Finden Sie Geschäftskontakte,
              <br />
              <em>die zu Ihrem Unternehmen passen.</em>
            </>
          )}
        </h1>
        <p className="cm-lead">
          {city
            ? `In ${city.city} netzwerken, Kontakte knüpfen und Partner finden.`
            : "Für Ihre Stadt. Für Ihren Verein. Unter Ihrer eigenen Marke."}
        </p>
        <p className="cm-hero-description">
          {city
            ? "Unternehmen und Leistungen entdecken, im Mitglieder-Chat sprechen, Angebote teilen und Zusammenarbeit auf den Weg bringen – dann, wenn es in Ihren Alltag passt."
            : "Entdecken Sie Unternehmen, finden Sie passende Partner und kommen Sie direkt ins Gespräch. In Ihrem regionalen Unternehmernetzwerk – oder in einem eigenen Netzwerk für Ihren Verein, Verband oder Business Club."}
        </p>
        <div className="cm-actions">
          <Link className="cm-button" href={(city ? "#mitgliedschaft" : registration) as never}>
            {city ? "Mitglied werden" : "Netzwerk entdecken"}
          </Link>
          <Link
            className="cm-button cm-button-ghost"
            href={
              (city
                ? `/anmelden?network=${city.slug}`
                : marketingHref(prefix, "eigenes-portal")) as never
            }
          >
            {city ? "Als Mitglied einloggen" : "Eigenes Netzwerk aufbauen"}
          </Link>
        </div>
      </div>
      {!city && (
        <div className={`cm-photo-controls${playing ? " is-playing" : ""}`}>
          <nav className="cm-city-ticker" aria-label="Direkt zu Ihrem Stadtnetzwerk">
            <div className="cm-city-ticker-track">
              {[0, 1].map((copy) => (
                <div className="cm-city-ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                  {CITY_NETWORKS.map((network) => (
                    <Link key={network.key} href={`${prefix}${network.route}` as never} tabIndex={copy === 1 ? -1 : undefined} prefetch={false}>
                      {network.city}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </nav>
          <button type="button" className="cm-motion-toggle" onClick={() => setPlaying(!playing)} aria-pressed={!playing}>
            {playing ? "Animation pausieren" : "Animation starten"}
          </button>
        </div>
      )}
    </section>
  );
}
function Directory({ prefix }: { prefix: string }) {
  const [query, setQuery] = useState("");
  const cities = CITY_NETWORKS.filter((c) =>
    `${c.city} ${c.region}`
      .toLocaleLowerCase("de")
      .includes(query.toLocaleLowerCase("de")),
  );
  return (
    <section className="cm-section cm-directory" id="netzwerke">
      <div className="cm-section-heading">
        <div>
          <p className="cm-eyebrow">Unternehmernetzwerke vor Ort</p>
          <h2>
            Gute Verbindungen
            <br />
            <em>beginnen vor Ort.</em>
          </h2>
        </div>
        <div>
          <p>
            Entdecken Sie Ihr Stadtnetzwerk. Jedes Netzwerk hat seinen eigenen
            Mitgliederbereich – mit Unternehmen, Inhalten und Gesprächen aus
            genau diesem Netzwerk.
          </p>
          <label className="cm-search">
            Stadt oder Region suchen
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Zum Beispiel Bremen"
            />
          </label>
        </div>
      </div>
      <CityOrbit cities={cities} prefix={prefix} />
      {cities.length === 0 && (
        <p role="status">
          Keine passende Stadt gefunden. Versuchen Sie einen anderen
          Suchbegriff.
        </p>
      )}
    </section>
  );
}
function Benefits({ city }: { city?: City }) {
  return (
    <section className="cm-section" id="vorteile">
      <div className="cm-section-heading">
        <div>
          <p className="cm-eyebrow">Regional. Digital. Persönlich.</p>
          <h2>
            Ein Netzwerk, das im
            <br />
            <em>Alltag weiterhilft.</em>
          </h2>
        </div>
        <p>
          Ein guter Geschäftskontakt beginnt damit, voneinander zu wissen.{" "}
          {city
            ? `Lernen Sie Unternehmen aus ${city.city} kennen.`
            : "Finden Sie Unternehmen in Ihrem Stadtnetzwerk."}{" "}
          Zeigen Sie, was Sie anbieten, und nehmen Sie direkt Kontakt auf.
        </p>
      </div>
      <div className="cm-benefits">
        {[
          [
            "Kontakte finden",
            "Suchen Sie nach Unternehmen, Leistungen und Produkten, die zu Ihrem Vorhaben passen.",
          ],
          [
            "Sichtbar werden",
            "Präsentieren Sie Ihr Unternehmen und zeigen Sie anderen Mitgliedern, wobei Sie helfen können.",
          ],
          [
            "Direkt austauschen",
            "Schreiben Sie im Mitglieder-Chat, stellen Sie Fragen und besprechen Sie gemeinsame Möglichkeiten.",
          ],
        ].map(([title, text], i) => (
          <article key={title}>
            <span className="cm-icon">
              <Icon kind={i} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
function Explorer() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="cm-section cm-functions" id="moeglichkeiten">
      <p className="cm-eyebrow">Das können Sie im Portal tun</p>
      <h2>
        Mehr als ein Verzeichnis.
        <br />
        <em>Ihr Netzwerk zum Mitmachen.</em>
      </h2>
      <div className="cm-explorer">
        <div className="cm-tabs" role="tablist" aria-label="Portalfunktionen">
          {features.map((f, i) => (
            <button
              role="tab"
              key={f[0]}
              id={`cm-tab-${i}`}
              aria-controls={`cm-feature-${i}`}
              aria-selected={i === selected}
              onKeyDown={(event) => {
                if (
                  [
                    "ArrowDown",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowLeft",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? features.length - 1
                        : (i +
                            (["ArrowDown", "ArrowRight"].includes(event.key)
                              ? 1
                              : -1) +
                            features.length) %
                          features.length;
                  setSelected(next);
                  document.getElementById(`cm-tab-${next}`)?.focus();
                }
              }}
              onClick={() => setSelected(i)}
            >
              <Icon kind={i} />
              {f[0]}
            </button>
          ))}
        </div>
        {features.map((feature, i) => (
          <article
            key={feature[0]}
            id={`cm-feature-${i}`}
            hidden={selected !== i}
            role="tabpanel"
            aria-labelledby={`cm-tab-${i}`}
          >
            <span className="cm-icon">
              <Icon kind={i} />
            </span>
            <h3>{feature[1]}</h3>
            <p>{feature[2]}</p>
            <div className="cm-practical">
              <strong>Für Ihren Alltag</strong>
              <p>{feature[3]}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="cm-secondary">
        Jedes Netzwerk bleibt unter sich. Die Netzwerkleitung legt fest, welche
        Bereiche genutzt werden. Chat-Inhalte bleiben vertraulich.
      </p>
    </section>
  );
}
function Membership({
  city,
  offer,
  preview = false,
}: {
  city: City;
  offer?: CityMembershipOffer | null;
  preview?: boolean;
}) {
  if (preview || offer?.contribution)
    return (
      <CityContributionPresentation
        networkName={`Unternehmernetzwerk ${city.city}`}
        networkSlug={city.slug}
        prefix={preview?"/entwurf-manus":""}
        preview={preview}
      />
    );
  return (
    <section className="cm-section cm-membership" id="mitgliedschaft">
      <div>
        <p className="cm-eyebrow">Ihre Mitgliedschaft. Ihr Mehrwert.</p>
        <h2>
          Ihr Unternehmen gehört
          <br />
          <em>ins Gespräch.</em>
        </h2>
        <p>
          Mit Ihrer Unternehmensseite sind Sie im Netzwerk präsent. Sie finden
          passende Leistungen, knüpfen neue Kontakte und bleiben im persönlichen
          Austausch – unabhängig vom nächsten Veranstaltungstermin.
        </p>
        <ul>
          <li>Ein eigener Auftritt für Ihr Unternehmen</li>
          <li>Direkter Austausch mit anderen Mitgliedern</li>
          <li>Angebote, Gesuche und neue Möglichkeiten entdecken</li>
        </ul>
        <p>
          Das Netzwerk entwickelt sich mit seinen Mitgliedern. Neue Kontakte,
          Kooperationen oder Aufträge sind nicht garantiert.
        </p>
      </div>
      <LeverkusenOffer
        initialOffer={offer}
        requestHref={`/registrieren?network=${city.slug}`}
        networkSlug={city.slug}
        formal
      />
    </section>
  );
}
const faq = [
  [
    "Was ist B2B Matching?",
    "B2B Matching ist die Plattform für digitale Unternehmernetzwerke. Sie stellen Ihr Unternehmen vor, finden Leistungen und kommen mit anderen Mitgliedern in Kontakt. Daneben betreiben Organisationen eigene, separat gebrandete Netzwerkportale auf unserer Plattform.",
  ],
  [
    "Sind die Stadtnetzwerke miteinander verbunden?",
    "Nein. Jedes Stadtnetzwerk hat einen eigenen Mitgliederbereich. Unternehmensseiten, Nachrichten und Inhalte werden nicht mit anderen Netzwerken vermischt.",
  ],
  [
    "Wie werde ich Mitglied?",
    "Wählen Sie Ihre Stadt und fragen Sie Ihre Mitgliedschaft an. Nach der E-Mail-Bestätigung und Prüfung Ihrer Anfrage schließen Sie die Buchung zu den angezeigten Konditionen ab. Die Anfrage allein löst noch keine Rechnung aus.",
  ],
  [
    "Wann sehe ich die Kosten?",
    "Auf der Stadtseite und vor der verbindlichen Buchung sehen Sie die aktuellen Konditionen, Laufzeit, Nettobetrag, Umsatzsteuer und Gesamtbetrag. Bereits zugesagte oder gebuchte Konditionen bleiben unverändert.",
  ],
  [
    "Kann ich ein eigenes Netzwerk betreiben?",
    "Ja. Wir richten ein eigenständiges White-Label-Portal für Ihre Organisation ein. Sie bestimmen Branding, Mitglieder und genutzte Funktionen. Auf Wunsch entwickeln wir dazu gemeinsam eine passende Homepage.",
  ],
] as const;
export function CityMarketing({
  cityKey,
  preview = false,
  offer,
}: {
  cityKey?: string;
  preview?: boolean;
  offer?: CityMembershipOffer | null;
}) {
  const city = cityKey
    ? CITY_NETWORKS.find((c) => c.key === cityKey)
    : undefined;
  const prefix = preview ? "/entwurf-manus" : "";
  return (
    <div className="cityMarketing">
      <a className="cm-skip" href="#cm-main">
        Zum Inhalt springen
      </a>
      {preview && (
        <div className="cm-preview">
          Designvorschau · nicht veröffentlicht. Login und Mitgliedschaft führen
          in das bestehende System; dort gelten die angezeigten Konditionen.
        </div>
      )}
      <Header prefix={prefix} city={city} />
      <main id="cm-main">
        <Hero city={city} prefix={prefix} />
        {!city && <Directory prefix={prefix} />}
        <Benefits city={city} />
        {city ? (
          <Explorer />
        ) : (
          <section className="cm-section cm-soft">
            <p className="cm-eyebrow">Ihr Netzwerk zum Mitmachen</p>
            <h2>
              Vom eigenen Auftritt
              <br />
              <em>zum persönlichen Gespräch.</em>
            </h2>
            <div className="cm-editorial-grid">
              {features.slice(0, 3).map((feature) => (
                <article key={feature[0]}>
                  <h3>{feature[0]}</h3>
                  <p>{feature[2]}</p>
                </article>
              ))}
            </div>
            <Link
              className="cm-button"
              href={marketingHref(prefix, "funktionen") as never}
            >
              Alle Funktionen kennenlernen
            </Link>
          </section>
        )}
        {!city && (
          <CityContributionPresentation prefix={prefix} preview={preview} />
        )}
        {city ? (
          <Membership city={city} offer={offer} preview={preview} />
        ) : (
          <section className="cm-section cm-own-portal">
            <div>
              <p className="cm-eyebrow">Für Unternehmen und Gemeinschaften</p>
              <h2>
                Ihr Netzwerk.
                <br />
                <em>Ihr eigenes Portal.</em>
              </h2>
              <p>
                Sie führen einen Verband, Verein oder Business Club? Bringen Sie
                Ihre Mitglieder in einem eigenen digitalen Netzwerk zusammen.
                Unter Ihrer Marke und mit den Funktionen, die Sie brauchen.
              </p>
              <p>
                Sie behalten die Kontrolle über Mitglieder, Inhalte und
                Freischaltungen. Auf Wunsch entwickeln wir mit Ihnen auch die
                passende Homepage.
              </p>
              <Link
                className="cm-button"
                href={marketingHref(prefix, "eigenes-portal") as never}
              >
                Eigenes Portal kennenlernen
              </Link>
            </div>
            <div className="cm-brand-panel">
              <img
                src="/images/b2b-matching-logo-full.png"
                alt="B2B Matching"
                width="240"
                height="40"
              />
              <strong>
                Ihre Marke.
                <br />
                Ihre Mitglieder.
                <br />
                Ihr Netzwerk.
              </strong>
              <span>White Label · getrennte Mitgliederbereiche · modular</span>
            </div>
          </section>
        )}
        <section className="cm-section cm-faq" id="fragen">
          <div>
            <p className="cm-eyebrow">Gut zu wissen</p>
            <h2>
              Ihr Einstieg.
              <br />
              <em>Klar erklärt.</em>
            </h2>
          </div>
          <div>
            {(city ? faq : faq.slice(0, 3)).map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <Link
            className="cm-page-text-link"
            href={marketingHref(prefix, "fragen") as never}
          >
            Alle Fragen und Antworten
          </Link>
        </section>
        <section className="cm-final">
          <p className="cm-eyebrow">Ihr nächster Schritt</p>
          <h2>
            {city
              ? `Lernen Sie Ihr Netzwerk in ${city.city} kennen.`
              : "Ihr nächster guter Kontakt beginnt hier."}
          </h2>
          <p>
            {city
              ? "Zeigen Sie Ihr Unternehmen und kommen Sie mit anderen Mitgliedern ins Gespräch."
              : "Entdecken Sie Ihr Stadtnetzwerk – oder betreiben Sie Ihr eigenes Portal."}
          </p>
          <div className="cm-actions">
            <Link
              className="cm-button"
              href={
                (city
                  ? "#mitgliedschaft"
                  : marketingHref(prefix, "netzwerke")) as never
              }
            >
              {city ? "Mitglied werden" : "Stadt auswählen"}
            </Link>
            <Link
              className="cm-button cm-button-ghost"
              href={marketingHref(prefix, "eigenes-portal") as never}
            >
              Eigenes Portal
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter prefix={prefix} />
    </div>
  );
}
export {
  Header as MarketingHeader,
  Directory as CityDirectory,
  Benefits as MarketingBenefits,
  Explorer as PortalExplorer,
};
