import { LeverkusenBrand } from "./leverkusen-brand";
import { LeverkusenOffer } from "./leverkusen-offer";
import { SiteFooter, SiteHeader } from "./site-chrome";
import "./city-landing.css";

const benefits = [
  [
    "search",
    "Die Richtigen finden",
    "Suchen Sie nach Unternehmen, Leistungen oder Produkten. Lernen Sie kennen, wer zu Ihrem Vorhaben passt.",
  ],
  [
    "company",
    "Ihr Unternehmen zeigen",
    "Mit einer eigenen Unternehmensseite machen Sie sichtbar, was Sie anbieten – und warum sich ein Kontakt lohnt.",
  ],
  [
    "chat",
    "Direkt ins Gespräch kommen",
    "Vernetzungsanfrage senden oder im Mitglieder-Chat schreiben. Einfach persönlich miteinander austauschen.",
  ],
  [
    "exchange",
    "Angebote teilen",
    "Zeigen Sie, wobei Sie helfen können. Oder teilen Sie mit, welche Leistung und welche Unterstützung Sie suchen.",
  ],
  [
    "calendar",
    "Begegnungen ermöglichen",
    "Entdecken Sie Veranstaltungen und Treffen im Netzwerk. Online verbunden bleiben und persönlich kennenlernen.",
  ],
  [
    "news",
    "Mitbekommen, was passiert",
    "Neue Unternehmen, Beiträge und Gesprächsstoff: Das schwarze Brett hält Ihr Netzwerk auf dem Laufenden.",
  ],
];
function BenefitIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    search: "M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    company: "M4 21V5h16v16M9 21v-5h6v5M8 9h2m4 0h2M8 12h2m4 0h2M2 21h20",
    chat: "M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9M7 8h10M7 12h7",
    exchange: "M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4",
    calendar:
      "M8 2v5m8-5v5M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
    news: "M4 3h16v18H4zM8 7h8M8 11h8M8 15h5",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type]} />
    </svg>
  );
}
export function CityLanding({
  city,
  slug,
  route,
  image,
  districts,
  primary,
}: {
  city: string;
  slug: string;
  route: string;
  image: string;
  districts: string[];
  primary: string;
}) {
  const request = `/registrieren?network=${slug}`;
  const login = `${request}&mode=login`;
  const faq = [
    [
      "Für wen ist das Netzwerk gedacht?",
      `Für Unternehmen, Selbstständige und unternehmerisch Tätige mit Sitz in ${city}. Branchenübergreifend und ausschließlich im geschäftlichen Kontext.`,
    ],
    [
      `Ist das ein Angebot der Stadt ${city}?`,
      `Nein. Das Unternehmernetzwerk ${city} ist ein unabhängiges Angebot von B2B-Matching.de, betrieben durch die Media Online Innovations Group, Inhaber Martin Kelm. Es ist kein Angebot der Stadtverwaltung, eines Vereins oder einer Kammer.`,
    ],
    [
      "Muss ich regelmäßig an Veranstaltungen teilnehmen?",
      "Nein. Das Netzwerk ist online nutzbar, wann es in Ihren Alltag passt. Veranstaltungen sind eine zusätzliche Möglichkeit zum persönlichen Austausch.",
    ],
    [
      "Was kostet die Mitgliedschaft?",
      "Die aktuellen Konditionen werden aus den Einstellungen dieses Netzwerks geladen und vor dem verbindlichen Abschluss mit Laufzeit, Nettobetrag, Umsatzsteuer und Gesamtpreis angezeigt. Die Teilnahmeanfrage allein löst noch keine Rechnung aus.",
    ],
    [
      "Sind meine Unternehmensseite und Chats öffentlich?",
      "Das Netzwerk ist ein geschützter Mitgliederbereich. Persönliche Chats sind nur für die jeweiligen Gesprächsteilnehmer bestimmt. Eine öffentliche Veröffentlichung von Profilangaben erfolgt nicht automatisch.",
    ],
    [
      "Kann ich meine Unternehmensseite später ändern?",
      "Ja. Texte, Bilder und Kontaktdaten können Sie jederzeit überarbeiten. Auch den von PagePilot AI erstellten Entwurf prüfen und bearbeiten Sie selbst.",
    ],
  ];
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${base}${route}#network`,
        name: `Unternehmernetzwerk ${city}`,
        serviceType: "Digitales B2B-Unternehmensnetzwerk",
        url: `${base}${route}`,
        areaServed: { "@type": "City", name: city },
        provider: {
          "@type": "Organization",
          name: "Media Online Innovations Group, Inhaber Martin Kelm",
          url: base,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text },
        })),
      },
    ],
  };
  return (
    <LeverkusenBrand
      networkSlug={slug}
      primaryColor={primary}
      secondaryColor="#171717"
    >
      <SiteHeader />
      <main className="cityLanding">
        <div className="access">
          <div className="wrap">
            <span>UNTERNEHMERNETZWERK {city.toLocaleUpperCase("de-DE")}</span>
            <a href={login}>Bereits Mitglied? Anmelden ↗</a>
          </div>
        </div>
        <section
          className="hero"
          style={{ backgroundImage: `url('${image}')` }}
        >
          <div className="wrap">
            <span className="eyebrow">
              Ihre Stadt. Ihre Kontakte. Ihr Netzwerk.
            </span>
            <h1>
              Eine Stadt voller
              <br />
              Unternehmen.
              <br />
              <em>Und Sie mittendrin.</em>
            </h1>
            <p>
              Unternehmen aus {city} kennenlernen, Kontakte knüpfen und im
              Mitglieder-Chat direkt austauschen. Teilen Sie Angebote und finden
              Sie die passenden Geschäftspartner – einfach online.
            </p>
            <div className="actions">
              <a className="btn" href={request}>
                Mitgliedschaft anfragen <span aria-hidden="true">↗</span>
              </a>
              <a className="btn outline" href="#mehrwert">
                Was bringt mir das?
              </a>
            </div>
            <div className="quiet">
              Online vernetzen. Persönlich austauschen. In {city} etwas bewegen.
            </div>
            <span className="caption">KI-generiertes Symbolbild</span>
          </div>
        </section>
        <div className="trust">
          <div className="wrap">
            <span>
              <b>✓</b> Für Unternehmen aus {city}
            </span>
            <span>
              <b>✓</b> Branchenübergreifend
            </span>
            <span>
              <b>✓</b> Geschlossener Mitgliederbereich
            </span>
            <span>
              <b>✓</b> Unabhängig betrieben
            </span>
          </div>
        </div>
        <section className="section" id="idee">
          <div className="wrap intro">
            <div>
              <span className="eyebrow">Kommt Ihnen das bekannt vor?</span>
              <h2>
                „Kennen Sie jemanden,
                <br />
                der das übernehmen kann?“
              </h2>
            </div>
            <div>
              <p className="quote">
                Ein Auftrag winkt. Die Zeit drängt. Und Ihnen fehlt genau der
                richtige Kontakt.
              </p>
              <p>
                Vielleicht sitzt die passende Unterstützung in {districts[0]},
                in {districts[1]} oder nur wenige Straßen weiter. Sie wissen nur
                noch nichts voneinander.
              </p>
              <p>
                Genau das wollen wir ändern. Das{" "}
                <strong>Unternehmernetzwerk {city} auf B2B-Matching.de</strong>{" "}
                bringt Unternehmen und ihre Leistungen an einem Ort zusammen.
                Nicht erst beim nächsten Frühstück oder nach Feierabend. Sondern
                dann, wenn es in Ihren Alltag passt.
              </p>
            </div>
          </div>
        </section>
        <section className="section soft" id="mehrwert">
          <div className="wrap">
            <div className="sectionhead">
              <div>
                <span className="eyebrow">
                  Weniger suchen. Mehr miteinander.
                </span>
                <h2>
                  Ein Netzwerk, das im
                  <br />
                  Arbeitsalltag weiterhilft.
                </h2>
              </div>
              <p>
                Ob konkrete Unterstützung oder eine neue Geschäftsidee: Alles
                beginnt damit, voneinander zu wissen.
              </p>
            </div>
            <div className="features">
              {benefits.map(([icon, title, text]) => (
                <article className="feature" key={title}>
                  <div className="symbol">
                    <BenefitIcon type={icon} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="wrap showcase">
            <div>
              <span className="eyebrow">Mehr als ein Name im Verzeichnis</span>
              <h2>
                Zeigen Sie, was
                <br />
                in Ihrem Betrieb steckt.
              </h2>
              <p className="lead">
                Ihre Unternehmensseite macht aus „Was machen Sie eigentlich?“
                einen echten Gesprächseinstieg.
              </p>
              <ul className="checklist">
                <li>Leistungen, Angebote und Gesuche an einem Ort</li>
                <li>Persönlicher Ansprechpartner statt anonymer Eintrag</li>
                <li>Logo, Titelbild und Inhalte in Ihrem Auftritt</li>
                <li>Digitale Visitenkarte mit QR-Code zum Speichern</li>
              </ul>
              <a className="btn" href={request}>
                Mit Ihrem Unternehmen dabei sein ↗
              </a>
            </div>
            <div className="demo">
              <div className="demobar">
                <i />
                <i />
                <i />
              </div>
              <div className="mock">
                <small>UNTERNEHMEN AUS {city.toLocaleUpperCase("de-DE")}</small>
                <h3>
                  Gute Ideen brauchen
                  <br />
                  die richtigen Menschen.
                </h3>
                <p>
                  Hier zeigen Sie Ihr Unternehmen, Ihre Leistungen und das, was
                  Sie für andere möglich machen.
                </p>
                <div className="chips">
                  <span className="chip">Ihre Leistungen</span>
                  <span className="chip">Ihr Angebot</span>
                  <span className="chip">Ihr Ansprechpartner</span>
                </div>
              </div>
              <div className="chat">
                <span>MITGLIEDER-CHAT</span>Guten Tag! Ihre Leistung passt zu
                einem Projekt, das wir gerade planen. Lassen Sie uns sprechen.
              </div>
              <small className="demo-label">
                Illustrative Darstellung · kein echtes Mitgliederprofil
              </small>
            </div>
          </div>
        </section>
        <section className="section ai">
          <div className="wrap showcase">
            <div className="ai-panel">
              <div className="url">↗ &nbsp; www.ihr-unternehmen.de</div>
              <div className="progress">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="ai-list">
                <div>
                  <b>✓</b> Unternehmen verstehen
                </div>
                <div>
                  <b>✓</b> Leistungen strukturieren
                </div>
                <div>
                  <b>✓</b> Inhalte vorbereiten
                </div>
                <div>
                  <b>✎</b> Prüfen &amp; anpassen
                </div>
              </div>
              <p className="ai-note">
                Von Ihrer Homepage zu Ihrem persönlichen Netzwerkauftritt.
              </p>
            </div>
            <div>
              <span className="eyebrow">PagePilot AI</span>
              <h2>
                Ihre Homepage ist da.
                <br />
                Ihre Unternehmensseite
                <br />
                ist der nächste Schritt.
              </h2>
              <p className="lead">
                Keine Lust, alles noch einmal zu schreiben? PagePilot AI
                analysiert Ihre Homepage und bereitet einen strukturierten
                Seitenentwurf vor.
              </p>
              <p>
                Sie prüfen die Inhalte, ergänzen Ihren persönlichen Auftritt und
                veröffentlichen selbst. Texte und Bilder bleiben jederzeit
                bearbeitbar.
              </p>
              <a className="btn light" href={request}>
                Einfach im Netzwerk starten ↗
              </a>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="wrap">
            <span className="eyebrow">So kommen Sie dazu</span>
            <h2>
              Kein neuer Termin.
              <br />
              Ein neuer Zugang zu {city}.
            </h2>
            <div className="steps">
              {[
                [
                  "01 · TEILNAHME ANFRAGEN",
                  "Wir lernen Sie kennen.",
                  "Registrieren Sie Ihr Unternehmen und bestätigen Sie Ihre E-Mail-Adresse. Wir prüfen Ihre Anfrage für das geschlossene Netzwerk.",
                ],
                [
                  "02 · UNTERNEHMEN PRÄSENTIEREN",
                  "Zeigen Sie Ihre Stärken.",
                  "Nach der Freigabe schließen Sie die Buchung zu Ihren angezeigten Konditionen ab und richten Ihre Unternehmensseite ein – selbst oder mit PagePilot AI.",
                ],
                [
                  "03 · KONTAKTE AUFBAUEN",
                  "Jetzt wird es persönlich.",
                  "Unternehmen entdecken, Vernetzung anfragen und eine Nachricht schreiben. Der nächste Austausch ist nur einen Klick entfernt.",
                ],
              ].map(([label, title, text]) => (
                <div className="step" key={label}>
                  <span>{label}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <div className="cityline">
              <strong>In Ihrer Stadt steckt mehr, als Sie denken.</strong>{" "}
              {districts.join(" · ")}
            </div>
          </div>
        </section>
        <section className="section soft" id="teilnahme">
          <div className="wrap">
            <div className="offer">
              <div>
                <span className="eyebrow">
                  Ihr Einstieg ins Unternehmernetzwerk {city}
                </span>
                <h2>
                  Neue Kontakte.
                  <br />
                  Neue Möglichkeiten.
                  <br />
                  Einfach anfangen.
                </h2>
                <p>
                  Lernen Sie Unternehmen aus Ihrer Stadt kennen, zeigen Sie Ihre
                  Leistungen und finden Sie neue Verbindungen für Ihre
                  geschäftlichen Vorhaben.
                </p>
                <p className="small">
                  Hier sehen Sie die aktuellen Konditionen dieses Netzwerks.
                  Ihre persönlichen Teilnahmebedingungen werden vor dem
                  verbindlichen Abschluss angezeigt.
                </p>
                <a className="btn" href={request}>
                  Jetzt Mitgliedschaft anfragen ↗
                </a>
              </div>
              <div className="offerbox">
                <LeverkusenOffer
                  requestHref={request}
                  networkSlug={slug}
                  formal
                />
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="fragen">
          <div className="wrap faq">
            <span className="eyebrow">Gut zu wissen</span>
            <h2>Noch eine Frage?</h2>
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing">
          <span className="eyebrow">
            {city} hat die Unternehmen. Bringen wir sie zusammen.
          </span>
          <h2>
            Vielleicht fehlt Ihnen nicht die Lösung.
            <br />
            Sondern nur der richtige Kontakt.
          </h2>
          <p>
            Machen Sie Ihr Unternehmen sichtbar und entdecken Sie, was die
            Unternehmen Ihrer Stadt für Sie möglich machen.
          </p>
          <div className="actions">
            <a className="btn" href={request}>
              Mitgliedschaft anfragen ↗
            </a>
            <a href={login}>Bereits Mitglied? Zum Login →</a>
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
      </main>
      <SiteFooter formal />
    </LeverkusenBrand>
  );
}
