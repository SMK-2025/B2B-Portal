import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "Nutzungs-, Rollen-, Preis- und Vertragsbedingungen für Unternehmen, Dienstleister und Unternehmensnetzwerke auf B2B Matching.",
};

export default function Agb() {
  return <LegalPage eyebrow="VERTRAGSBEDINGUNGEN" title="Allgemeine Geschäftsbedingungen" intro="Klare Regeln für Unternehmen, Dienstleister und geschlossene Unternehmensnetzwerke auf B2B Matching." updated="21. Juli 2026">
    <LegalSection title="1. Anbieter, Geltungsbereich und B2B-Ausschluss">
      <p>Diese Allgemeinen Geschäftsbedingungen („AGB“) gelten für sämtliche Registrierungen, Testzugänge, unentgeltlichen Nutzungen und kostenpflichtigen Verträge über das Portal B2B Matching. Anbieter und Vertragspartner ist Media Online Innovations Group, Inhaber Martin Kelm, Im Weidenblech 25, 51371 Leverkusen („Anbieter“).</p>
      <p>Das Portal richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Verbraucher dürfen sich nicht registrieren oder das Portal nutzen. Nutzer bestätigen bei der Registrierung, in Ausübung ihrer gewerblichen oder selbstständigen beruflichen Tätigkeit zu handeln.</p>
      <p>Abweichende Bedingungen eines Nutzers gelten nur, wenn der Anbieter ihrer Geltung ausdrücklich in Textform zugestimmt hat. Individuelle Vereinbarungen, Angebote und Auftragsbestätigungen haben im Konfliktfall Vorrang vor diesen AGB.</p>
    </LegalSection>

    <LegalSection title="2. Begriffe und Rollen">
      <p><strong>Plattformadministrator</strong> ist ausschließlich der Anbieter oder eine von ihm autorisierte Person. Der Plattformadministrator steuert den Portalbetrieb, Prüfungen, Freigaben, Netzwerkaktivierungen, Rollen und Sperrungen.</p>
      <p><strong>Unternehmen beziehungsweise suchendes Unternehmen</strong> ist ein registrierter geschäftlicher Nutzer, der ein Unternehmensprofil führt und Bedarfe an Dienstleistungen anlegt. Diese Rolle wird nachfolgend auch „Unternehmerrolle“ genannt.</p>
      <p><strong>Dienstleister</strong> ist ein registrierter geschäftlicher Nutzer, der Leistungen, Spezialisierungen und Referenzen in einem Dienstleisterprofil beziehungsweise einer Leistungsseite darstellt und an freigegebenen Matchings teilnimmt.</p>
      <p><strong>Netzwerkadministrator</strong> ist die für ein Unternehmensnetzwerk entscheidungs- und verwaltungsberechtigte Person. Sie besitzt ein reguläres Unternehmenskonto und zusätzlich administrative Rechte für den ihr zugeordneten geschlossenen Netzwerkbereich.</p>
      <p><strong>Netzwerkmitglied</strong> ist ein Unternehmen oder dessen berechtigte Person, die durch eine persönliche Einladung einem bestimmten Netzwerkbereich zugeordnet wurde. Netzwerkmitglieder sind keine Netzwerkadministratoren, soweit ihnen diese Rolle nicht ausdrücklich wirksam zugewiesen wurde.</p>
      <p><strong>Netzwerkportal</strong> ist ein technisch und organisatorisch abgegrenzter Bereich für ein bestimmtes Unternehmensnetzwerk. <strong>Match</strong> bezeichnet eine automatisiert oder manuell ermittelte, unverbindliche Passung zwischen Bedarfen, Kompetenzen oder Mitgliedern.</p>
    </LegalSection>

    <LegalSection title="3. Leistungsgegenstand und Grenzen der Vermittlung">
      <p>B2B Matching stellt eine digitale Infrastruktur für Unternehmens-, Bedarfs- und Dienstleisterprofile, Qualitätsprüfungen, Matching, kontrollierte Sichtbarkeit, Kommunikation, Terminabstimmung, Aktivitäts- und Statusdokumentation sowie – bei gebuchtem Netzwerkportal – für die Verwaltung und Zusammenarbeit geschlossener Unternehmensnetzwerke bereit.</p>
      <p>Ein Match, Prozentwert, Hinweis oder eine KI-gestützte Empfehlung ist eine unverbindliche Entscheidungshilfe. Der Anbieter schuldet weder eine bestimmte Anzahl oder Qualität von Matches, Mitgliedern, Kontakten, Anfragen oder Veranstaltungen noch einen Vertragsschluss oder wirtschaftlichen Erfolg. B2B Matching ist keine Ausschreibungs- oder Vergabestelle und wird nicht Partei der zwischen Nutzern geschlossenen Verträge.</p>
      <p>Der jeweils konkrete Funktionsumfang ergibt sich aus der bei Vertragsschluss angezeigten Leistungsbeschreibung, einem individuellen Angebot oder der Auftragsbestätigung.</p>
    </LegalSection>

    <LegalSection title="4. Registrierung, Vertragsschluss und Vertretungsbefugnis">
      <p>Registrierende Personen müssen volljährig sein, wahrheitsgemäße und vollständige Angaben machen und zur Registrierung sowie Nutzung für das angegebene Unternehmen berechtigt sein. Persönliche Zugänge dürfen nicht geteilt oder Dritten überlassen werden. Zugangsdaten sind gegen unbefugte Nutzung zu schützen.</p>
      <p>Die Registrierung eines kostenlosen Kontos begründet zunächst ein unentgeltliches Nutzungsverhältnis. Ein kostenpflichtiger Vertrag entsteht erst durch eine ausdrückliche Buchung, Annahme eines Angebots oder Auftragsbestätigung des Anbieters. Die bloße Registrierung, E-Mail-Bestätigung oder Nutzung einer Testansicht führt nicht zu einer Zahlungspflicht.</p>
      <p>Der Anbieter darf Registrierungen, Rollen und Vertragsangaben prüfen, Nachweise verlangen und eine Freischaltung bei unvollständigen, widersprüchlichen oder nicht plausiblen Angaben verweigern.</p>
    </LegalSection>

    <LegalSection title="5. Unternehmerrolle und kostenlose Nutzung">
      <p>Die Nutzung des Portals als suchendes Unternehmen ist nach dem gegenwärtigen Preismodell kostenlos. Hierzu gehören insbesondere das Unternehmenskonto, die Erstellung und Verwaltung des Unternehmensprofils, das Anlegen von Bedarfen sowie die Prüfung und kontrollierte Freigabe passender Dienstleister, soweit die jeweilige Funktion verfügbar und freigegeben ist.</p>
      <p>Bedarfe müssen ernsthaft, aktuell, geschäftlich veranlasst und hinreichend konkret sein. Ein kostenloses Konto begründet keinen Anspruch auf dauerhaft unveränderten Funktionsumfang, bestimmte Matches oder eine bestimmte Reaktionszeit. Neue kostenpflichtige Zusatzleistungen werden nicht ohne ausdrückliche Buchung aktiviert.</p>
    </LegalSection>

    <LegalSection title="6. Dienstleisterrolle, Preise und Mindestlaufzeit">
      <p>Registrierung und Profilerstellung als Dienstleister können unentgeltlich angeboten werden. Die aktive Teilnahme an Matchings, die Sichtbarkeit für freigegebene Bedarfe oder weitere als kostenpflichtig gekennzeichnete Dienstleisterfunktionen setzen einen gebuchten Tarif voraus.</p>
      <p>Tarif, Leistungsumfang, Preis, Abrechnungszeitraum und Fälligkeit werden vor der verbindlichen Buchung angezeigt oder individuell vereinbart. Kostenpflichtige Dienstleister-Abonnements haben eine Mindestvertragslaufzeit von drei Monaten und werden für den ausgewiesenen Abrechnungszeitraum im Voraus berechnet. Alle Preise verstehen sich netto zuzüglich gesetzlicher Umsatzsteuer, soweit diese anfällt.</p>
      <p>Soweit bei der Buchung nichts Abweichendes vereinbart wird, verlängert sich das Abonnement nach der Mindestlaufzeit jeweils um einen Monat. Es kann mit einer Frist von 14 Tagen zum Ende des laufenden Verlängerungszeitraums in Textform oder über eine vorgesehene Kontofunktion gekündigt werden.</p>
    </LegalSection>

    <LegalSection title="7. Netzwerkrolle und Berechtigung des Netzwerkadministrators">
      <p>Wer ein Netzwerk registriert, bestätigt, zur Einrichtung, Buchung und Verwaltung des betreffenden Unternehmensnetzwerks entscheidungs- oder vertretungsberechtigt zu sein. Der Netzwerkadministrator ist zentraler Ansprechpartner des Anbieters und verantwortet Einladungen, Mitgliedszuordnungen, interne Rollen, Berechtigungen und die von ihm oder seinen Mitgliedern veranlassten Inhalte und Aktivitäten.</p>
      <p>Eine offene Selbstzuordnung zu einem fremden Netzwerk ist ausgeschlossen. Mitgliedsunternehmen treten grundsätzlich nur über einen persönlichen, vom Netzwerkadministrator oder einer berechtigten Stelle erzeugten Einladungslink bei. Einladungen dürfen nur an geschäftlich berechtigte Empfänger versendet werden. Einladungscodes sind vertraulich zu behandeln und dürfen nicht öffentlich verbreitet werden.</p>
      <p>Der Netzwerkadministrator darf administrative Rechte nur an geeignete, nachweislich berechtigte Personen übertragen. Der Anbieter kann eine solche Übertragung prüfen, ablehnen oder bei Sicherheits- und Missbrauchsrisiken widerrufen. Die Plattformadministratorrolle kann weder registriert noch durch einen Netzwerkadministrator vergeben werden.</p>
    </LegalSection>

    <LegalSection title="8. Zehntägige Netzwerk-Testansicht">
      <p>Für neue Netzwerkregistrierungen kann eine unverbindliche Testansicht für zehn Kalendertage ab Freischaltung bereitgestellt werden. Sie dient ausschließlich dazu, Oberfläche, Navigation und dargestellte Funktionsbereiche kennenzulernen.</p>
      <p>Während der Testphase besteht kein Anspruch auf produktive Nutzung. Insbesondere können Speichern, Veröffentlichen, Einladen, operative Kommunikation, produktives Matching oder sonstige schreibende Funktionen vollständig oder teilweise gesperrt sein. Testdaten können jederzeit zurückgesetzt oder gelöscht werden.</p>
      <p>Die Testansicht endet automatisch nach zehn Kalendertagen. Sie verlängert sich nicht automatisch und geht nicht automatisch in einen kostenpflichtigen Vertrag über. Eine produktive Aktivierung erfolgt ausschließlich nach gesonderter verbindlicher Buchung. Der Anbieter kann Testzugänge bei Missbrauch oder Mehrfachregistrierung vorzeitig sperren.</p>
    </LegalSection>

    <LegalSection title="9. Preise des Netzwerkportals und zwei getrennte Entgeltbestandteile">
      <p>Für das Netzwerkportal bis einschließlich 50 zugeordnete Mitgliedsunternehmen gelten – soweit im individuellen Angebot nichts Abweichendes vereinbart wird – zwei rechtlich und wirtschaftlich getrennte Entgeltbestandteile:</p>
      <p><strong>1. Monatliche Netzwerkpauschale:</strong> 390,00 Euro netto pro Monat. Sie vergütet die laufende Nutzung des Netzwerkportals für bis zu 50 Mitgliedsunternehmen einschließlich Hosting, Wartung, Sicherheits- und Funktionsupdates im vereinbarten Umfang.</p>
      <p><strong>2. Einmalige Bereitstellungs- und Servicepauschale:</strong> 2.990,00 Euro netto. Sie fällt zusätzlich zur monatlichen Netzwerkpauschale einmalig für die technische Bereitstellung, Grundkonfiguration, Rollenstruktur, Einrichtung des Netzwerkadministrators und Vorbereitung der Mitgliederaufnahme an.</p>
      <p>Auf beide Entgeltbestandteile fällt die gesetzliche Umsatzsteuer an, soweit diese anfällt. Die einmalige Pauschale wird mit Vertragsschluss und vor der produktiven Bereitstellung fällig. Die laufende Netzwerkpauschale wird wahlweise für zwölf Monate im Voraus oder – sofern vereinbart – halbjährlich im Voraus abgerechnet. Maßgeblich sind Angebot, Auftragsbestätigung und Rechnung.</p>
      <p>Bei mehr als 50 Mitgliedsunternehmen ist eine gesonderte Erweiterung oder individuelle Preisvereinbarung erforderlich. Ohne eine solche Vereinbarung besteht kein Anspruch auf die Aufnahme weiterer Mitgliedsunternehmen.</p>
    </LegalSection>

    <LegalSection title="10. Laufzeit und Kündigung des Netzwerkportals">
      <p>Der kostenpflichtige Vertrag über das Netzwerkportal hat eine Mindestvertragslaufzeit von zwölf Monaten ab vereinbartem Leistungsbeginn. Sofern Angebot oder Auftragsbestätigung keine abweichende Regelung enthalten, verlängert sich der Vertrag anschließend jeweils um weitere zwölf Monate, wenn er nicht mit einer Frist von drei Monaten zum Ende der jeweiligen Laufzeit in Textform gekündigt wird.</p>
      <p>Die Deaktivierung einzelner Mitglieder, die Nichtausnutzung der enthaltenen 50 Mitgliedsunternehmen oder eine vorübergehende Nichtnutzung berühren Vergütung und Laufzeit nicht. Das Recht beider Parteien zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>
    </LegalSection>

    <LegalSection title="11. Netzwerkfunktionen, Mandantentrennung und Mitgliedsverhältnis">
      <p>Je nach gebuchtem Umfang kann das Netzwerkportal Mitglieder- und Rollenverwaltung, Veranstaltungen und Anmeldungen, Kommunikation, Themen, Aufgaben, Dokumente, Auswertungen sowie internes Matching enthalten. Der Anbieter darf Funktionen technisch weiterentwickeln, solange der wesentliche Vertragszweck gewahrt bleibt.</p>
      <p>Netzwerkbereiche werden logisch voneinander getrennt geführt. Mitglieder erhalten ausschließlich Zugriff auf die Bereiche, denen sie wirksam zugeordnet wurden. Der Netzwerkadministrator darf Mitgliedszugänge freigeben, beschränken, suspendieren oder entfernen, soweit gesetzliche und vertragliche Vorgaben beachtet werden.</p>
      <p>Die Mitgliedschaft in einem Unternehmensnetzwerk und etwaige Beiträge oder Pflichten gegenüber der Netzwerkorganisation sind vom Portalvertrag mit dem Anbieter getrennt. Der Anbieter wird nicht Partei interner Mitgliedschafts-, Veranstaltungs- oder Kooperationsvereinbarungen.</p>
    </LegalSection>

    <LegalSection title="12. Profile, Qualitätsprüfung und Freigaben">
      <p>Unternehmensprofile, Bedarfe, Dienstleisterprofile, Leistungsseiten und Netzwerkangaben können automatisiert, KI-gestützt und manuell auf Vollständigkeit, Plausibilität, Qualität, Sicherheit und Regelkonformität geprüft werden. Ein Anspruch auf Freigabe oder eine bestimmte Bewertung besteht nicht.</p>
      <p>Der Anbieter darf Nachweise verlangen, Änderungen anfordern, Inhalte zurückweisen, Freigaben widerrufen und sichtbar machen, ob Inhalte geprüft, freigegeben, abgelehnt oder archiviert sind. Die Prüfung stellt keine Garantie für Identität, Vertretungsbefugnis, Bonität, fachliche Eignung, Rechtskonformität oder wirtschaftliche Leistungsfähigkeit dar.</p>
    </LegalSection>

    <LegalSection title="13. Zulässige Nutzung und verbotene Handlungen">
      <p>Das Portal darf ausschließlich für ernsthafte geschäftliche Zwecke und im Rahmen der jeweils zugewiesenen Rolle genutzt werden. Unzulässig sind insbesondere falsche Identitäten oder Befugnisse, irreführende Leistungsversprechen, Scheinbedarfe, Spam, unaufgeforderte Massenansprache, Scraping, automatisiertes Auslesen, Umgehung von Sichtbarkeits- oder Freigaberegeln, Manipulation von Matchingwerten, öffentliche Weitergabe von Einladungslinks, Schadsoftware sowie rechtswidrige, diskriminierende oder vertraulichkeitsverletzende Inhalte.</p>
      <p>Nutzer dürfen das Portal, dessen Daten und Inhalte nicht vervielfältigen, weiterverkaufen, Dritten als eigenen Dienst anbieten, technisch untersuchen oder für das Training fremder KI-Systeme verwenden, soweit dies nicht ausdrücklich gestattet oder zwingend gesetzlich erlaubt ist.</p>
    </LegalSection>

    <LegalSection title="14. Bedarfe, Matches, Sichtbarkeit und Vertraulichkeit">
      <p>Suchende Unternehmen entscheiden nach dem vorgesehenen Freigabeprozess, welcher Dienstleister einen anonymisierten Bedarf oder weitere Unternehmensinformationen sehen darf. Nutzer müssen Ablehnungen, Sperrvermerke und Sichtbarkeitsgrenzen respektieren.</p>
      <p>Vertrauliche Informationen, die im Rahmen eines Matches, Netzwerkbereichs, Chats, Dokuments oder Termins zugänglich werden, dürfen ausschließlich für den vorgesehenen geschäftlichen Zweck verwendet und nicht ohne Berechtigung an Dritte weitergegeben werden. Gesetzliche Geheimhaltungs- und Datenschutzpflichten bleiben unberührt.</p>
    </LegalSection>

    <LegalSection title="15. Inhalte, Rechte und Verantwortung">
      <p>Nutzer bleiben für ihre Inhalte, Angaben, Dateien und Nachrichten verantwortlich und gewährleisten, dass diese richtig, rechtmäßig, aktuell und frei von Rechten Dritter sind. Sie räumen dem Anbieter die für Speicherung, Sicherung, technische Verarbeitung, Prüfung, Darstellung, Suche und Matching innerhalb des Portals erforderlichen einfachen Nutzungsrechte für die Dauer des Nutzungsverhältnisses ein.</p>
      <p>Der Netzwerkadministrator ist verpflichtet, erkennbare Rechtsverletzungen in seinem Netzwerkbereich unverzüglich zu unterbinden und dem Anbieter zu melden. Der Anbieter darf rechtswidrige oder vertragswidrige Inhalte sperren oder entfernen und erforderliche Nachweise sichern.</p>
    </LegalSection>

    <LegalSection title="16. Datenschutz und Verantwortlichkeiten im Netzwerk">
      <p>Die Verarbeitung personenbezogener Daten durch den Anbieter richtet sich nach den jeweils einschlägigen Datenschutzhinweisen und gesetzlichen Vorgaben. Netzwerkadministrator und Mitgliedsunternehmen sind für die Rechtmäßigkeit der von ihnen eingegebenen, eingeladenen oder bereitgestellten personenbezogenen Daten verantwortlich.</p>
      <p>Soweit der Anbieter personenbezogene Daten nach dokumentierter Weisung eines Netzwerkbetreibers in dessen Auftrag verarbeitet, schließen die Parteien bei Erforderlichkeit eine Vereinbarung zur Auftragsverarbeitung. Soweit die Parteien Daten für eigene Zwecke verarbeiten, bleiben sie jeweils eigenständig datenschutzrechtlich verantwortlich.</p>
    </LegalSection>

    <LegalSection title="17. Zahlung, Rechnungen und Zahlungsverzug">
      <p>Rechnungen werden elektronisch bereitgestellt oder an die hinterlegte geschäftliche E-Mail-Adresse versendet. Entgelte sind zu dem in Rechnung oder Auftragsbestätigung genannten Termin ohne Abzug fällig. Der Nutzer ist für vollständige und aktuelle Rechnungsdaten verantwortlich.</p>
      <p>Bei Zahlungsverzug gelten die gesetzlichen Regelungen. Nach angemessener Mahnung darf der Anbieter kostenpflichtige Funktionen vorübergehend sperren. Vergütungsansprüche und Vertragslaufzeit bleiben hiervon unberührt. Aufrechnung und Zurückbehaltung sind nur mit unbestrittenen, rechtskräftig festgestellten oder aus demselben Vertragsverhältnis stammenden Ansprüchen zulässig.</p>
    </LegalSection>

    <LegalSection title="18. Verfügbarkeit, Wartung, Support und Änderungen">
      <p>Der Anbieter bemüht sich um eine hohe Verfügbarkeit, schuldet jedoch keinen unterbrechungsfreien Betrieb oder eine bestimmte Verfügbarkeit, sofern kein gesondertes Service-Level vereinbart wurde. Wartung, Updates, Sicherheitsmaßnahmen, höhere Gewalt, Internet- und Infrastrukturausfälle sowie Störungen außerhalb des Einflussbereichs können die Nutzung einschränken.</p>
      <p>Hosting, Wartung sowie Sicherheits- und Funktionsupdates sind beim gebuchten Netzwerkportal im beschriebenen Umfang enthalten. Individuelle Entwicklungen, Datenmigrationen, Schulungen, redaktionelle Leistungen, Fremdlizenzen und Anpassungen außerhalb des Standardumfangs sind nur enthalten, wenn sie ausdrücklich vereinbart wurden.</p>
    </LegalSection>

    <LegalSection title="19. Sperrung, Rollenentzug und außerordentliche Beendigung">
      <p>Bei Vertragsverstößen, falschen Angaben, fehlender Vertretungsbefugnis, Sicherheitsrisiken, Zahlungsverzug oder begründetem Missbrauchsverdacht darf der Anbieter Inhalte ausblenden, Rechte entziehen, Einladungen deaktivieren, Funktionen beschränken oder Konten und Netzwerkbereiche vorübergehend sperren.</p>
      <p>Vor einer dauerhaften Beendigung wird grundsätzlich Gelegenheit zur Stellungnahme gegeben, soweit Gefahr, zwingendes Recht oder die Schwere des Verstoßes nicht entgegenstehen. Ein wichtiger Grund liegt insbesondere bei fortgesetztem schwerwiegendem Missbrauch, strafbaren Inhalten, erheblicher Gefährdung des Portalbetriebs oder nachhaltigem Zahlungsverzug vor.</p>
    </LegalSection>

    <LegalSection title="20. Folgen der Vertragsbeendigung und Datenexport">
      <p>Nach Vertragsende werden kostenpflichtige Funktionen und Zugriffe deaktiviert. Der Netzwerkadministrator ist dafür verantwortlich, benötigte Daten und Dokumente rechtzeitig vor Vertragsende über bereitgestellte Exportfunktionen zu sichern. Ein bestimmtes Exportformat wird nur geschuldet, wenn es vereinbart oder im Portal angeboten wird.</p>
      <p>Daten werden anschließend nach Maßgabe gesetzlicher Aufbewahrungspflichten, berechtigter Nachweisinteressen und der Datenschutzhinweise gelöscht oder gesperrt. Anonymisierte Auswertungen dürfen weiterverwendet werden, sofern kein Personen- oder Unternehmensbezug mehr hergestellt werden kann.</p>
    </LegalSection>

    <LegalSection title="21. Haftung">
      <p>Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit, arglistigem Verschweigen eines Mangels, übernommener Garantie und nach zwingendem gesetzlichen Recht.</p>
      <p>Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen. Der Anbieter haftet im gesetzlich zulässigen Umfang nicht für Auswahlentscheidungen, Inhalte oder Angaben anderer Nutzer, interne Netzwerkentscheidungen und Verträge zwischen Nutzern.</p>
    </LegalSection>

    <LegalSection title="22. Preis- und Leistungsänderungen">
      <p>Änderungen von Preisen oder wesentlichen Leistungen für laufende kostenpflichtige Verträge werden mindestens sechs Wochen vor ihrem Wirksamwerden in Textform angekündigt und gelten frühestens für einen folgenden Verlängerungszeitraum. Bei einer für den Nutzer nachteiligen wesentlichen Änderung kann dieser zum Änderungszeitpunkt außerordentlich kündigen. Bloße Erweiterungen, technische Anpassungen und gesetzlich oder sicherheitsbedingt erforderliche Änderungen bleiben zulässig, soweit sie den Vertragszweck nicht unzumutbar beeinträchtigen.</p>
    </LegalSection>

    <LegalSection title="23. Änderungen dieser AGB">
      <p>Der Anbieter darf diese AGB mit Wirkung für die Zukunft ändern, wenn dies aufgrund geänderter Gesetze, Rechtsprechung, Sicherheitsanforderungen, technischer Entwicklungen oder einer Erweiterung des Portals erforderlich und für Nutzer zumutbar ist. Wesentliche Änderungen werden rechtzeitig in Textform mitgeteilt. Soweit eine ausdrückliche Zustimmung rechtlich erforderlich ist, wird diese gesondert eingeholt.</p>
    </LegalSection>

    <LegalSection title="24. Schlussbestimmungen">
      <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Erfüllungsort ist der Sitz des Anbieters. Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist – soweit gesetzlich zulässig – Leverkusen ausschließlicher Gerichtsstand.</p>
      <p>Vertragsrelevante Erklärungen können in Textform abgegeben werden, soweit keine strengere Form gesetzlich vorgeschrieben oder individuell vereinbart ist. Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt; an die Stelle der unwirksamen Regelung tritt die gesetzliche Regelung.</p>
    </LegalSection>
  </LegalPage>;
}
