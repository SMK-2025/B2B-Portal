import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
import "./leverkusen.css";

const title = "B2B-Netzwerk für Unternehmen in Leverkusen";
const description = "Das unabhängige Online-Netzwerk für Firmen mit Sitz in Leverkusen. Lokale Geschäftspartner finden, Gesuche teilen und direkt miteinander sprechen.";
export const metadata: Metadata = {
  title, description, alternates: { canonical: "/Leverkusen" },
  openGraph: { title, description, url: "/Leverkusen", images: ["/images/leverkusen-skyline.webp"] },
};
const request = "/registrieren?network=unternehmernetzwerk-leverkusen";
const login = request + "&mode=login";
export default function Leverkusen() {
  return <div className="v2"><SiteHeader/><main className="levLanding">
    <section className="levHero"><div className="levHeroText">
      <span className="levLabel">B2B Matching · Leverkusen</span>
      <h1>Der richtige Kontakt ist vielleicht schon in Leverkusen.</h1>
      <p>Das unabhängige Online-Netzwerk für Unternehmen mit Sitz in Leverkusen. Entdecke, was andere Betriebe vor Ort anbieten, und sprich die Menschen dahinter direkt an.</p>
      <div className="levActions"><a className="levButton" href={request}>Teilnahme anfragen →</a><a className="levLogin" href={login}>Mitglieder-Login</a></div>
      <small>Dein Zugang wird nach Prüfung freigeschaltet.</small>
    </div><div className="levPhoto" role="presentation"/></section>
    <section className="levExample" aria-labelledby="lev-case"><div><span className="levLabel">So funktioniert es · Ein Beispiel</span>
      <h2 id="lev-case">Ein Kundentag in Opladen.<br/>Wer kann mit anpacken?</h2>
      <p>Du organisierst einen Kundentag und suchst Catering und Veranstaltungstechnik. Statt zwei Adresslisten abzutelefonieren, beschreibst du im Netzwerk, was du brauchst.</p>
    </div><ol><li><strong>Gesuch einstellen</strong><p>Nenne Ort, Termin und Bedarf. Dein Gesuch richtet sich an die Unternehmen im geschlossenen Netzwerk.</p></li>
      <li><strong>Den Betrieb kennenlernen</strong><p>Auf der Unternehmensseite siehst du Leistungen und Ansprechpartner und kannst einschätzen, wer zu deinem Vorhaben passt.</p></li>
      <li><strong>Direkt ins Gespräch kommen</strong><p>Im PartnerChat klärt ihr Details untereinander – ohne auf das nächste Netzwerktreffen zu warten.</p></li></ol></section>
    <section className="levJoin"><div><span className="levLabel">Dabei sein</span><h2>Hat dein Unternehmen seinen Sitz in Leverkusen?</h2>
      <p>Ob Handwerk, Handel, Industrie oder Dienstleistung: Entscheidend ist der Firmensitz, nicht die Branche. Die Teilnahme ist kostenpflichtig. Die Konditionen erhältst du vor der Buchung; mit deiner Anfrage gehst du keine Verpflichtung ein.</p>
      <small>Ein eigenständiges Angebot der Media Online Innovations Group. Kein Angebot der Stadtverwaltung und keine Vereinsmitgliedschaft.</small></div>
      <a className="levButton" href={request}>Teilnahme anfragen <span aria-hidden="true">→</span></a></section>
  </main><SiteFooter/></div>;
}
