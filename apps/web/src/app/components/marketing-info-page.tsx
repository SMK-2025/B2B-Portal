"use client";
import Link from "next/link";
import {
  CityDirectory,
  MarketingBenefits,
  MarketingHeader,
  PortalExplorer,
} from "./city-marketing";
import { MarketingFooter } from "./marketing-footer";
import { CityContributionPresentation } from "./city-contribution-presentation";
import {
  MARKETING_FAQS,
  MARKETING_PAGES,
  marketingHref,
  type MarketingPageKey,
} from "../lib/marketing-pages";
import { targetAudiences } from "./public-site-data";
import "./city-marketing.css";

const contact =
  "mailto:service@b2b-matching.de?subject=Eigenes%20Netzwerkportal%20anfragen";
function PageLink({
  prefix,
  page,
  children,
}: {
  prefix: string;
  page: MarketingPageKey;
  children: React.ReactNode;
}) {
  return (
    <Link href={marketingHref(prefix, page) as never} className="cm-button">
      {children}
    </Link>
  );
}
function Scenarios() {
  return (
    <section className="cm-section">
      <p className="cm-eyebrow">So hilft es im Geschäftsalltag</p>
      <h2>
        Ein konkreter Bedarf.
        <br />
        <em>Ein guter Anlass für ein Gespräch.</em>
      </h2>
      <div className="cm-editorial-grid">
        {[
          [
            "Sie brauchen Unterstützung für ein Projekt.",
            "Statt bis zum nächsten Treffen zu warten, suchen Sie im Mitgliederverzeichnis nach der passenden Leistung. Auf der Unternehmensseite finden Sie den Ansprechpartner und können das Vorhaben im Chat besprechen.",
          ],
          [
            "Andere sollen wissen, was Sie anbieten.",
            "Ihre Unternehmensseite erklärt Ihre Leistungen. Ein konkretes Angebot oder ein Gesuch macht zusätzlich sichtbar, wann sich ein Austausch mit Ihnen lohnt.",
          ],
          [
            "Sie möchten nach einem Treffen in Kontakt bleiben.",
            "Schreiben Sie im Mitglieder-Chat weiter und teilen Sie Neuigkeiten im Netzwerk. Der persönliche Kontakt bleibt nicht auf den Abend einer Veranstaltung beschränkt.",
          ],
        ].map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <p className="cm-secondary">
        Beispielhafte Anwendungen, keine Kundenberichte oder Erfolgsversprechen.
      </p>
    </section>
  );
}
function Audience({ prefix }: { prefix: string }) {
  return (
    <>
      <section className="cm-section cm-two-paths">
        <article>
          <p className="cm-eyebrow">Sie möchten sich vernetzen</p>
          <h2>
            Ihr Unternehmen.
            <br />
            <em>Im richtigen Umfeld.</em>
          </h2>
          <p>
            Für Unternehmerinnen und Unternehmer, Selbstständige und
            Verantwortliche, die Leistungen anbieten, Unterstützung suchen und
            Geschäftskontakte vor Ort aufbauen möchten.
          </p>
          <ul>
            <li>Unternehmen und Ansprechpartner kennenlernen</li>
            <li>Eigene Leistungen, Angebote und Gesuche zeigen</li>
            <li>Persönlich miteinander ins Gespräch kommen</li>
          </ul>
          <PageLink prefix={prefix} page="netzwerke">
            Stadtnetzwerk auswählen
          </PageLink>
        </article>
        <article>
          <p className="cm-eyebrow">Sie bringen Menschen zusammen</p>
          <h2>
            Ihre Gemeinschaft.
            <br />
            <em>Mit eigenem Portal.</em>
          </h2>
          <p>
            Für Initiatoren, die ihr bestehendes Netzwerk digital verbinden
            möchten: unter der eigenen Marke, mit einem getrennten
            Mitgliederbereich und selbst gewählten Funktionen.
          </p>
          <ul>
            <li>Mitglieder und Rollen im eigenen Netzwerk verwalten</li>
            <li>Informationen und Austausch an einem Ort bündeln</li>
            <li>Mit der eigenen Marke sichtbar bleiben</li>
          </ul>
          <PageLink prefix={prefix} page="eigenes-portal">
            Eigenes Portal kennenlernen
          </PageLink>
        </article>
      </section>
      <section className="cm-section cm-soft">
        <p className="cm-eyebrow">
          Unterschiedliche Netzwerke. Gemeinsamer Austausch.
        </p>
        <h2>
          Für die Gemeinschaft,
          <br />
          <em>die Sie bewegen.</em>
        </h2>
        <div className="cm-editorial-grid">
          {targetAudiences.map((a) => (
            <article key={a.href} id={a.href.split("/").pop()}>
              <h3>{a.label}</h3>
              <p>{a.short}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function Steps({ prefix }: { prefix: string }) {
  return (
    <>
      <section className="cm-section">
        <p className="cm-eyebrow">Mitglied in einem Stadtnetzwerk werden</p>
        <h2>Ihr Unternehmen ins Netzwerk bringen.</h2>
        <ol className="cm-process">
          {[
            [
              "Stadt auswählen",
              "Auf Ihrer Stadtseite erfahren Sie, wofür das Netzwerk gedacht ist und welche Konditionen aktuell gelten.",
            ],
            [
              "Mitgliedschaft anfragen",
              "Geben Sie Ihre Unternehmens- und Kontaktdaten an. Bestätigen Sie Ihre E-Mail-Adresse und warten Sie auf die Prüfung Ihrer Anfrage.",
            ],
            [
              "Konditionen bestätigen",
              "Nach der Freigabe prüfen Sie den Beitrag, die Laufzeit und den Gesamtbetrag und bestätigen die Buchung mit Ihren Rechnungsdaten.",
            ],
            [
              "Unternehmen vorstellen und loslegen",
              "Richten Sie Ihre Unternehmensseite ein, prüfen Sie den Entwurf und veröffentlichen Sie ihn. Danach entdecken Sie Unternehmen und nehmen Kontakt auf.",
            ],
          ].map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <PageLink prefix={prefix} page="netzwerke">
          Meine Stadt finden
        </PageLink>
      </section>
      <section className="cm-section cm-soft">
        <p className="cm-eyebrow">Ein eigenes Netzwerkportal betreiben</p>
        <h2>
          Von Ihrer Idee
          <br />
          <em>zum digitalen Treffpunkt.</em>
        </h2>
        <ol className="cm-process">
          {[
            [
              "Gemeinsam den Bedarf klären",
              "Wer gehört zu Ihrem Netzwerk? Welche Inhalte und Funktionen werden gebraucht? Wir besprechen die passende Umsetzung.",
            ],
            [
              "Portal und Marke einrichten",
              "Ihr Netzwerk erhält einen eigenen Bereich mit Namen, Logo und Farben. Auf Wunsch entwickeln wir eine passende Homepage dazu.",
            ],
            [
              "Verantwortlichkeiten und Funktionen festlegen",
              "Sie bestimmen die Netzwerkleitung und wählen, welche Bereiche für Ihre Mitglieder genutzt werden.",
            ],
            [
              "Mitglieder einladen und begleiten",
              "Laden Sie Ihre Mitglieder ein, stellen Sie erste Inhalte bereit und bringen Sie den Austausch in Gang. Wir betreiben die technische Plattform.",
            ],
          ].map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <PageLink prefix={prefix} page="eigenes-portal">
          Mein eigenes Portal planen
        </PageLink>
      </section>
    </>
  );
}
function OwnPortal({ prefix }: { prefix: string }) {
  return (
    <>
      <section className="cm-section cm-section-heading">
        <div>
          <p className="cm-eyebrow">
            Sie gestalten das Netzwerk. Wir betreiben die Technik.
          </p>
          <h2>
            Die Kontrolle
            <br />
            <em>bleibt bei Ihnen.</em>
          </h2>
        </div>
        <div>
          <p>
            Als Netzwerkinitiator entscheiden Sie, wer dazugehört, wer verwaltet
            und welche Funktionen gebraucht werden. Ihre Mitglieder sehen einen
            klaren, passenden Bereich statt einer Sammlung ungenutzter
            Menüpunkte.
          </p>
          <p>
            Die Mitglieder und Inhalte Ihres Netzwerks werden nicht mit anderen
            Netzwerken vermischt. Private Chats bleiben bei den
            Gesprächspartnern; eine Verwaltungsrolle bedeutet nicht, dass man
            automatisch mitliest.
          </p>
        </div>
      </section>
      <section className="cm-section cm-soft">
        <div className="cm-editorial-grid">
          {[
            [
              "White Label: Ihre Marke steht vorn.",
              "Name, Logo, Farben und Ansprache bilden Ihren eigenen Auftritt. Die öffentliche Homepage und der geschlossene Mitgliederbereich können gestalterisch aufeinander abgestimmt werden.",
            ],
            [
              "Die Funktionen wählen Sie.",
              "B2B Matching stellt die Funktionen bereit. Sie aktivieren die Bereiche, die Ihr Netzwerk nutzt – beispielsweise Veranstaltungen, schwarzes Brett, Netzwerk-Puls oder Sportergebnisse.",
            ],
            [
              "Mitglieder und Rollen klar verwalten.",
              "Legen Sie fest, wer Zugang erhält und wer Verwaltungsaufgaben übernimmt. Eine Unternehmensseite und eine Verwaltungsrolle sind unterschiedliche Aufgaben und müssen sich nicht ausschließen.",
            ],
            [
              "Eine Homepage, die zu Ihrem Netzwerk passt.",
              "Auf Wunsch erstellen wir gemeinsam auch eine neue Homepage: Sie stellt Ihr Netzwerk öffentlich vor und führt Interessierte in den passenden Anmeldeprozess.",
            ],
            [
              "Persönliche Begegnungen digital ergänzen.",
              "Mitglieder finden Ansprechpartner, teilen Angebote und bleiben im Gespräch. Veranstaltungen und Rückblicke ergänzen den Austausch dort, wo Ihr Netzwerk sie nutzen möchte.",
            ],
            [
              "Neue Funktionen verfügbar machen.",
              "Die Plattform kann um zusätzliche Funktionen erweitert werden. Sie entscheiden, welche der bereitgestellten Bereiche in Ihrem Netzwerk verwendet werden.",
            ],
          ].map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="cm-section cm-two-paths">
        <article>
          <h2>Was wir gemeinsam klären.</h2>
          <ul>
            <li>Zielgruppe und Größe Ihres Netzwerks</li>
            <li>Gewünschte Funktionen und Verantwortlichkeiten</li>
            <li>Branding und öffentliche Homepage</li>
            <li>
              Einführung, Mitgliedschaftsmodell und individuelle Konditionen
            </li>
          </ul>
          <p>
            Ein eigenes Netzwerkportal ist ein separates Angebot. Der Beitrag
            einer Stadtmitgliedschaft ist kein Preis für den Betrieb eines
            eigenen Portals.
          </p>
          <a className="cm-button" href={contact}>
            Eigenes Portal unverbindlich anfragen
          </a>
        </article>
        <article>
          <h2>Erst die Möglichkeiten ansehen?</h2>
          <p>
            Verschaffen Sie sich einen Überblick über Unternehmensseiten,
            Mitglieder-Chat, Veranstaltungen und die weiteren Funktionen der
            Plattform.
          </p>
          <PageLink prefix={prefix} page="funktionen">
            Alle Funktionen kennenlernen
          </PageLink>
        </article>
      </section>
    </>
  );
}
function Security() {
  return (
    <section className="cm-section">
      <div className="cm-editorial-grid">
        {[
          [
            "Ein Netzwerk bleibt ein Netzwerk.",
            "Mitgliedschaften, Unternehmensseiten und Inhalte gehören zum jeweiligen Netzwerk. Ein Zugang zu einem Portal bedeutet nicht automatisch Zugriff auf andere Netzwerke.",
          ],
          [
            "Verwaltung und Mitgliedschaft haben klare Rollen.",
            "Die Netzwerkleitung verwaltet ihren Bereich. Mitglieder nutzen die für sie freigeschalteten Funktionen. Änderungen und der Zugriff auf Daten werden durch die jeweiligen Berechtigungen begrenzt.",
          ],
          [
            "Persönliche Gespräche bleiben persönlich.",
            "Private Chat-Inhalte sind für die Gesprächsteilnehmer bestimmt. Eine Darstellung von Kooperationen im Netzwerk ist von den Chat-Inhalten getrennt.",
          ],
          [
            "Sie prüfen Ihre Unternehmensseite.",
            "Ein automatisch vorbereiteter Seitenentwurf wird nicht ungeprüft als Ihr veröffentlichter Auftritt übernommen. Sie prüfen, ergänzen und veröffentlichen Ihre Unternehmensseite selbst.",
          ],
          [
            "Zugang mit persönlichem Konto.",
            "Anmeldung und Bestätigung erfolgen über den persönlichen Zugang. Passwort- und E-Mail-Prüfungen bleiben Teil des bestehenden Anmeldeverfahrens.",
          ],
          [
            "Datenschutz verständlich nachlesen.",
            "Die verbindlichen Datenschutzhinweise, Informationen zu Cookies und rechtlichen Bedingungen finden Sie jederzeit im Footer. Ihre Cookie-Auswahl können Sie dort wieder öffnen.",
          ],
        ].map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function MarketingInfoPage({
  page,
  preview = true,
}: {
  page: MarketingPageKey;
  preview?: boolean;
}) {
  const prefix = preview ? "/entwurf-manus" : "",
    data = MARKETING_PAGES[page];
  return (
    <div className="cityMarketing">
      <a className="cm-skip" href="#cm-main">
        Zum Inhalt springen
      </a>
      {preview && (
        <div className="cm-preview">
          Designvorschau · nicht veröffentlicht. Login und Registrierung nutzen
          das bestehende System.
        </div>
      )}
      <MarketingHeader prefix={prefix} currentPage={page} />
      <main id="cm-main">
        <section className="cm-info-hero">
          <nav className="cm-breadcrumb" aria-label="Brotkrumennavigation">
            <Link href={(prefix || "/") as never}>Startseite</Link>
            <span>/ {data.label}</span>
          </nav>
          <p className="cm-eyebrow">{data.eyebrow}</p>
          <h1>{data.title}</h1>
          <p className="cm-info-lead">{data.description}</p>
          <div className="cm-actions">
            {page === "eigenes-portal" ? (
              <a className="cm-button" href={contact}>
                Eigenes Portal anfragen
              </a>
            ) : (
              <PageLink
                prefix={prefix}
                page={page === "netzwerke" ? "so-funktionierts" : "netzwerke"}
              >
                {page === "netzwerke"
                  ? "So werden Sie Mitglied"
                  : "Mein Stadtnetzwerk finden"}
              </PageLink>
            )}
            {page !== "eigenes-portal" && (
              <Link
                className="cm-button cm-button-ghost"
                href={marketingHref(prefix, "eigenes-portal") as never}
              >
                Eigenes Portal
              </Link>
            )}
          </div>
        </section>
        {page === "vorteile" && (
          <>
            <MarketingBenefits />
            <Scenarios />
            <CityContributionPresentation prefix={prefix} preview={preview} />
          </>
        )}
        {page === "fuer-wen" && <Audience prefix={prefix} />}
        {page === "netzwerke" && (
          <>
            <CityDirectory prefix={prefix} />
            <section className="cm-section cm-section-heading">
              <h2>
                Eine Stadtmitgliedschaft.
                <br />
                <em>Ein eigenes Netzwerk.</em>
              </h2>
              <div>
                <p>
                  Wählen Sie Ihr Netzwerk nach dem Standort Ihres Unternehmens.
                  Auf der Stadtseite finden Sie den passenden Registrierungs-
                  und Loginweg sowie die aktuellen Teilnahmebedingungen.
                </p>
                <p>
                  Die Netzwerke entwickeln sich mit ihren Mitgliedern. 50
                  Stadtseiten bedeuten nicht, dass überall gleich viele
                  Unternehmen oder Veranstaltungen verfügbar sind.
                </p>
                <PageLink prefix={prefix} page="fragen">
                  Fragen zur Mitgliedschaft
                </PageLink>
              </div>
            </section>
          </>
        )}
        {page === "funktionen" && (
          <>
            <PortalExplorer />
            <section className="cm-section">
              <p className="cm-eyebrow">
                Weitere Möglichkeiten für Ihr eigenes Portal
              </p>
              <h2>
                So viel wie nötig.
                <br />
                <em>So passend wie möglich.</em>
              </h2>
              <div className="cm-editorial-grid">
                {[
                  [
                    "Kooperationen sichtbar machen",
                    "Gesprächspartner können die dafür vorgesehenen Status- und Kooperationsangaben teilen. Private Chat-Inhalte werden dadurch nicht öffentlich.",
                  ],
                  [
                    "Netzwerk-Puls und Umsatzdarstellung",
                    "Freigegebene Aktivitäten und freiwillig veröffentlichte Kooperationsumsätze können den Austausch sichtbar machen. Die Netzwerkleitung entscheidet, ob diese Bereiche genutzt werden.",
                  ],
                  [
                    "Veranstaltungen und Rückblicke",
                    "Termine, Anmeldungen und Rückblicke ergänzen den digitalen Austausch. Ein Kalender ersetzt dabei nicht die tatsächliche Planung durch das Netzwerk.",
                  ],
                  [
                    "Dokumente und Aufgaben",
                    "Für Organisationsportale können bereitgestellte Unterlagen und Aufgaben den gemeinsamen Arbeitsalltag unterstützen.",
                  ],
                  [
                    "Sport im Partnernetzwerk",
                    "Sportbezogene Portale können Spieltage und Tabellen als zusätzlichen Anlass für Austausch nutzen. Dieser Bereich ist kein Pflichtbestandteil jedes Netzwerks.",
                  ],
                  [
                    "Modulare Verwaltung",
                    "Die Plattform stellt Funktionen bereit. Die Netzwerkleitung wählt, welche davon im eigenen Mitgliederbereich aktiv sind.",
                  ],
                ].map(([title, text]) => (
                  <article key={title}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        {page === "so-funktionierts" && <Steps prefix={prefix} />}
        {page === "fragen" && (
          <section className="cm-section cm-faq-page">
            {["Mitgliedschaft", "Kosten", "Im Portal", "Eigenes Portal"].map(
              (group) => (
                <section key={group}>
                  <h2>{group}</h2>
                  {MARKETING_FAQS.filter((f) => f.group === group).map((f) => (
                    <details key={f.question}>
                      <summary>{f.question}</summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </section>
              ),
            )}
          </section>
        )}
        {page === "eigenes-portal" && <OwnPortal prefix={prefix} />}
        {page === "sicherheit" && <Security />}
        <section className="cm-final">
          <p className="cm-eyebrow">Ihr nächster Schritt</p>
          <h2>
            {page === "eigenes-portal"
              ? "Bringen wir Ihr Netzwerk zusammen."
              : "Finden Sie Ihren Platz im Netzwerk."}
          </h2>
          <p>
            {page === "eigenes-portal"
              ? "Erzählen Sie uns von Ihrer Gemeinschaft. Gemeinsam planen wir den passenden digitalen Auftritt."
              : "Wählen Sie Ihre Stadt oder lernen Sie das eigene Portal für Ihre Organisation kennen."}
          </p>
          <div className="cm-actions">
            {page === "eigenes-portal" ? (
              <a className="cm-button" href={contact}>
                Unverbindlich Kontakt aufnehmen
              </a>
            ) : (
              <PageLink prefix={prefix} page="netzwerke">
                Stadtnetzwerke entdecken
              </PageLink>
            )}
          </div>
        </section>
      </main>
      <MarketingFooter prefix={prefix} />
    </div>
  );
}
