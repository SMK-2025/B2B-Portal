import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
import "./leverkusen.css";

const title = "Unternehmernetzwerk Leverkusen – Geschäftspartner vor Ort finden";
const description = "Das unabhängige B2B-Netzwerk für Unternehmen mit Sitz in Leverkusen: lokale Anbieter entdecken, Aufträge anbahnen und direkt mit den richtigen Menschen sprechen.";
export const metadata: Metadata = {
  title, description, alternates: { canonical: "/Leverkusen" },
  openGraph: { title, description, url: "/Leverkusen", images: ["/images/leverkusen-skyline.webp"] },
};
const request = "/registrieren?network=unternehmernetzwerk-leverkusen";
const login = request + "&mode=login";

const benefits = [
  ["Gefunden werden", "Zeig, was dein Betrieb besonders gut kann.", "Deine Partnerseite bündelt Leistungen, Angebote und den direkten Kontakt. Wer im Verzeichnis nach deiner Kompetenz sucht, sieht mehr als nur einen Firmennamen."],
  ["Bedarf teilen", "Sag, was dir für den nächsten Auftrag fehlt.", "Mit einem Gesuch beschreibst du, welche Unterstützung du brauchst. Mit einem Angebot machst du umgekehrt sichtbar, was du für andere Betriebe übernehmen kannst."],
  ["Direkt sprechen", "Vom passenden Profil zum ersten Gespräch.", "Schreib die Ansprechperson im PartnerChat direkt an, teile ein Bild oder kläre eine Rückfrage. Mit einer Vernetzungsanfrage signalisierst du Interesse, auch wenn noch kein Auftrag ansteht."],
  ["Persönlich treffen", "Mach aus dem Online-Kontakt ein Treffen vor Ort.", "Im Veranstaltungskalender siehst du, was im Netzwerk ansteht, und kannst deine Teilnahme zusagen. Nach dem Treffen hältst du über das Portal Kontakt."],
  ["Auf dem Laufenden bleiben", "Erfahre, was sich im Netzwerk tut.", "Auf dem Schwarzen Brett findest du Neuigkeiten aus dem Partnerkreis. Wo eine Diskussion geöffnet ist, kannst du deine Erfahrung einbringen oder eine Frage stellen."],
  ["Kontakte mitnehmen", "Speichere den Kontakt, solange das Gespräch frisch ist.", "Die digitale Visitenkarte auf der Partnerseite bringt die freigegebenen Kontaktdaten per QR-Code oder Download ins Adressbuch. Beim nächsten Anruf weißt du, wen du vor dir hast."],
];
export default function Leverkusen() {
  return <div className="v2"><SiteHeader/><main className="levLanding">
    <header className="levHero"><div className="levWrap"><span className="levLabel">Unternehmernetzwerk Leverkusen</span>
      <h1>Dein nächster Geschäftspartner sitzt vielleicht in Opladen.</h1>
      <p>Oder in Schlebusch. Oder zwei Straßen weiter. Hier findest du heraus, welche Unternehmen in Leverkusen das können, was du gerade brauchst – und erreichst die Menschen dahinter direkt.</p>
      <div className="levActions"><a className="levButton" href={request}>Teilnahme anfragen →</a><a href={login}>Zum Mitglieder-Login</a></div>
    </div></header>
    <nav className="levGuide" aria-label="Auf dieser Seite"><div className="levWrap"><a href="#vorteile">Dein Nutzen</a><a href="#praxis">Beispiele aus dem Alltag</a><a href="#teilnahme">So wirst du Mitglied</a><a href="#fragen">Häufige Fragen</a></div></nav>
    <section className="levWrap levSection" id="vorteile"><span className="levLabel">Für Betriebe mit Sitz in Leverkusen</span>
      <h2>Was bringt dir das Netzwerk im Geschäftsalltag?</h2>
      <p className="levLead">Vielleicht kennt man dein Ladenlokal, aber nicht dein Angebot für Firmen. Vielleicht suchst du einen Fachbetrieb und weißt nicht, dass es ihn im Nachbarstadtteil gibt. Genau diese Lücke schließt das Netzwerk.</p>
      <div className="levBenefits">{benefits.map(([tag, heading, copy],i)=><article key={tag}><span className="levTag"><b>0{i+1}</b>{tag}</span><h3>{heading}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="levPractice" id="praxis"><div className="levWrap levSection"><span className="levLabel">Drei Beispiele · So könnte es laufen</span><h2>Eine Stadt. Ganz unterschiedliche Anlässe.</h2>
      <div className="levCases"><article><span>Opladen / Handel</span><h3>Ein Kundenabend ist geplant. Wer liefert das Catering?</h3><p>Du stellst Termin, Gästezahl und Budget als Gesuch ein. Interessierte Anbieter können sich melden; die Details klärt ihr direkt miteinander.</p></article>
      <article><span>Schlebusch / Handwerk</span><h3>Der Auftrag steht. Ein Gewerk fehlt noch.</h3><p>Für einen Umbau brauchst du einen Elektrofachbetrieb. Im Verzeichnis prüfst du Leistungen und Ansprechpartner und fragst gezielt nach Kapazitäten.</p></article>
      <article><span>Wiesdorf / Dienstleistung</span><h3>Guter Kontakt beim Treffen. Und wie weiter?</h3><p>Du findest die Person über ihr Unternehmen wieder, speicherst ihre Visitenkarte und schickst im Chat die Unterlagen, über die ihr gesprochen habt.</p></article></div>
    </div></section>
    <section className="levWrap levSection levJoin" id="teilnahme"><div><span className="levLabel">Dein Einstieg</span><h2>Mitmachen als Leverkusener Unternehmen.</h2><p>Ob Einpersonenbetrieb, Handwerksunternehmen, Händler oder Industriepartner: Die Branche spielt keine Rolle. Entscheidend ist dein Unternehmenssitz in Leverkusen.</p><a className="levButton" href={request}>Teilnahme anfragen →</a></div>
      <ol><li><strong>Unternehmen angeben</strong><p>Stell die Anfrage mit deinen Unternehmens- und Kontaktdaten. Die Kosten und die Laufzeit siehst du vor dem Absenden.</p></li><li><strong>E-Mail bestätigen, Prüfung abwarten</strong><p>Wir prüfen den Bezug zu Leverkusen. Bis zur Freigabe bleiben Mitgliederprofile und Netzwerkfunktionen geschützt.</p></li><li><strong>Buchung abschließen und Profil einrichten</strong><p>Zeig, was du anbietest und wen du suchst. Anschließend kannst du passende Unternehmen entdecken und direkt anschreiben.</p></li></ol>
    </section>
    <section className="levFaq" id="fragen"><div className="levWrap levSection"><span className="levLabel">Gut zu wissen</span><h2>Vor deiner Teilnahme.</h2>
      {[["Ist das ein Angebot der Stadt oder eines Vereins?", "Nein. Die Media Online Innovations Group betreibt das Unternehmernetzwerk unabhängig. Leverkusen ist der gemeinsame Standort der Unternehmen. Für die Teilnahme ist keine Vereinsmitgliedschaft nötig."],["Wer sieht mein Profil und meine Gespräche?", "Das Verzeichnis ist für freigegebene Mitglieder dieses Netzwerks bestimmt. Eine Nachricht im PartnerChat geht an deinen Gesprächspartner; ein Beitrag am Schwarzen Brett richtet sich dagegen an den Netzwerk-Kreis."],["Was kostet die Teilnahme?", "Die Mitgliedschaft ist kostenpflichtig. Im Anmeldeprozess findest du den für dieses Netzwerk geltenden Monatspreis, die Laufzeit und den Gesamtbetrag. Die Anfrage allein löst noch keine Rechnung aus."],["Muss ich regelmäßig zu Treffen kommen?", "Nein. Du kannst Leistungen entdecken, Angebote teilen und Kontakte pflegen, ohne auf den nächsten Veranstaltungstermin zu warten. Ob du an einem Treffen teilnimmst, entscheidest du selbst."]].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      <div className="levActions"><a className="levButton" href={request}>Teilnahme anfragen →</a><a href={login}>Schon Mitglied? Hier anmelden</a></div>
    </div></section>
  </main><SiteFooter/></div>;
}
