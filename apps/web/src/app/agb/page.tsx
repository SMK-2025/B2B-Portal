import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../components/legal-page";
export const metadata: Metadata = {
  title: "AGB für Partnerportale",
  description:
    "Nutzungs-, Rollen-, Modul- und Vertragsbedingungen für geschlossene Partnerportale auf B2B Matching.",
};
export default function Agb() {
  return (
    <LegalPage
      eyebrow="VERTRAGSBEDINGUNGEN"
      title="Allgemeine Geschäftsbedingungen"
      intro="Klare Regeln für geschlossene Partnerportale, Initiatoren und eingeladene Netzwerkpartner."
      updated="19. Oktober 2026"
    >
      <LegalSection title="1. Anbieter und Geltungsbereich">
        <p>
          Diese AGB gelten für die geschäftliche Nutzung der Partnerportale von
          B2B Matching. Anbieter ist Media Online Innovations Group, Inhaber
          Martin Kelm, Im Weidenblech 25, 51371 Leverkusen. Das Angebot richtet
          sich ausschließlich an Unternehmer im Sinne von § 14 BGB, juristische
          Personen des öffentlichen Rechts und öffentlich-rechtliche
          Sondervermögen.
        </p>
        <p>
          Individuelle Angebote und Auftragsbestätigungen gehen diesen AGB im
          Konfliktfall vor.
        </p>
      </LegalSection>
      <LegalSection title="2. Rollen">
        <p>
          <strong>Plattformbetreiber</strong> ist der Anbieter und besitzt die
          übergeordnete Hoheit über Mandanten, Konten, Rollen, Module und
          Sperrungen. <strong>Initiator</strong> ist die vom Netzwerk benannte
          verwaltende Person. Ein Initiator besitzt nicht automatisch eine
          eigene Partner-Unternehmensseite. <strong>Netzwerkpartner</strong> ist
          ein persönlich eingeladenes Unternehmen beziehungsweise dessen
          berechtigte Person.
        </p>
      </LegalSection>
      <LegalSection title="3. Geschlossenes Partnerportal">
        <p>
          Jedes Partnerportal ist ein logisch getrennter, nicht öffentlich
          auffindbarer Mandant. Mitglieder, Inhalte und Unternehmensseiten sind
          ausschließlich innerhalb des zugeordneten Netzwerks sichtbar. Eine
          eigenständige Netzwerkerstellung oder offene Registrierung ist
          ausgeschlossen.
        </p>
        <p>
          Der Anbieter schuldet keinen bestimmten wirtschaftlichen Erfolg, keine
          bestimmte Zahl von Kontakten und keinen Vertragsschluss zwischen
          Netzwerkpartnern.
        </p>
      </LegalSection>
      <LegalSection title="4. Einrichtung und Einladung">
        <p>
          Nur der Plattformbetreiber legt ein Netzwerk an und bestimmt den
          ersten Initiator. Initiatoren und Netzwerkpartner registrieren sich
          über persönliche, zeitlich begrenzte Einladungen. E-Mail-Adresse,
          Rolle und Netzwerkzuordnung werden aus der Einladung übernommen.
          Persönliche Zugänge dürfen nicht geteilt werden.
        </p>
      </LegalSection>
      <LegalSection title="5. Branding und Verwaltung">
        <p>
          Das Netzwerkbranding wird durch den Initiator beziehungsweise den
          Plattformbetreiber verwaltet. Partner können ihre eigene
          Unternehmensseite innerhalb dieses Netzwerks gestalten. Der Initiator
          verantwortet Einladungen und interne Inhalte. Die Netzwerkverwaltung
          durch den Initiator ist kostenlos.
        </p>
      </LegalSection>
      <LegalSection title="6. Persönliche Jahresmitgliedschaft und Preise">
        <p>
          Jedes eingeladene Partnermitglied bucht seinen eigenen Zugang
          einschließlich aller Portal-Funktionen für zwölf Monate. Der
          Standardpreis beträgt 69,00 Euro netto pro Monat, entsprechend 828,00
          Euro netto zuzüglich 157,32 Euro (19 %) Umsatzsteuer, insgesamt 985,32
          Euro brutto für zwölf Monate im Voraus. Der Plattformbetreiber kann je
          Netzwerk einen abweichenden Preis festlegen. Maßgeblich ist
          ausschließlich der bei der verbindlichen Buchung angezeigte und
          ausdrücklich bestätigte Preis. Spätere Preisänderungen wirken nicht
          rückwirkend auf bestehende Buchungen.
        </p>
        <p>
          Die Laufzeit beginnt mit der verbindlichen Buchung und sofortigen
          Freischaltung. Der Gesamtbetrag wird jährlich im Voraus berechnet. Die
          Rechnung wird anschließend manuell durch den Anbieter versendet; das
          Zahlungsziel ergibt sich aus der Rechnung. Eine Online-Abbuchung
          erfolgt nicht. Eine neue kostenpflichtige Laufzeit erfordert eine
          gesonderte Vereinbarung; es gibt keine automatische Verlängerung.
          Bestehende Konten werden durch diese Umstellung nicht ohne neue
          Buchung nachträglich kostenpflichtig.
        </p>
      </LegalSection>
      <LegalSection title="7. Nutzung und Inhalte">
        <p>
          Das Portal darf ausschließlich für rechtmäßige geschäftliche
          Netzwerkzwecke genutzt werden. Verboten sind insbesondere falsche
          Identitäten, Spam, Scraping, öffentliche Weitergabe persönlicher
          Einladungen, Schadsoftware, rechtswidrige Inhalte und die Umgehung von
          Rollen oder Mandantengrenzen.
        </p>
        <p>
          Nutzer bleiben für hochgeladene Inhalte, Dokumente, Bilder und
          Nachrichten verantwortlich und müssen über die erforderlichen Rechte
          verfügen.
        </p>
      </LegalSection>
      <LegalSection title="8. Kommunikation und Geschäfte">
        <p>
          Partnerprofile, Angebote, Nachrichten, Veranstaltungen und weitere
          Module dienen dem internen Austausch. Der Anbieter wird nicht Partei
          von Geschäften, Mitgliedschaften, Veranstaltungen oder sonstigen
          Vereinbarungen zwischen Netzwerk, Initiator und Partnern.
        </p>
      </LegalSection>
      <LegalSection title="9. Zahlung und Sperrung">
        <p>
          Bei Zahlungsverzug oder erheblichen Vertrags- beziehungsweise
          Sicherheitsverstößen kann der Plattformbetreiber betroffene
          Funktionen, Konten oder Mandanten sperren. Vergütungsansprüche und
          vereinbarte Laufzeiten bleiben unberührt.
        </p>
      </LegalSection>
      <LegalSection title="10. Verfügbarkeit und Änderungen">
        <p>
          Der Anbieter bemüht sich um eine hohe Verfügbarkeit, schuldet ohne
          gesondertes Service-Level jedoch keinen unterbrechungsfreien Betrieb.
          Wartung, Updates und sicherheitsbedingte Maßnahmen können die Nutzung
          vorübergehend einschränken. Funktionen dürfen weiterentwickelt werden,
          solange der wesentliche Vertragszweck gewahrt bleibt.
        </p>
      </LegalSection>
      <LegalSection title="11. Vertragsende und Löschung">
        <p>
          Nach Vertragsende werden Zugriffe deaktiviert. Benötigte Daten sind
          rechtzeitig über angebotene Exportmöglichkeiten zu sichern. Bei einer
          endgültigen Mandantenlöschung werden zugehörige Konten,
          E-Mail-Zuordnungen, Unternehmen, Einladungen, Sitzungen und Inhalte
          nach Maßgabe gesetzlicher Aufbewahrungspflichten gelöscht.
        </p>
      </LegalSection>
      <LegalSection title="12. Haftung und Schlussbestimmungen">
        <p>
          Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit,
          Verletzung von Leben, Körper oder Gesundheit und nach zwingendem
          Recht. Bei leicht fahrlässiger Verletzung wesentlicher
          Vertragspflichten ist die Haftung auf den vorhersehbaren,
          vertragstypischen Schaden begrenzt.
        </p>
        <p>
          Es gilt deutsches Recht. Ist der Nutzer Kaufmann oder eine juristische
          Person des öffentlichen Rechts, ist Leverkusen – soweit zulässig –
          Gerichtsstand.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
