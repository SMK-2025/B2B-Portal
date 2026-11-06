import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
import { publicMetadata } from "../components/public-metadata";
import "./portal.css";

export const metadata = publicMetadata(
  "Eigenes Netzwerkportal: Ihre Mitglieder. Ihre Marke. Ihr Netzwerk.",
  "Ein eigenes White-Label-B2B-Netzwerkportal für Unternehmerkreise, Vereine, Verbände und regionale Initiativen. Mit Mitgliederseiten, Chat, Veranstaltungen und PagePilot AI.",
  "/eigenes-portal",
);
const contact =
  "mailto:service@b2b-matching.de?subject=Eigenes%20Netzwerkportal%20besprechen&body=Guten%20Tag%2C%0A%0Awir%20m%C3%B6chten%20ein%20eigenes%20Netzwerkportal%20kennenlernen.%0A%0AName%20des%20Netzwerks%3A%0AAnsprechpartner%3A%0AUngef%C3%A4hre%20Mitgliederzahl%3A%0ATelefon%20(optional)%3A";
const features = [
  [
    "01",
    "Unternehmen und Mitglieder finden",
    "Eigene Unternehmensseiten zeigen, wer im Netzwerk ist, was ein Unternehmen anbietet und wer ansprechbar ist. Suchbegriffe und Leistungen helfen, den passenden Kontakt zu finden.",
  ],
  [
    "02",
    "Nachrichten schreiben und vernetzen",
    "Vernetzungsanfragen signalisieren Interesse. Im Mitglieder-Chat lassen sich Fragen, Ideen und konkrete Vorhaben persönlich besprechen – ohne auf das nächste Treffen zu warten.",
  ],
  [
    "03",
    "Neuigkeiten lesen und kommentieren",
    "Am schwarzen Brett stehen Neuigkeiten, neue Unternehmen und Beiträge Ihrer Netzwerkleitung. Bilder und optionaler Austausch machen aus einer Information einen Gesprächsanlass.",
  ],
  [
    "04",
    "Veranstaltungen planen und teilnehmen",
    "Veranstaltungen mit Bild, Termin, Ort und Teilnahmefunktion bündeln die Informationen. Rückblicke halten gemeinsame Erlebnisse auch nach dem Treffen sichtbar.",
  ],
  [
    "05",
    "Leistungen, Angebote und Gesuche finden",
    "Mitglieder präsentieren Leistungen, Angebote und Gesuche auf ihrer Unternehmensseite. So wird sichtbar, wer bei einem Vorhaben unterstützen kann – direkt im eigenen Kreis.",
  ],
  [
    "06",
    "Kontakte auf dem Handy speichern",
    "Digitale Visitenkarten mit QR-Code und Kontaktdatei erleichtern es, Kontaktdaten auf dem Smartphone zu speichern. Aus dem digitalen Kennenlernen kann eine persönliche Verbindung entstehen.",
  ],
];
const questions = [
  [
    "Ist das ein weiteres öffentliches soziales Netzwerk?",
    "Nein. Ihr Portal ist ein eigener, geschlossener Bereich für Ihr Netzwerk. Sie steuern als Netzwerkleitung die Aufnahme. Öffentlich sichtbare Inhalte einer angebundenen Homepage sind davon getrennt und benötigen eine entsprechende Freigabe.",
  ],
  [
    "Was bedeutet White Label konkret?",
    "Ihr Netzwerk tritt mit eigenem Namen, Logo, Farben und Begrüßung auf. Mitglieder erhalten einen passenden Login- und Registrierungszugang. Technik und Betrieb werden durch die Media Online Innovations Group bereitgestellt; die Anbieterinformationen bleiben transparent.",
  ],
  [
    "Müssen unsere Mitglieder ihre Unternehmensseiten selbst aufwendig aufbauen?",
    "PagePilot AI kann aus der angegebenen öffentlichen Unternehmenshomepage einen bearbeitbaren Entwurf mit passenden Inhalten und verfügbaren Bildern vorbereiten. Das Mitglied prüft die Übernahme, ergänzt bei Bedarf und veröffentlicht selbst. Qualität und Umfang hängen von den verfügbaren Website-Inhalten und Nutzungsrechten ab.",
  ],
  [
    "Wer bezahlt die Nutzung?",
    "Das wird für Ihr Netzwerk vereinbart: Entweder übernimmt die Organisation die Kosten zentral oder Mitglieder buchen ihren Zugang zu den für das Netzwerk festgelegten Konditionen. Einen pauschalen Einheitspreis für jedes Netzwerk setzen wir hier bewusst nicht voraus.",
  ],
  [
    "Kann unsere öffentliche Homepage angebunden werden?",
    "Ja, eine individuelle Homepage-Anbindung ist nach Abstimmung möglich. Ausdrücklich freigegebene Mitgliederprofile, Veranstaltungen und Rückblicke können dann auch öffentlich erscheinen. Geschützte Inhalte und persönliche Chats werden dadurch nicht öffentlich.",
  ],
  [
    "Sind Sportfunktionen in jedem Portal enthalten?",
    "Nein. Spielpläne, Mannschaftsergebnisse und Tabellen sind individuelle Erweiterungen für passende Netzwerke. Ein Unternehmerkreis erhält keine unpassenden Sportbereiche.",
  ],
  [
    "Wer übernimmt die tägliche Verwaltung?",
    "Ihre benannten Netzwerkadministratoren kümmern sich um Mitglieder, Inhalte und Veranstaltungen. Wir stellen das Portal bereit und begleiten die technische Einrichtung. Zuständigkeiten, gewünschte Funktionen und Support stimmen wir vor dem Start ab.",
  ],
];
const catalogue = [
  [
    "Ein Auftritt, der zu Ihnen passt",
    [
      "Netzwerkname, Logo und individuelle Markenfarben",
      "Startseite mit eigenem Titelbild und Begrüßung",
      "Netzwerkbezogener Login und Registrierungszugang",
      "Responsive Nutzung am Desktop, Tablet und Smartphone",
    ],
  ],
  [
    "Mitglieder & Unternehmensseiten",
    [
      "Mitgliederverzeichnis mit Suche nach Unternehmen, Personen und Leistungen",
      "Unternehmensseiten mit Titelbild, Logo, Vorstellung und Kontakt",
      "Rubriken für Leistungen, Persönliches, Angebote und Gesuche",
      "Präsentationen und Dokumente auf der Unternehmensseite",
      "Bis zu fünf Unternehmensseiten je Konto; zusätzliche Seiten nur nach Betreiberfreigabe",
    ],
  ],
  [
    "Einfach in Verbindung bleiben",
    [
      "Vernetzungsanfragen unabhängig vom Chat",
      "Persönlicher Mitglieder-Chat mit Text, Emojis und Bildern",
      "Digitale Visitenkarte mit QR-Code und Kontakt-Download",
      "Benachrichtigungen zu neuen Inhalten und Anfragen",
      "Netzwerk empfehlen per persönlichem Link oder freigegebener E-Mail-Einladung",
    ],
  ],
  [
    "Aktuelles & Begegnungen",
    [
      "Schwarzes Brett mit Bildern und angepinnten Beiträgen",
      "Beiträge als Popup direkt im Portal öffnen",
      "Optionale Diskussionen mit Namen und Unternehmensbezug",
      "Veranstaltungen mit Bild, Termin, Ort und Teilnahmefunktion",
      "Teilnahmeübersicht für Verantwortliche und Rückblicke auf vergangene Treffen",
    ],
  ],
  [
    "Verwaltung mit klaren Zuständigkeiten",
    [
      "Einladungen und Teilnahmeanfragen für genau Ihr Netzwerk",
      "Mitgliederzugänge prüfen und im Verwaltungsbereich steuern",
      "Mehrere benannte Netzwerkadministratoren",
      "Inhalte, Veranstaltungen und Veröffentlichung im eigenen Netzwerk verwalten",
      "Berechtigungsabhängige Verwaltungsbereiche statt gleicher Rechte für alle",
    ],
  ],
  [
    "Komfort & geschützter Zugang",
    [
      "PagePilot AI für bearbeitbare Unternehmensseiten-Entwürfe",
      "Persönliches Konto mit Mitgliedschaft, Laufzeit und vorhandenen Rechnungen",
      "Optionale zusätzliche Anmeldung mit E-Mail-Zahlencode",
      "Individuelle Freigabe von Profilinhalten für eine angebundene öffentliche Homepage",
      "Getrennte Netzwerkinhalte und rollenbasierte Zugriffsrechte",
    ],
  ],
] as const;
export default function OwnPortalPage() {
  return (
    <main className="v2 publicSite ownPortal">
      <SiteHeader />
      <section className="opHero">
        <div className="opHeroCopy">
          <span className="opKicker">
            FÜR VEREINE, UNTERNEHMERKREISE UND NETZWERKE
          </span>
          <h1>
            Ihr eigenes Netzwerkportal.
            <br />
            <em>Mit Ihrem Namen und Logo.</em>
          </h1>
          <p>
            Hier finden Ihre Mitglieder andere Unternehmen, stellen ihre
            Leistungen vor und schreiben sich direkt im Chat. Sie
            veröffentlichen Neuigkeiten und planen Veranstaltungen. Wir richten
            das Portal für Ihr Netzwerk ein und kümmern uns um die Technik.
          </p>
          <div className="opActions">
            <a className="v2Button" href={contact}>
              Eigenes Portal besprechen <span aria-hidden="true">↗</span>
            </a>
            <a className="opTextLink" href="#einblicke">
              So funktioniert Ihr Portal ↓
            </a>
          </div>
          <div className="opHeroFacts">
            <span>✓ White-Label-fähig</span>
            <span>✓ Eigener Mitgliederkreis</span>
            <span>✓ Auf Wunsch mit neuer Homepage</span>
          </div>
        </div>
        <div
          className="opPreview"
          aria-label="Illustrative Ansicht eines eigenen Netzwerkportals"
        >
          <div className="opPreviewTop">
            <span className="opDemoLogo">N</span>
            <strong>
              Ihr Netzwerk<small>Persönlich verbunden.</small>
            </strong>
            <span className="opDemoTag">Beispielansicht</span>
          </div>
          <div className="opPreviewNav">
            <span>Startseite</span>
            <span>Mitglieder</span>
            <span>Mitglieder-Chat</span>
          </div>
          <div className="opPreviewHero">
            <small>SCHÖN, DASS SIE DA SIND</small>
            <b>
              Gute Kontakte.
              <br />
              Mehr Möglichkeiten.
            </b>
            <span>Unser Netzwerk lebt vom Miteinander.</span>
          </div>
          <div className="opPreviewTiles">
            <div>
              <span className="opPreviewIcon">↗</span>
              <b>Netzwerk-Mitglieder</b>
              <p>Entdecken, wer was kann.</p>
              <div className="opAvatars">
                <i>A</i>
                <i>B</i>
                <i>C</i>
              </div>
            </div>
            <div>
              <span className="opPreviewIcon">☷</span>
              <b>Das schwarze Brett</b>
              <p>Neue Impulse aus Ihrem Kreis.</p>
              <div className="opDemoLines">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="opPreviewEvent">
            <span>
              FR
              <br />
              <b>08</b>
            </span>
            <div>
              <b>Unser nächstes Netzwerkfrühstück</b>
              <small>Begegnen. Austauschen. Weiterdenken.</small>
            </div>
          </div>
        </div>
      </section>
      <section
        className="opAudience"
        aria-label="Für wen ist das Portal gedacht?"
      >
        <span>FÜR DIESE NETZWERKE IST DAS PORTAL GEEIGNET</span>
        <div>
          <b>Unternehmerkreise</b>
          <b>Regionale Initiativen</b>
          <b>Vereine & Verbände</b>
          <b>Business-Netzwerke</b>
          <b>Partnergemeinschaften</b>
        </div>
      </section>
      <section className="opSection opIntro" id="einblicke">
        <div>
          <span className="opKicker">DAS IST IHR NETZWERKPORTAL</span>
          <h2>
            Ein geschützter Online-Bereich
            <br />
            für Ihre Mitglieder.
          </h2>
        </div>
        <div>
          <p>
            Ihr Netzwerk trifft sich zum Frühstück, zum Stammtisch oder bei
            Veranstaltungen. Mit einem eigenen Portal können Ihre Mitglieder
            auch dazwischen Kontakte finden, Fragen stellen und
            zusammenarbeiten.
          </p>
          <p>
            Jeder sieht, welche Unternehmen dazugehören und was sie anbieten.
            Nachrichten, Neuigkeiten und Termine sind an einem Ort erreichbar.
            Den Zugang erhalten nur die Mitglieder Ihres Netzwerks.
          </p>
        </div>
      </section>
      <section className="opSection opFeatures">
        <header>
          <span className="opKicker">DIE VORTEILE FÜR IHRE MITGLIEDER</span>
          <h2>Was können Ihre Mitglieder damit machen?</h2>
          <p>
            Andere kennenlernen, passende Leistungen finden und direkt Kontakt
            aufnehmen.
          </p>
        </header>
        <div>
          {features.map(([n, title, text]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="opBrandSection">
        <div
          className="opBrandVisual"
          aria-label="Beispiel für individuelles Netzwerkbranding"
        >
          <div>
            <span className="opDemoLogo">N</span>
            <b>
              Ihr Name.
              <br />
              Ihr Auftritt.
            </b>
            <p>Ihr Netzwerkportal</p>
          </div>
          <div className="opSwatches">
            <i />
            <i />
            <i />
          </div>
          <small>Logo · Farben · Begrüßung · Zugang</small>
        </div>
        <div>
          <span className="opKicker">WHITE LABEL EINFACH ERKLÄRT</span>
          <h2>Ihr Name. Ihr Logo. Ihre Farben.</h2>
          <p>
            White Label heißt: Ihre Mitglieder nutzen ein Portal, das wie Ihr
            eigenes Netzwerk aussieht. Wir richten es mit Ihrem Netzwerknamen,
            Ihrem Logo und Ihren Farben ein. Auch die Begrüßung und der Zugang
            passen zu Ihrem Netzwerk.
          </p>
          <ul>
            <li>Individuelle Startseite mit Begrüßung und Titelbild</li>
            <li>Passender Login und Registrierungszugang für Ihr Netzwerk</li>
            <li>Eigener Mitgliederkreis, eigene Inhalte und Administratoren</li>
            <li>Keine fremden Netzwerkdaten im Mitgliederbereich</li>
          </ul>
          <p className="opNote">
            Sie kümmern sich um Ihr Netzwerk. Wir kümmern uns um die Technik.
          </p>
        </div>
      </section>
      <section className="opSection opHomepage">
        <div>
          <span className="opKicker">WHITE LABEL + IHRE NEUE HOMEPAGE</span>
          <h2>Auf Wunsch erstellen wir auch Ihre neue Homepage.</h2>
          <p>
            Sie möchten Ihr Netzwerk auch öffentlich gut präsentieren? Wir
            erstellen gerne gemeinsam mit Ihnen eine passende Homepage. Dort
            erklären Sie, für wen Ihr Netzwerk da ist, welche Vorteile es bietet
            und wie Interessierte Mitglied werden können.
          </p>
          <p>
            Die Homepage und das Portal passen optisch zusammen. Interessierte
            stellen über die Homepage ihre Teilnahmeanfrage. Bestehende
            Mitglieder melden sich dort direkt in Ihrem Portal an.
          </p>
          <a className="v2Button" href={contact}>
            Homepage und Portal gemeinsam planen ↗
          </a>
        </div>
        <div className="opHomepageFlow">
          <article>
            <span>ÖFFENTLICH</span>
            <h3>Ihre Homepage</h3>
            <p>
              Ihre Idee, Ihre Vorteile, Ihre Gemeinschaft. Ein überzeugender
              erster Eindruck für neue Interessenten.
            </p>
          </article>
          <div aria-hidden="true">↕</div>
          <article>
            <span>BEWUSST FREIGEGEBEN</span>
            <h3>Inhalte nur einmal pflegen</h3>
            <p>
              Freigegebene Mitgliederprofile, Veranstaltungen und Rückblicke
              können aus dem Portal auf der Homepage erscheinen – ohne alles
              doppelt zu pflegen.
            </p>
          </article>
          <div aria-hidden="true">↕</div>
          <article>
            <span>GESCHLOSSEN</span>
            <h3>Ihr Netzwerkportal</h3>
            <p>
              Mitglieder kennenlernen, Leistungen entdecken, direkt schreiben
              und die Gemeinschaft aktiv gestalten.
            </p>
          </article>
          <small>
            Die Homepage-Erstellung und Anbindung sind individuell vereinbarte
            Leistungen. Öffentlich erscheint ausschließlich, was dafür
            freigegeben wurde.
          </small>
        </div>
      </section>
      <section className="opSection opAI">
        <span className="opKicker">PAGEPILOT AI</span>
        <h2>Unternehmensseiten mit KI erstellen.</h2>
        <p>
          Ihr Mitglied gibt die Adresse seiner Unternehmenshomepage ein.
          PagePilot AI liest die verfügbaren Inhalte und bereitet daraus eine
          Unternehmensseite vor: mit Texten, Leistungen und passenden
          verfügbaren Bildern. Das Mitglied prüft den Vorschlag, ändert bei
          Bedarf etwas und veröffentlicht die Seite.
        </p>
        <div>
          <article>
            <b>01</b>
            <h3>Homepage angeben</h3>
            <p>
              Das Mitglied gibt die eigene öffentliche Unternehmenswebsite zur
              Analyse an.
            </p>
          </article>
          <article>
            <b>02</b>
            <h3>Entwurf erhalten</h3>
            <p>
              Passende Inhalte werden für Vorstellung, Leistungen und weitere
              Rubriken aufbereitet.
            </p>
          </article>
          <article>
            <b>03</b>
            <h3>Prüfen & veröffentlichen</h3>
            <p>
              Das Mitglied behält die Kontrolle über seine Angaben, Bilder und
              Veröffentlichung.
            </p>
          </article>
        </div>
      </section>
      <section className="opSection opManagement">
        <div>
          <span className="opKicker">DIE VERWALTUNG IHRES NETZWERKS</span>
          <h2>Mitglieder, Beiträge und Termine verwalten.</h2>
          <p>
            Die Netzwerkleitung soll Menschen verbinden – nicht an der Technik
            scheitern. Deshalb gehören Mitgliederverwaltung, Beiträge und
            Veranstaltungen in einen gemeinsamen Arbeitsbereich.
          </p>
          <a className="opTextLink" href={contact}>
            Ihre Anforderungen gemeinsam besprechen →
          </a>
        </div>
        <div>
          {[
            [
              "Aufnahme steuern",
              "Anfragen prüfen, Mitglieder einladen und berechtigte Netzwerkadministratoren benennen.",
            ],
            [
              "Inhalte organisieren",
              "Neuigkeiten veröffentlichen, Veranstaltungen planen und Rückblicke mit Bildern bereitstellen.",
            ],
            [
              "Abrechnung passend vereinbaren",
              "Zentrale Übernahme durch das Netzwerk oder individuelle Mitgliedsbeiträge – passend zu Ihrem Modell.",
            ],
            [
              "Öffentlich und intern trennen",
              "Eine optionale Homepage-Anbindung zeigt nur freigegebene Inhalte. Das geschlossene Netzwerk bleibt geschützt.",
            ],
          ].map(([title, text]) => (
            <article key={title}>
              <span aria-hidden="true">✓</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="opControl">
        <div>
          <span className="opKicker">IHRE AUFGABEN ALS INITIATOR</span>
          <h2>Was können Sie selbst steuern?</h2>
          <p>
            Als Netzwerkinitiator entscheiden Sie, wer aufgenommen wird. Sie
            verwalten den Auftritt Ihres Netzwerks, veröffentlichen
            Informationen und organisieren Veranstaltungen. Dafür erhalten Sie
            einen eigenen Verwaltungsbereich.
          </p>
        </div>
        <div>
          <article>
            <h3>Wer gehört dazu?</h3>
            <p>
              Sie prüfen Anfragen und steuern die Aufnahme. Benannte
              Administratoren unterstützen Sie bei den dafür freigeschalteten
              Verwaltungsaufgaben.
            </p>
          </article>
          <article>
            <h3>Was passiert im Netzwerk?</h3>
            <p>
              Sie gestalten den Auftritt, veröffentlichen und verwalten
              Beiträge, organisieren Veranstaltungen und behalten Zusagen im
              Blick.
            </p>
          </article>
          <article>
            <h3>Was wird öffentlich?</h3>
            <p>
              Bei einer individuellen Homepage-Anbindung entscheiden die
              vorgesehenen Freigaben über die Veröffentlichung. Persönliche
              Profilfreigaben bleiben beim jeweiligen Mitglied.
            </p>
          </article>
          <p className="opControlNote">
            Klare Grenzen gehören dazu: Private Mitglieder-Chats bleiben den
            Gesprächsteilnehmern vorbehalten. Übergreifende Plattformrollen,
            technische Einstellungen und Vertragskonditionen werden durch den
            Plattformbetreiber verwaltet beziehungsweise mit ihm abgestimmt.
          </p>
        </div>
      </section>
      <section className="opSection opCatalogue">
        <header>
          <span className="opKicker">DIE FUNKTIONEN IM ÜBERBLICK</span>
          <h2>Alle Funktionen im Überblick.</h2>
          <p>
            Diese Funktionen verbinden Ihre Mitglieder im Alltag. Individuelle
            Erweiterungen und die gewünschte Homepage-Anbindung besprechen wir
            passend zu Ihrem Netzwerk.
          </p>
        </header>
        <div>
          {catalogue.map(([title, items]) => (
            <article key={title}>
              <h3>{title}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <aside>
          <b>Wer bezahlt das Portal?</b>
          <p>
            Ihr Netzwerk kann die Kosten zentral übernehmen. Alternativ zahlen
            die Mitglieder ihren Zugang selbst. Preise, Laufzeiten und mögliche
            Startangebote besprechen wir mit Ihnen. Sportergebnisse und
            Spielpläne werden nur für Netzwerke eingerichtet, die sie benötigen.
          </p>
        </aside>
      </section>
      <section className="opSection opLaunch">
        <header>
          <span className="opKicker">VON DER IDEE ZUM EIGENEN PORTAL</span>
          <h2>So bekommen Sie Ihr eigenes Portal.</h2>
        </header>
        <div>
          {[
            [
              "Ihr Netzwerk verstehen",
              "Wir besprechen Zielgruppe, Mitgliederzahl, Abläufe und die Ziele, die Sie mit Ihrem Portal verfolgen.",
            ],
            [
              "Ihren Auftritt einrichten",
              "Name, Logo, Farben, Zugang, Inhalte und Zahlungskonzept werden passend zu Ihrem Netzwerk eingerichtet.",
            ],
            [
              "Mitglieder zusammenbringen",
              "Sie laden Ihren Kreis ein, begleiten den Start und füllen das Portal mit Begegnungen, Beiträgen und Kontakten.",
            ],
          ].map(([title, text], i) => (
            <article key={title}>
              <b>0{i + 1}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="opSection opFAQ">
        <header>
          <span className="opKicker">GUT ZU WISSEN</span>
          <h2>Häufige Fragen.</h2>
        </header>
        <div>
          {questions.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="opContact" id="anfrage">
        <span className="opKicker">IHR NETZWERK KANN MEHR</span>
        <h2>Möchten Sie ein Portal für Ihr Netzwerk?</h2>
        <p>
          Erzählen Sie uns von Ihrem Netzwerk. Wir zeigen Ihnen, wie ein eigenes
          Portal zu Ihrer Gemeinschaft, Ihrer Arbeitsweise und Ihrem
          Beitragsmodell passen kann.
        </p>
        <div className="opActions">
          <a className="v2Button" href={contact}>
            Eigenes Portal unverbindlich anfragen ↗
          </a>
          <Link className="opTextLink" href="/anmelden">
            Bereits Mitglied? Zum Login →
          </Link>
        </div>
        <small>
          Ein Service der Media Online Innovations Group · Persönliche
          Abstimmung statt anonymer Standardlösung.
        </small>
      </section>
      <SiteFooter formal showPitch={false} />
    </main>
  );
}
