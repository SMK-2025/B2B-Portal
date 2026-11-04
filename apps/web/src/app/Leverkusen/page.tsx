import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
import { LeverkusenOffer } from "../components/leverkusen-offer";
import "./leverkusen.css";

const title = "Unternehmernetzwerk Leverkusen | Unternehmen finden & vernetzen";
const description =
  "Unternehmen in Leverkusen kennenlernen, Leistungen entdecken und Geschäftskontakte aufbauen. Dein digitales B2B-Netzwerk mit Unternehmensprofil, Chat und lokalen Treffen.";
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
const request = "/registrieren?network=unternehmernetzwerkleverkusen";
const login = request + "&mode=login";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/Leverkusen" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "B2B Matching",
    title,
    description,
    url: "/Leverkusen",
    images: [
      {
        url: "/images/leverkusen-network-blue-hour-v2.webp",
        width: 2172,
        height: 724,
        alt: "KI-generierte Bildmontage: Unternehmer im Gespräch vor der Leverkusener Stadtkulisse mit Wasserturm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/leverkusen-network-blue-hour-v2.webp"],
  },
};
const faq = [
  [
    "Was ist das Unternehmernetzwerk Leverkusen?",
    "Das Unternehmernetzwerk Leverkusen ist ein unabhängiges digitales B2B-Netzwerk auf B2B Matching für Unternehmen mit Sitz in Leverkusen. Mitglieder stellen ihre Leistungen vor, entdecken andere Unternehmen und knüpfen über Vernetzungsanfragen, PartnerChat und Veranstaltungen direkte Geschäftskontakte.",
  ],
  [
    "Für welche Unternehmen in Leverkusen ist die Teilnahme geeignet?",
    "Für Selbstständige, Handwerksbetriebe, Händler, Dienstleister und Industrieunternehmen mit Sitz in Leverkusen. Die Branche und die Unternehmensgröße sind nicht entscheidend. Die Teilnahme ist geschäftlich ausgerichtet, nicht für private Nutzer vorgesehen.",
  ],
  [
    "Wie finde ich passende Unternehmen und Leistungen?",
    "Nach deiner Freigabe kannst du das Mitgliederverzeichnis nach Unternehmen, Leistungen und Personen durchsuchen. Auf den Unternehmensseiten findest du die eingetragenen Kompetenzen, Angebote, Gesuche und Kontaktmöglichkeiten. Du kannst dich vernetzen oder direkt eine Nachricht senden.",
  ],
  [
    "Ist das ein Angebot der Stadt Leverkusen?",
    "Nein. Betreiber ist die Media Online Innovations Group, Inhaber Martin Kelm, aus Leverkusen. Das Netzwerk wird eigenständig betrieben und ist kein Angebot der Stadtverwaltung, eines Vereins oder einer Kammer. Eine Vereinsmitgliedschaft ist nicht erforderlich.",
  ],
  [
    "Muss ich an regelmäßigen Treffen teilnehmen?",
    "Nein. Du nutzt das Portal unabhängig von festen Veranstaltungsterminen. Wenn im Netzwerk ein Treffen angeboten wird, entscheidest du selbst, ob du teilnehmen möchtest. Online-Kontakte und persönliche Begegnungen können sich ergänzen.",
  ],
  [
    "Was kostet die Mitgliedschaft?",
    "Die Teilnahme ist kostenpflichtig. Die aktuellen Konditionen für dieses Netzwerk werden auf dieser Seite aus den Netzwerkeinstellungen geladen und im Registrierungsprozess mit Laufzeit, Nettobetrag, Umsatzsteuer und Gesamtpreis angezeigt. Die Teilnahmeanfrage allein löst noch keine Rechnung aus; nach Freigabe schließt du die Buchung mit deinen Rechnungsangaben ab.",
  ],
  [
    "Sind meine Unternehmensseite und Nachrichten öffentlich?",
    "Das Mitgliederverzeichnis und die Unternehmensseiten sind für berechtigte Mitglieder dieses Netzwerks bestimmt, nicht als öffentlich durchsuchbare Firmenliste. Persönliche Chats sind für die jeweiligen Gesprächsteilnehmer vorgesehen. Beiträge und offene Diskussionen richten sich dagegen an den freigegebenen Netzwerkkreis. Private Profil- oder Chatdaten werden nicht für Suchmaschinen veröffentlicht.",
  ],
  [
    "Was passiert nach meiner Teilnahmeanfrage?",
    "Du gibst deine Unternehmens- und Kontaktdaten an, prüfst die Konditionen und bestätigst deine E-Mail-Adresse. Wir prüfen den Bezug zu Leverkusen. Bis zur Freigabe bleiben die Netzwerkfunktionen gesperrt. Anschließend schließt du die Buchung ab und richtest deine Unternehmensseite ein – selbst oder mit optionaler Unterstützung durch PagePilot AI.",
  ],
];
const districts = [
  "Wiesdorf",
  "Opladen",
  "Schlebusch",
  "Hitdorf",
  "Rheindorf",
  "Bürrig",
  "Küppersteg",
  "Manfort",
  "Quettingen",
  "Lützenkirchen",
  "Steinbüchel",
  "Alkenrath",
  "Bergisch Neukirchen",
];
const features = [
  {
    icon: "people",
    title: "Die richtigen Menschen kennenlernen.",
    text: "Entdecke die Unternehmen hinter den Namen. Mit einer Vernetzungsanfrage zeigst du Interesse – ganz ohne sofortigen Auftrag oder lange Vorstellungsrunde.",
    tag: "Netzwerk-Mitglieder",
  },
  {
    icon: "chat",
    title: "Einfach ins Gespräch kommen.",
    text: "Kein Umweg über Kontaktformulare: Schreib die Ansprechperson im PartnerChat direkt an, kläre eine Frage oder setze ein Gespräch vom letzten Treffen fort.",
    tag: "Persönlicher PartnerChat",
  },
  {
    icon: "search",
    title: "Leistungen und Angebote entdecken.",
    text: "Du brauchst Unterstützung für dein Vorhaben? Sieh dir Kompetenzen, Angebote und Gesuche der Mitglieder an und finde heraus, wer zu deiner Aufgabe passt.",
    tag: "Angebote & Gesuche",
  },
  {
    icon: "calendar",
    title: "Aus Kontakten Begegnungen machen.",
    text: "Entdecke Veranstaltungen im Netzwerk, sieh die Details an und melde deine Teilnahme an. Danach bleibt der Gesprächsfaden online erhalten.",
    tag: "Veranstaltungen & Rückblicke",
  },
];
const cases = [
  [
    "OPLADEN · HANDEL & GASTRONOMIE",
    "Ein Kundenabend ist geplant. Wer übernimmt das Catering?",
    "Du findest im Mitgliederverzeichnis lokale Anbieter, schaust dir ihre Leistungen an und fragst direkt nach. Oder du beschreibst deinen Bedarf als Gesuch.",
    "Passende Leistungen entdecken",
  ],
  [
    "SCHLEBUSCH · HANDWERK",
    "Der Auftrag steht. Ein Gewerk fehlt noch.",
    "Wer kann euch bei der Umsetzung unterstützen? Lerne andere Betriebe kennen, sieh dir ihre Kompetenzen an und kläre die Möglichkeiten im persönlichen Austausch.",
    "Kontakte für dein Vorhaben finden",
  ],
  [
    "WIESDORF · DIENSTLEISTUNGEN",
    "Ein gutes Gespräch. Und wie geht es weiter?",
    "Du findest die Person über ihre Unternehmensseite wieder, speicherst die Visitenkarte und setzt das Gespräch im PartnerChat fort – ohne bis zum nächsten Treffen zu warten.",
    "In Verbindung bleiben",
  ],
];
function Icon({ type }: { type: string }) {
  const paths: Record<string, string[]> = {
    people: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M16 3a4 4 0 0 1 0 8",
      "M22 21v-2a4 4 0 0 0-3-3.87",
    ],
    chat: [
      "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z",
      "M8 10h8",
      "M8 14h5",
    ],
    search: ["m21 21-5-5"],
    calendar: [
      "M8 2v4",
      "M16 2v4",
      "M3 10h18",
      "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    ],
  };
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === "people" && <circle cx="9" cy="7" r="4" />}
      {type === "search" && <circle cx="10.5" cy="10.5" r="7.5" />}
      {(paths[type] || paths.people).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
const structured = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": base + "/#operator",
      name: "Media Online Innovations Group",
      legalName: "Media Online Innovations Group, Inhaber Martin Kelm",
      url: base,
      email: "service@b2b-matching.de",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Im Weidenblech 25",
        postalCode: "51371",
        addressLocality: "Leverkusen",
        addressCountry: "DE",
      },
    },
    {
      "@type": "Service",
      "@id": base + "/Leverkusen#network",
      name: "Unternehmernetzwerk Leverkusen",
      serviceType: "Digitales B2B-Unternehmensnetzwerk",
      description: faq[0][1],
      url: base + "/Leverkusen",
      provider: { "@id": base + "/#operator" },
      areaServed: { "@type": "City", name: "Leverkusen" },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Unternehmen mit Sitz in Leverkusen",
      },
    },
    {
      "@type": "WebPage",
      "@id": base + "/Leverkusen#webpage",
      url: base + "/Leverkusen",
      name: title,
      description,
      inLanguage: "de-DE",
      about: { "@id": base + "/Leverkusen#network" },
      publisher: { "@id": base + "/#operator" },
      breadcrumb: { "@id": base + "/Leverkusen#breadcrumbs" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": base + "/Leverkusen#breadcrumbs",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "B2B Matching",
          item: base + "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Unternehmernetzwerk Leverkusen",
          item: base + "/Leverkusen",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": base + "/Leverkusen#faq",
      mainEntity: faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
};
export default function Leverkusen() {
  return (
    <div className="v2 levPublic">
      <SiteHeader />
      <main className="levLanding">
        <div className="levAccess">
          <div className="levWrap">
            <span>UNTERNEHMERNETZWERK LEVERKUSEN</span>
            <a href={login}>
              Schon Mitglied? Anmelden <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <header className="levHero">
          <img
            className="levHeroImage"
            src="/images/leverkusen-network-blue-hour-v2.webp"
            width="2172"
            height="724"
            alt=""
            fetchPriority="high"
          />
          <div className="levWrap levHeroInner">
            <span className="levEyebrow">
              <i />
              DEINE STADT. DEINE KONTAKTE. DEIN NETZWERK.
            </span>
            <h1>
              Leverkusen vernetzt.<em>Dein Unternehmen mittendrin.</em>
            </h1>
            <p className="levHeroLead">
              Gute Geschäftskontakte sind oft näher, als du denkst. Lerne
              Unternehmen aus Leverkusen kennen, entdecke ihre Leistungen und
              komm mit den Menschen dahinter direkt ins Gespräch.
            </p>
            <div className="levActions">
              <a className="levPrimary" href={request}>
                Teilnahme anfragen <span aria-hidden="true">↗</span>
              </a>
              <a className="levHeroSecondary" href="#entdecken">
                Das Netzwerk entdecken <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul className="levHeroChecks">
              <li>Für Unternehmen mit Sitz in Leverkusen</li>
              <li>Branchenübergreifend</li>
              <li>Persönliche Teilnahmeprüfung</li>
            </ul>
          </div>
          <span className="levImageNote">
            KI-generierte Bildmontage
          </span>
        </header>
        <nav className="levGuide" aria-label="Auf dieser Seite">
          <div className="levWrap">
            <a href="#entdecken">Die Idee</a>
            <a href="#vorteile">Dein Mehrwert</a>
            <a href="#praxis">So nutzt du es</a>
            <a href="#teilnahme">Teilnahme & Kosten</a>
            <a href="#fragen">Fragen & Antworten</a>
          </div>
        </nav>
        <section className="levWrap levSection levIntro" id="entdecken">
          <div>
            <span className="levEyebrow">
              LOKAL VERWURZELT. DIGITAL VERBUNDEN.
            </span>
            <h2>
              Eine Stadt voller Unternehmen.
              <br />
              <em>Wie viele davon kennst du wirklich?</em>
            </h2>
          </div>
          <div>
            <p className="levLead">
              <strong>
                Das Unternehmernetzwerk Leverkusen ist dein digitaler Treffpunkt
                für geschäftliche Kontakte vor Ort.
              </strong>{" "}
              Ein unabhängiges B2B-Netzwerk, in dem du dein Unternehmen
              vorstellst, passende Leistungen findest und neue Verbindungen
              aufbaust.
            </p>
            <p>
              Vielleicht sitzt dein nächster Projektpartner in Opladen. Dein
              künftiger Dienstleister in Schlebusch. Oder der Betrieb, der genau
              deine Unterstützung braucht, nur ein paar Straßen weiter. Hier
              wird aus räumlicher Nähe ein erster Kontakt.
            </p>
          </div>
        </section>
        <section
          className="levWrap levSection levBenefitsSection"
          id="vorteile"
        >
          <div className="levSectionHeading">
            <div>
              <span className="levEyebrow">MEHR ALS NUR EINE KONTAKTLISTE</span>
              <h2>
                Zeig, was du kannst.
                <br />
                Entdecke, wer dich weiterbringt.
              </h2>
            </div>
            <p>
              Nicht auf das nächste Treffen warten. Dein Netzwerk ist dort, wo
              du es gerade brauchst – am Rechner oder unterwegs auf dem
              Smartphone.
            </p>
          </div>
          <div className="levBenefitsLayout">
            <article className="levProfileFeature">
              <span className="levFeatureKicker">DEINE UNTERNEHMENSSEITE</span>
              <h3>Deine Leistungen bekommen ein Gesicht.</h3>
              <p>
                Dein Unternehmen ist mehr als ein Eintrag. Stell dich mit Logo,
                Titelbild, Leistungen, Angeboten und einer persönlichen
                Kontaktmöglichkeit vor. So erkennen andere Mitglieder schneller,
                was euch verbindet.
              </p>
              <div
                className="levProfileIllustration"
                aria-label="Schematische Funktionsvorschau einer Unternehmensseite"
              >
                <div className="levMiniNav">
                  <span>DEIN LOGO</span>
                  <span>Vorstellung · Leistungen · Kontakt</span>
                </div>
                <div className="levMiniHero">
                  <span>DEIN UNTERNEHMEN</span>
                  <strong>
                    Das können wir.
                    <br />
                    Dafür stehen wir.
                  </strong>
                  <div>
                    <span>Leistungen entdecken ↗</span>
                    <span>Vernetzen ＋</span>
                  </div>
                </div>
                <div className="levMiniFoot">
                  <span>
                    <i />
                    Persönlich vorgestellt
                  </span>
                  <span>Direkter Kontakt ↗</span>
                </div>
              </div>
              <small>Funktionsvorschau · keine echten Mitgliederdaten</small>
              <p className="levFeatureNote">
                Auf Wunsch hilft dir PagePilot AI, aus deiner Firmenhomepage
                einen bearbeitbaren Entwurf zu erstellen. Du prüfst und
                veröffentlichst selbst.
              </p>
            </article>
            <div className="levFeatureGrid">
              {features.map((f) => (
                <article className="levFeatureCard" key={f.title}>
                  <span className="levIcon">
                    <Icon type={f.icon} />
                  </span>
                  <span className="levFeatureTag">{f.tag}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="levExtraBenefits">
            <article>
              <span className="levIcon">
                <Icon type="chat" />
              </span>
              <div>
                <h3>Ein Schwarzes Brett, das verbindet.</h3>
                <p>
                  Neuigkeiten, neue Mitglieder und Ideen aus deinem Netzwerk an
                  einem Ort. Bei geöffneten Diskussionen kannst du dich direkt
                  einbringen.
                </p>
              </div>
            </article>
            <article>
              <span className="levIcon">
                <Icon type="people" />
              </span>
              <div>
                <h3>Den Kontakt gleich mitnehmen.</h3>
                <p>
                  Mit der digitalen Visitenkarte speicherst du freigegebene
                  Kontaktdaten per QR-Code oder Download – für das nächste
                  Gespräch.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="levLocal">
          <div className="levWrap levSection">
            <div className="levLocalHeader">
              <div>
                <span className="levEyebrow">
                  LEVERKUSEN IST UNSER GEMEINSAMER NENNER
                </span>
                <h2>
                  Kurze Wege.
                  <br />
                  <em>Neue Verbindungen.</em>
                </h2>
              </div>
              <p>
                Vom Einpersonenunternehmen bis zum Mittelstand: Hier zählt, was
                du anbietest, was du suchst und was ihr gemeinsam bewegen könnt.
                Für Handwerk, Handel, Dienstleistungen und Industrie – über
                Stadtteil- und Branchengrenzen hinweg.
              </p>
            </div>
            <div
              className="levDistricts"
              aria-label="Stadtteile von Leverkusen"
            >
              {districts.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="levLocalBottom">
              <p>
                Kein Vereinsbeitritt. Kein verpflichtender Frühstückstermin.
                <br />
                <strong>
                  Ein eigenes digitales Netzwerk für deinen
                  Unternehmensstandort.
                </strong>
              </p>
              <a href={request}>
                Deinen Betrieb im Netzwerk vorstellen{" "}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
        <section className="levWrap levSection" id="praxis">
          <div className="levSectionHeading">
            <div>
              <span className="levEyebrow">
                VOM KENNENLERNEN ZUR ZUSAMMENARBEIT
              </span>
              <h2>
                Was brauchst du gerade
                <br />
                für dein Unternehmen?
              </h2>
            </div>
            <p>
              Drei beispielhafte Anlässe, bei denen ein lokales Netzwerk im
              Alltag helfen kann. Die Möglichkeiten entstehen durch euch und
              euren Austausch.
            </p>
          </div>
          <div className="levCases">
            {cases.map(([location, heading, copy, result]) => (
              <article key={heading}>
                <span className="levCaseLocation">{location}</span>
                <h3>{heading}</h3>
                <p>{copy}</p>
                <span className="levCaseResult">
                  {result} <span aria-hidden="true">↗</span>
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="levClarity">
          <div className="levWrap levSection levClarityInner">
            <div>
              <span className="levEyebrow">
                OFFEN FÜR BRANCHEN. GESCHÜTZT IM AUSTAUSCH.
              </span>
              <h2>
                Du entscheidest,
                <br />
                mit wem du ins Gespräch kommst.
              </h2>
              <p>
                Dieses Netzwerk ist für geschäftliche Kontakte zwischen
                Leverkusener Unternehmen gedacht. Die Mitgliederbereiche sind
                nicht öffentlich zugänglich. Deine Unternehmensseite erscheint
                im freigegebenen Netzwerkkreis, nicht automatisch als
                öffentliche Firmenwebseite.
              </p>
              <a href="/sicherheit">
                Mehr zu Zugang und Schutz <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="levClarityPoints">
              <p>
                <strong>Teilnahme wird geprüft.</strong>
                <span>
                  Wir prüfen den Bezug zu Leverkusen, bevor die
                  Netzwerkfunktionen freigeschaltet werden.
                </span>
              </p>
              <p>
                <strong>Du bestimmst deinen Auftritt.</strong>
                <span>
                  Texte, Bilder, Angebote und Kontaktdaten deiner Partnerseite
                  kannst du selbst gestalten.
                </span>
              </p>
              <p>
                <strong>Es bleibt persönlich.</strong>
                <span>
                  Eine Vernetzungsanfrage ist ein erstes Signal. Was daraus
                  wird, entscheidet ihr miteinander.
                </span>
              </p>
            </div>
          </div>
        </section>
        <section className="levWrap levSection" id="teilnahme">
          <div className="levSectionHeading">
            <div>
              <span className="levEyebrow">
                DEIN PLATZ IM LEVERKUSENER NETZWERK
              </span>
              <h2>
                Stell dein Unternehmen vor.
                <br />
                Der erste Schritt ist eine Anfrage.
              </h2>
            </div>
            <p>
              Kein komplizierter Einstieg: Du wirst durch die Anmeldung geführt.
              Konditionen und Laufzeit siehst du transparent, bevor du
              bestätigst.
            </p>
          </div>
          <div className="levJoin">
            <ol>
              {[
                [
                  "Dein Unternehmen angeben.",
                  "Trag deine Unternehmens- und Kontaktdaten ein und bestätige die angezeigten Konditionen, AGB und Datenschutzhinweise.",
                ],
                [
                  "E-Mail bestätigen. Freigabe erhalten.",
                  "Wir prüfen deine Teilnahmeanfrage und den Standortbezug. Du kannst deinen Status bereits einsehen; Netzwerkfunktionen bleiben bis zur Freigabe gesperrt.",
                ],
                [
                  "Buchung abschließen. Sichtbar werden.",
                  "Nach der Freigabe schließt du die Buchung ab und richtest deine Partnerseite ein. Danach kannst du Unternehmen entdecken, dich vernetzen und den Austausch beginnen.",
                ],
              ].map(([heading, copy], i) => (
                <li key={heading}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{heading}</h3>
                    <p>{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <LeverkusenOffer requestHref={request} />
          </div>
        </section>
        <section className="levFaq" id="fragen">
          <div className="levWrap levSection levFaqLayout">
            <div>
              <span className="levEyebrow">
                KURZ GEFRAGT. KLAR BEANTWORTET.
              </span>
              <h2>
                Deine Fragen
                <br />
                zum Netzwerk.
              </h2>
              <p>
                Noch etwas offen? Du erreichst uns persönlich unter{" "}
                <a href="mailto:service@b2b-matching.de">
                  service@b2b-matching.de
                </a>
                .
              </p>
              <div className="levOperator">
                <span>UNABHÄNGIG BETRIEBEN IN LEVERKUSEN</span>
                <strong>Media Online Innovations Group</strong>
                <p>
                  Inhaber Martin Kelm
                  <br />
                  Im Weidenblech 25 · 51371 Leverkusen
                </p>
                <small>
                  Kein Angebot der Stadtverwaltung, eines Vereins oder einer
                  Kammer.
                </small>
              </div>
            </div>
            <div>
              {faq.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span aria-hidden="true">＋</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="levWrap levFinal">
          <span className="levEyebrow">
            DEIN NÄCHSTER KONTAKT IST VIELLEICHT GANZ NAH.
          </span>
          <h2>
            Leverkusen kann mehr,
            <br />
            <em>wenn wir uns kennen.</em>
          </h2>
          <p>
            Zeig, was dein Unternehmen ausmacht. Entdecke neue Möglichkeiten.
            <br />
            Und bring dich in dein lokales Business-Netzwerk ein.
          </p>
          <div className="levActions">
            <a className="levPrimary" href={request}>
              Jetzt Teilnahme anfragen <span aria-hidden="true">↗</span>
            </a>
            <a href={login}>Bereits Mitglied? Zum Login →</a>
          </div>
        </section>
        <div className="levMobileCta">
          <span>
            Dein B2B-Netzwerk
            <br />
            <strong>in Leverkusen</strong>
          </span>
          <a className="levPrimary" href={request}>
            Teilnahme anfragen ↗
          </a>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
