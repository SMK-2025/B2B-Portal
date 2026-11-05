import { LegalPage, LegalSection } from "../../components/legal-page";

export const metadata = { title: "Allgemeine Geschäftsbedingungen", description: "Bedingungen für die geschäftliche Nutzung der B2B-Matching-Partnerportale.", robots: { index: false } };

export default function Page() {
  return <LegalPage eyebrow="VERTRAGSBEDINGUNGEN" title="Allgemeine Geschäftsbedingungen" intro="Bedingungen für die geschäftliche Nutzung der B2B-Matching-Partnerportale." updated="5. November 2026">
    <LegalSection title="Anbieter und Vertragspartner">
      <p>Anbieter ist die Media Online Innovations Group, Inhaber Martin Kelm, Im Weidenblech 25, 51371 Leverkusen. Das Angebot richtet sich ausschließlich an Unternehmen, die in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handeln (§ 14 BGB). Wer für ein Unternehmen bucht, muss dazu berechtigt sein. Eine Privatnutzung ist nicht vorgesehen. Individuelle Vereinbarungen gehen diesen Bedingungen vor.</p>
    </LegalSection>
    <LegalSection title="Zugang zum Netzwerk">
      <p>Der Zugang erfolgt je nach Netzwerk über eine Einladung, einen teilbaren Registrierungslink oder eine geprüfte Teilnahmeanfrage. Ein Antrag und die Bestätigung der E-Mail-Adresse sind noch keine kostenpflichtige Buchung. Vor der Freigabe eines Antrags bleiben die Netzwerkfunktionen gesperrt. Besucherzugänge berechtigen nur zur Ansicht. Die Darstellung eines Netzwerks bedeutet nicht, dass der namensgebende Verein Betreiber oder Vertragspartner ist.</p>
    </LegalSection>
    <LegalSection title="Buchung und Rechnung">
      <p>Beim Selbstzahlermodell bucht das Unternehmen die Netzwerknutzung verbindlich zu den vor Abschluss ausgewiesenen Konditionen. Angezeigt werden eine etwaige kostenlose Anfangsphase, Leistungszeitraum, Monats- und Gesamtpreis, Umsatzsteuer und Zahlungsbedingungen. Bei zentraler Finanzierung rechnet der Anbieter mit dem Netzwerk ab; dem Mitglied wird für die so finanzierte Nutzung nichts berechnet. Initiatoren zahlen für ihren Verwaltungszugang keinen Mitgliedsbeitrag.</p>
      <p>Rechnungen werden an die vereinbarte Rechnungsadresse per E-Mail übermittelt, für die elektronische Rechnungsstellung im strukturierten ZUGFeRD-Format. Bei einer vereinbarten kostenlosen Anfangsphase ist der reguläre Versand 15 Kalendertage vor deren letztem Tag vorgesehen. Bei späterer Buchung erfolgt er nach Buchung. Das reguläre Zahlungsziel beträgt 14 Kalendertage ab Rechnungsdatum. Abweichend vereinbarte Versandtermine bleiben unberührt. Es erfolgt keine automatische Abbuchung.</p>
    </LegalSection>
    <LegalSection title="Laufzeit">
      <p>Maßgeblich ist die bei Vertragsschluss vereinbarte Laufzeit. Die Mitgliedschaft endet mit Ablauf dieses Zeitraums. Eine weitere Laufzeit erfordert eine neue Vereinbarung. Für eine vollständig kostenlose Startmitgliedschaft wird keine Rechnung erstellt. Das Recht zur außerordentlichen Kündigung bleibt unberührt.</p>
    </LegalSection>
    <LegalSection title="Verantwortung für den Account">
      <p>Nutzer schützen ihre persönlichen Zugangsdaten, geben Passwörter und Sicherheitscodes nicht weiter und melden einen vermuteten Missbrauch unverzüglich an service@b2b-matching.de. Unternehmen halten ihre Kontakt- und Rechnungsangaben aktuell und stellen sicher, dass nur befugte Personen in ihrem Namen handeln. Eine verschuldensunabhängige Haftung für fremden Missbrauch entsteht dadurch nicht.</p>
    </LegalSection>
    <LegalSection title="Inhalte und Sichtbarkeit">
      <p>Profile, Mitteilungen, Termine und Dokumente sind grundsätzlich nur für die jeweils berechtigten Nutzer des Netzwerks bestimmt. Wo eine öffentliche Homepage angebunden ist, können Mitglieder ausgewählte Profilangaben gesondert freigeben. Veranstaltungen und Rückblicke benötigen eine eigene Freigabe. Eine interne Veröffentlichung allein macht Inhalte nicht öffentlich.</p>
      <p>Wer Texte, Bilder, Logos oder Daten Dritter einstellt, muss dazu berechtigt sein. Das gilt gesondert für die Veröffentlichung im Internet. Der Anbieter darf Inhalte im für die gewählte Funktion und Sichtbarkeit erforderlichen Umfang speichern und anzeigen. KI-Entwürfe sind vor der Veröffentlichung auf Richtigkeit und Rechte Dritter zu prüfen. Untersagt sind insbesondere Spam, unbefugtes Auslesen von Mitgliederdaten und die Umgehung von Zugriffsbeschränkungen.</p>
    </LegalSection>
    <LegalSection title="Leistung, Sperrung und Vertragsende">
      <p>Der Anbieter stellt die vereinbarten Netzwerkfunktionen bereit, schuldet aber keinen bestimmten Vermittlungserfolg und wird nicht Partei von Geschäften der Mitglieder untereinander. Wartung und Sicherheitsmaßnahmen können die Verfügbarkeit vorübergehend einschränken. Bei Zahlungsverzug, erheblichem Missbrauch oder einer konkreten Sicherheitsgefahr kann der Anbieter den betroffenen Zugang im erforderlichen Umfang sperren. Nach Wegfall des Grundes wird eine vorläufige Sperre aufgehoben.</p>
      <p>Endet eine Netzwerkmitgliedschaft, endet der zugehörige Zugriff. Andere Mitgliedschaften desselben Kontos bleiben davon unberührt. Gesetzliche Aufbewahrungspflichten, insbesondere für Rechnungen, bestehen unabhängig vom Portalzugriff.</p>
    </LegalSection>
    <LegalSection title="Haftung und Schlussbestimmungen">
      <p>Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit sowie nach zwingendem Recht. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Es gilt deutsches Recht. Für Kaufleute ist, soweit zulässig, Leverkusen Gerichtsstand.</p>
    </LegalSection>
  </LegalPage>;
}
