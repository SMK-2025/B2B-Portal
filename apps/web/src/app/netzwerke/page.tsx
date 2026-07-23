import type { Metadata } from "next";
import Link from "next/link";
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
  ["Internes B2B-Matching", "Bedarfe und Kompetenzen innerhalb des geschlossenen Netzwerks zusammenführen – getrennt von anderen Portalnutzern."],
  ["Auswertung & Aktivität", "Mitgliederentwicklung, Beteiligung, Veranstaltungen und zentrale Netzwerkaktivitäten im Blick behalten."],
];

export default function NetworksPage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  const schema = {"@context":"https://schema.org","@type":"Service","name":"B2B Matching Netzwerkportal","provider":{"@type":"Organization","name":"B2B Matching","url":base},"areaServed":"DE","audience":{"@type":"BusinessAudience","audienceType":"Unternehmensnetzwerke und Unternehmervereinigungen"},"description":"Geschlossener digitaler Mitgliederbereich für Unternehmensnetzwerke mit Verwaltung, Veranstaltungen, Kommunikation und internem B2B-Matching."};
  return <main className="v2 networkLanding">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader/>
    <section className="networkPublicHero">
      <div>
        <span>FÜR UNTERNEHMENSNETZWERKE</span>
        <h1>Aus Kontakten wird ein<br/><em>aktives digitales Netzwerk.</em></h1>
        <p>Ein eigener geschlossener Mitgliederbereich für Netzwerke, Verbände und Unternehmergemeinschaften: individuell verwaltet, sicher getrennt und mit allen Werkzeugen für Austausch, Veranstaltungen und Kooperationen.</p>
        <div><Link className="v2Button light" href="/registrieren?rolle=netzwerk">10 Tage unverbindlich ansehen →</Link><a className="v2Button glass" href="#funktionen">Funktionen entdecken</a></div>
        <small>Keine automatische Verlängerung · Im Test reine Ansicht · Aktivierung erst nach gesonderter Buchung</small>
      </div>
    </section>
    <section className="networkImpactStrip"><p><b>Ein eigener Raum</b><span>statt verteilter Einzelkanäle</span></p><p><b>Ein geschlossener Kreis</b><span>statt unkontrollierter Öffentlichkeit</span></p><p><b>Ein lebendiges Netzwerk</b><span>auch zwischen den Treffen</span></p></section>

    <section className="contentLead"><span>EINE DRITTE, EIGENE ROLLE</span><h2>Nicht nur ein Konto – Ihr vollständiger Netzwerkbereich.</h2><p>Der Netzwerkadministrator besitzt weiterhin ein normales Unternehmenskonto. Zusätzlich erhält er die Verantwortung für einen vollständig getrennten Netzwerkbereich, in den ausschließlich persönlich eingeladene Mitgliedsunternehmen gelangen.</p></section>

    <section className="networkRoleFlow">
      <article><b>01</b><h3>Netzwerk registrieren</h3><p>Die entscheidungsberechtigte Person benennt das Netzwerk und bestätigt ihre administrative Verantwortung.</p></article>
      <article><b>02</b><h3>Testbereich ansehen</h3><p>Zehn Tage lang können sämtliche Oberflächen unverbindlich angesehen und durchgeklickt werden.</p></article>
      <article><b>03</b><h3>Portal verbindlich aktivieren</h3><p>Erst nach gesonderter Buchung werden Speichern, Einladen und Veröffentlichen freigeschaltet.</p></article>
      <article><b>04</b><h3>Mitglieder persönlich einladen</h3><p>Nur der Netzwerkadministrator erstellt Einladungen. Jedes Mitglied wird sicher dem richtigen Netzwerk zugeordnet.</p></article>
    </section>

    <section className="networkProductStory">
      <div className="networkProductCopy"><span>DAS NETZWERK AUF EINEN BLICK</span><h2>Vom nächsten Treffen bis zur neuen Kooperation.</h2><p>Die Startseite Ihres Netzwerkportals zeigt nicht nur Zahlen. Sie führt die Mitglieder aktiv zu den nächsten relevanten Schritten – zu Veranstaltungen, Gesprächen, Themen und passenden Geschäftskontakten.</p><ul><li><b>Aktuell</b><span>Termine, Neuigkeiten und offene Aufgaben sofort erfassen</span></li><li><b>Persönlich</b><span>Mitglieder und Ansprechpartner direkt im Netzwerk finden</span></li><li><b>Verbindend</b><span>Bedarfe und Kompetenzen strukturiert zusammenbringen</span></li></ul></div>
      <div className="networkBrowserMock" aria-label="Illustrative Vorschau des Netzwerkportals"><header><i/><i/><i/><span>Beispielhafte Portalansicht</span></header><div className="networkMockBody"><aside><b>UN</b><span>Übersicht</span><span>Mitglieder</span><span>Veranstaltungen</span><span>Matching</span><span>Kommunikation</span></aside><div className="networkMockMain"><small>GUTEN MORGEN</small><h3>Was bewegt Ihr Netzwerk heute?</h3><div className="networkMockMetrics"><p><b>48</b><span>Mitglieder</span></p><p><b>3</b><span>Termine</span></p><p><b>7</b><span>neue Kontakte</span></p></div><section><div><small>NÄCHSTES NETZWERKTREFFEN</small><h4>Unternehmerabend Leverkusen</h4><p>Donnerstag · 18:30 Uhr · 24 Zusagen</p><span>Teilnahme verwalten →</span></div><div><small>NEUE VERBINDUNG</small><strong>92 %</strong><h4>Bedarf trifft Kompetenz</h4><p>Zwei Mitglieder passen fachlich besonders gut zusammen.</p></div></section></div></div><em>VORSCHAU</em></div>
    </section>

    <section className="networkBeforeAfter"><div><span>OHNE ZENTRALEN NETZWERKBEREICH</span><h2>Viele Kanäle.<br/>Wenig Überblick.</h2><p>E-Mail-Verteiler, Messenger, Tabellen, einzelne Kalender und persönliche Rückfragen erzeugen Arbeit – aber keine gemeinsame digitale Heimat.</p></div><div><span>MIT IHREM NETZWERKPORTAL</span><h2>Ein Ort.<br/>Mehr Beteiligung.</h2><p>Mitglieder wissen, was ansteht, wo sie beitragen können und welche Kontakte oder Geschäftschancen gerade relevant sind.</p><Link href="/registrieren?rolle=netzwerk">Testbereich unverbindlich ansehen →</Link></div></section>

    <section className="networkFeatureSection" id="funktionen"><div className="v2Heading"><span>DER FUNKTIONSUMFANG</span><h2>Ein digitaler Arbeitsraum für<br/><em>lebendige Unternehmensnetzwerke.</em></h2><p>Alle zentralen Abläufe werden an einem Ort zusammengeführt, ohne den geschlossenen Charakter Ihres Netzwerks aufzugeben.</p></div><div className="networkFeatureGrid">{functions.map(([title,text],index)=><article key={title}><b>{String(index+1).padStart(2,"0")}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="darkStatement"><span>KLAR GETRENNT UND KONTROLLIERT</span><h2>Ihr Netzwerk bleibt <em>Ihr Netzwerk.</em></h2><p>Mitglieder, Inhalte, Rollen und Aktivitäten werden mandantengetrennt geführt. Fremde Kunden haben keinen Zugriff. Der Netzwerkadministrator entscheidet, wer eingeladen wird und welche Rechte innerhalb des geschlossenen Bereichs gelten.</p><div><article><b>Persönlicher Zugang</b><p>Keine offene Mitgliedsregistrierung: Aufnahme ausschließlich über individuelle Einladung.</p></article><article><b>Eigene Administration</b><p>Mitglieder, Moderatoren, Inhalte und Termine werden durch die verantwortliche Netzwerkleitung gesteuert.</p></article><article><b>Zusätzliches Unternehmenskonto</b><p>Mitglieder können die allgemeinen Unternehmensfunktionen nutzen und zugleich im Netzwerk zusammenarbeiten.</p></article></div></section>

    <section className="splitContent networkUseCases"><div><span>FÜR BESTEHENDE UND NEUE NETZWERKE</span><h2>Mehr Beteiligung zwischen den persönlichen Treffen.</h2><p>Ein gutes Netzwerk lebt von Beziehungen. Das Portal ersetzt keine persönlichen Treffen – es hält Austausch, Aufgaben und Geschäftschancen dazwischen lebendig und nachvollziehbar.</p><ul><li>Unternehmernetzwerke und regionale Wirtschaftsgruppen</li><li>Verbände, Initiativen und geschlossene Business Communities</li><li>Franchise-, Partner- und Kooperationsnetzwerke</li><li>Fachgruppen mit regelmäßigem Austausch</li></ul></div><div className="infoPanel"><small>MEHRWERT FÜR DIE NETZWERKLEITUNG</small><ol><li><b>Weniger Einzelkommunikation</b><span>Informationen erreichen den richtigen Mitgliederkreis zentral.</span></li><li><b>Mehr Übersicht</b><span>Teilnahmen, Themen, Aufgaben und Aktivitäten bleiben nachvollziehbar.</span></li><li><b>Mehr Verbindungen</b><span>Bedarfe und Kompetenzen der Mitglieder werden leichter zusammengeführt.</span></li><li><b>Mehr Bindung</b><span>Das Netzwerk bleibt auch zwischen den Terminen präsent und nutzbar.</span></li></ol></div></section>

    <section className="networkPricingPublic" id="preise"><div><span>TRANSPARENT KALKULIERT</span><h2>Zwei klar getrennte Preisbestandteile.</h2><p>Die Buchung erfolgt erst nach dem unverbindlichen Test und einer ausdrücklichen Beauftragung. Es gibt keine automatische kostenpflichtige Verlängerung.</p></div><div className="networkPriceColumns"><article className="monthly"><small>1 · LAUFENDE NETZWERKPAUSCHALE</small><strong>390 € <span>netto / Monat</span></strong><h3>Für bis zu 50 Mitgliedsunternehmen</h3><ul><li>Bereitgestellte Netzwerkfunktionen</li><li>Hosting, Wartung und Sicherheitsupdates</li><li>Funktionsupdates und technischer Betrieb</li><li>12 Monate Mindestlaufzeit</li><li>Jährliche Vorauszahlung oder halbjährliche Abrechnung</li></ul></article><article className="setup"><small>2 · EINMALIGE BEREITSTELLUNG</small><strong>2.990 € <span>netto / einmalig</span></strong><h3>Einrichtung und Service</h3><ul><li>Technische Bereitstellung des Netzwerkbereichs</li><li>Grundkonfiguration und Rollenstruktur</li><li>Einrichtung des Netzwerkadministrators</li><li>Vorbereitung für die Mitgliederaufnahme</li></ul></article></div></section>

    <section className="networkTestCta"><span>10 TAGE UNVERBINDLICHE TESTANSICHT</span><h2>Sehen Sie zuerst, ob das Portal zu Ihrem Netzwerk passt.</h2><p>Als verantwortliche Netzwerkleitung können Sie sämtliche Bereiche ansehen und sich durch die Oberfläche bewegen. Nutzbare Funktionen werden erst nach einer verbindlichen Buchung aktiviert.</p><Link className="v2Button light" href="/registrieren?rolle=netzwerk">Netzwerk-Testzugang anlegen →</Link><small>Keine Zahlungsdaten im Test · Keine automatische Verlängerung</small></section>
    <SiteFooter/>
  </main>;
}
