import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

export const metadata: Metadata = {
  title: "Digitales Netzwerkportal für Unternehmensnetzwerke",
  description: "Der geschlossene, individuell verwaltete Mitgliederbereich für Unternehmernetzwerke: Mitglieder, Veranstaltungen, Kommunikation, Themen, Aufgaben und B2B-Matching zentral organisieren.",
};

const functions = [
  ["Mitglieder & Rollen", "Mitgliedsunternehmen persönlich einladen, Aufnahmen steuern und Rollen sowie Zugriffsrechte zentral verwalten."],
  ["Veranstaltungen", "Netzwerktreffen, Regeltermine und Veranstaltungen planen, Anmeldungen bündeln und Teilnehmerstände einsehen."],
  ["Geschlossene Kommunikation", "Mitteilungen, Diskussionen und wichtige Informationen ausschließlich im eigenen Mitgliederkreis teilen."],
  ["Themen & Austausch", "Relevante Netzwerkthemen strukturieren, Interessen sichtbar machen und den fachlichen Austausch fördern."],
  ["Aufgaben & Organisation", "Verantwortlichkeiten, offene Punkte und nächste Schritte transparent dokumentieren und nachhalten."],
  ["Dokumente & Wissen", "Unterlagen, Protokolle und wichtige Netzwerkdokumente geordnet für berechtigte Mitglieder bereitstellen."],
  ["Direkter Partneraustausch", "Mitglieder finden passende Ansprechpartner über Unternehmensseiten, Leistungen, Nachrichten und persönliche Begegnungen."],
  ["Auswertung & Aktivität", "Mitgliederentwicklung, Beteiligung, Veranstaltungen und zentrale Netzwerkaktivitäten im Blick behalten."],
];
const modulePrices=[["Unternehmensseiten","19 €"],["Netzwerkveranstaltungen, Kalender, Zu- und Absagen","7 €"],["Direktnachrichten & Partnerchat","5 €"],["Netzwerkchat & Community","4 €"],["Angebote & Leistungen","5 €"],["Dokumente & Wissensbereich","3 €"],["Aufgaben & Zusammenarbeit","3 €"],["Aktivität & Auswertungen","4 €"],["Vermittelter Umsatz","4 €"]];

export default function NetworksPage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  const requestLink = "mailto:service@b2b-matching.de?subject=Anfrage%20Netzwerkportal";
  const schema = {"@context":"https://schema.org","@type":"Service","name":"B2B Matching Netzwerkportal","provider":{"@type":"Organization","name":"B2B Matching","url":base},"areaServed":"DE","audience":{"@type":"BusinessAudience","audienceType":"Unternehmensnetzwerke und Unternehmervereinigungen"},"description":"Geschlossener digitaler Mitgliederbereich für Unternehmensnetzwerke mit Verwaltung, Veranstaltungen, Kommunikation und internem B2B-Matching."};
  return <main className="v2 networkLanding">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader/>
    <section className="networkPublicHero">
      <div>
        <span>FÜR UNTERNEHMENSNETZWERKE</span>
        <h1>Aus Kontakten wird ein<br/><em>aktives digitales Netzwerk.</em></h1>
        <p>Ein eigener geschlossener Mitgliederbereich für Netzwerke, Verbände und Unternehmergemeinschaften: individuell verwaltet, sicher getrennt und mit allen Werkzeugen für Austausch, Veranstaltungen und Kooperationen.</p>
        <div><a className="v2Button light" href={requestLink}>Netzwerkportal anfragen →</a><a className="v2Button glass" href="#funktionen">Funktionen entdecken</a></div>
        <small>Einrichtung ausschließlich nach persönlicher Anfrage · Keine freie Netzwerkregistrierung</small>
      </div>
    </section>
    <section className="networkImpactStrip"><p><b>Ein eigener Raum</b><span>statt verteilter Einzelkanäle</span></p><p><b>Ein geschlossener Kreis</b><span>statt unkontrollierter Öffentlichkeit</span></p><p><b>Ein lebendiges Netzwerk</b><span>auch zwischen den Treffen</span></p></section>

    <section className="contentLead"><span>EINE DRITTE, EIGENE ROLLE</span><h2>Nicht nur ein Konto – Ihr vollständiger Netzwerkbereich.</h2><p>Der Netzwerkadministrator besitzt weiterhin ein normales Unternehmenskonto. Zusätzlich erhält er die Verantwortung für einen vollständig getrennten Netzwerkbereich, in den ausschließlich persönlich eingeladene Mitgliedsunternehmen gelangen.</p></section>

    <section className="networkRoleFlow">
      <article><b>01</b><h3>Netzwerkportal anfragen</h3><p>Die verantwortliche Netzwerkleitung stimmt Anforderungen, Umfang und Einrichtung persönlich mit B2B Matching ab.</p></article>
      <article><b>02</b><h3>Mandant wird eingerichtet</h3><p>Ausschließlich der Plattforminhaber legt den geschlossenen Netzwerkbereich technisch an.</p></article>
      <article><b>03</b><h3>Administrator wird eingeladen</h3><p>Der benannte Initiator erhält einen persönlichen Link, registriert sein Unternehmen und übernimmt die Netzwerkverwaltung.</p></article>
      <article><b>04</b><h3>Mitglieder persönlich einladen</h3><p>Nur der Netzwerkadministrator erstellt weitere Einladungen. Eine freie Anmeldung ist nicht möglich.</p></article>
    </section>

    <section className="networkProductStory">
      <div className="networkProductCopy"><span>DAS NETZWERK AUF EINEN BLICK</span><h2>Vom nächsten Treffen bis zur neuen Kooperation.</h2><p>Die Startseite Ihres Netzwerkportals zeigt nicht nur Zahlen. Sie führt die Mitglieder aktiv zu den nächsten relevanten Schritten – zu Veranstaltungen, Gesprächen, Themen und passenden Geschäftskontakten.</p><ul><li><b>Aktuell</b><span>Termine, Neuigkeiten und offene Aufgaben sofort erfassen</span></li><li><b>Persönlich</b><span>Mitglieder und Ansprechpartner direkt im Netzwerk finden</span></li><li><b>Verbindend</b><span>Leistungen entdecken und den richtigen Partner direkt ansprechen</span></li></ul></div>
      <div className="networkBrowserMock" aria-label="Illustrative Vorschau des Netzwerkportals"><header><i/><i/><i/><span>Beispielhafte Portalansicht</span></header><div className="networkMockBody"><aside><b>UN</b><span>Übersicht</span><span>Mitglieder</span><span>Veranstaltungen</span><span>Matching</span><span>Kommunikation</span></aside><div className="networkMockMain"><small>GUTEN MORGEN</small><h3>Was bewegt Ihr Netzwerk heute?</h3><div className="networkMockMetrics"><p><b>48</b><span>Mitglieder</span></p><p><b>3</b><span>Termine</span></p><p><b>7</b><span>neue Kontakte</span></p></div><section><div><small>NÄCHSTES NETZWERKTREFFEN</small><h4>Unternehmerabend Leverkusen</h4><p>Donnerstag · 18:30 Uhr · 24 Zusagen</p><span>Teilnahme verwalten →</span></div><div><small>NEUE VERBINDUNG</small><strong>92 %</strong><h4>Bedarf trifft Kompetenz</h4><p>Zwei Mitglieder passen fachlich besonders gut zusammen.</p></div></section></div></div><em>VORSCHAU</em></div>
    </section>

    <section className="networkBeforeAfter"><div><span>OHNE ZENTRALEN NETZWERKBEREICH</span><h2>Viele Kanäle.<br/>Wenig Überblick.</h2><p>E-Mail-Verteiler, Messenger, Tabellen, einzelne Kalender und persönliche Rückfragen erzeugen Arbeit – aber keine gemeinsame digitale Heimat.</p></div><div><span>MIT IHREM NETZWERKPORTAL</span><h2>Ein Ort.<br/>Mehr Beteiligung.</h2><p>Mitglieder wissen, was ansteht, wo sie beitragen können und welche Kontakte oder Geschäftschancen gerade relevant sind.</p><a href={requestLink}>Persönliche Einrichtung anfragen →</a></div></section>

    <section className="networkFeatureSection" id="funktionen"><div className="v2Heading"><span>DER FUNKTIONSUMFANG</span><h2>Ein digitaler Arbeitsraum für<br/><em>lebendige Unternehmensnetzwerke.</em></h2><p>Alle zentralen Abläufe werden an einem Ort zusammengeführt, ohne den geschlossenen Charakter Ihres Netzwerks aufzugeben.</p></div><div className="networkFeatureGrid">{functions.map(([title,text],index)=><article key={title}><b>{String(index+1).padStart(2,"0")}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="darkStatement"><span>KLAR GETRENNT UND KONTROLLIERT</span><h2>Ihr Netzwerk bleibt <em>Ihr Netzwerk.</em></h2><p>Mitglieder, Inhalte, Rollen und Aktivitäten werden mandantengetrennt geführt. Fremde Kunden haben keinen Zugriff. Der Netzwerkadministrator entscheidet, wer eingeladen wird und welche Rechte innerhalb des geschlossenen Bereichs gelten.</p><div><article><b>Persönlicher Zugang</b><p>Keine offene Mitgliedsregistrierung: Aufnahme ausschließlich über individuelle Einladung.</p></article><article><b>Eigene Administration</b><p>Mitglieder, Moderatoren, Inhalte und Termine werden durch die verantwortliche Netzwerkleitung gesteuert.</p></article><article><b>Zusätzliches Unternehmenskonto</b><p>Mitglieder können die allgemeinen Unternehmensfunktionen nutzen und zugleich im Netzwerk zusammenarbeiten.</p></article></div></section>

    <section className="splitContent networkUseCases"><div><span>FÜR BESTEHENDE UND NEUE NETZWERKE</span><h2>Mehr Beteiligung zwischen den persönlichen Treffen.</h2><p>Ein gutes Netzwerk lebt von Beziehungen. Das Portal ersetzt keine persönlichen Treffen – es hält Austausch, Aufgaben und Geschäftschancen dazwischen lebendig und nachvollziehbar.</p><ul><li>Unternehmernetzwerke und regionale Wirtschaftsgruppen</li><li>Verbände, Initiativen und geschlossene Business Communities</li><li>Franchise-, Partner- und Kooperationsnetzwerke</li><li>Fachgruppen mit regelmäßigem Austausch</li></ul></div><div className="infoPanel"><small>MEHRWERT FÜR DIE NETZWERKLEITUNG</small><ol><li><b>Weniger Einzelkommunikation</b><span>Informationen erreichen den richtigen Mitgliederkreis zentral.</span></li><li><b>Mehr Übersicht</b><span>Teilnahmen, Themen, Aufgaben und Aktivitäten bleiben nachvollziehbar.</span></li><li><b>Mehr Verbindungen</b><span>Partner entdecken Leistungen und sprechen einander direkt an.</span></li><li><b>Mehr Bindung</b><span>Das Netzwerk bleibt auch zwischen den Terminen präsent und nutzbar.</span></li></ol></div></section>

    <section className="networkPricingPublic" id="preise"><div><span>MODULAR UND NACHVOLLZIEHBAR</span><h2>Der Initiator gestaltet. Jeder Partner bucht für sich.</h2><p>Der Initiator legt fest, welche Module im Netzwerk angeboten werden. Jeder eingeladene Partner wählt und bezahlt anschließend nur die Funktionen seines persönlichen Zugangs – verbindlich für zwölf Monate im Voraus.</p></div><div className="networkPriceColumns"><article className="monthly"><small>MODULPREISE JE NUTZER / MONAT</small><h3>Persönlich kombinierbar</h3><ul>{modulePrices.map(([name,price])=><li key={name}><span>{name}</span> <b>{price}</b></li>)}</ul><p><strong>Kostenlos enthalten:</strong> Partnerverzeichnis sowie der ausschließlich vom Initiator verwaltete Whitelabel-Auftritt mit Netzwerkname, Logo und eigenen Farben.</p></article><article className="setup"><small>SOFORT NACH BUCHUNG NUTZBAR</small><strong>49 € <span>netto / Nutzer / Monat</span></strong><h3>Komplettpaket mit allen angebotenen Modulen</h3><ul><li>Persönliche Buchung jedes Partners</li><li>Sofortige Freischaltung</li><li>Rechnung mit 14 Tagen Zahlungsziel</li><li>12 Monate Laufzeit im Voraus</li></ul><hr/><small>NETZWERKEINRICHTUNG</small><strong>2.990 € <span>netto / einmalig für den Initiator</span></strong></article></div></section>

    <section className="networkTestCta"><span>PERSÖNLICH EINGERICHTETER NETZWERKBEREICH</span><h2>Lassen Sie uns Ihr Netzwerkportal gemeinsam vorbereiten.</h2><p>Nach Ihrer Anfrage klären wir Struktur, Branding und Verantwortlichkeit. Anschließend richten wir den geschlossenen Mandanten ein und senden dem benannten Netzwerkadministrator seinen persönlichen Einladungslink.</p><a className="v2Button light" href={requestLink}>Netzwerkportal unverbindlich anfragen →</a><small>Keine freie Registrierung · Kein öffentliches Mitgliederverzeichnis · Zugang nur per Einladung</small></section>
    <SiteFooter/>
  </main>;
}
