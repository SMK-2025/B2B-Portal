import { LegalPage, LegalSection } from "../../components/legal-page";
export const metadata = {
  title: "Datenschutz bei Mailings",
  robots: { index: false },
};
export default function MailingPrivacy() {
  return (
    <LegalPage
      eyebrow="DATENSCHUTZ"
      title="Mailings und Einladungen"
      intro="Ergänzende Informationen für Empfänger unserer Netzwerk-Mailings."
      updated="4. November 2026"
    >
      <LegalSection title="Verantwortlicher und Kontakt">
        <p>
          Verantwortlich ist die Media Online Innovations Group, Inhaber Martin
          Kelm, Im Weidenblech 25, 51371 Leverkusen. Fragen, Widerrufe und
          Auskunftsersuchen richten Sie an service@b2b-matching.de.
        </p>
      </LegalSection>
      <LegalSection title="Einladungen und Kontaktdaten">
        <p>
          Wir verarbeiten geschäftliche Kontaktdaten, Unternehmen, Herkunft der
          Daten und dokumentierte Freigaben, um über unsere Netzwerke zu
          informieren. Werbe-E-Mails werden nur mit dokumentierter vorheriger
          Zustimmung versendet (Art. 6 Abs. 1 Buchst. a DSGVO). Eine öffentlich
          auffindbare E-Mail-Adresse gilt nicht als Zustimmung. Der Versand
          erfolgt über Twilio SendGrid als technischen Dienstleister; dabei
          werden E-Mail-Adresse, Nachricht und technische Versandkennungen
          verarbeitet. Es können Verarbeitungen in den USA stattfinden; hierfür
          sind ein Auftragsverarbeitungsvertrag und die einschlägigen
          Übermittlungsgarantien erforderlich. Informationen zu den tatsächlich
          vereinbarten Garantien stellen wir auf Anfrage bereit.
        </p>
      </LegalSection>
      <LegalSection title="Getrennte Freigabe für Auswertungen">
        <p>
          Nur bei zusätzlich dokumentierter Zustimmung werten wir
          personenbezogen aus, ob ein Bild abgerufen, einer der gekennzeichneten
          Links angeklickt oder die zugehörige Seite aufgerufen wurde. Bei
          anschließender Registrierung mit derselben E-Mail-Adresse im
          betreffenden Netzwerk können Registrierung und E-Mail-Bestätigung dem
          Mailing zugeordnet werden. Grundlage ist Art. 6 Abs. 1 Buchst. a DSGVO
          und, soweit erforderlich, die Einwilligung nach § 25 TDDDG. Wir
          verwenden dafür zufällige Kennungen in Links, keine Analyse-Cookies
          oder Geräte-Fingerabdrücke.
        </p>
        <p>
          Mailprogramme und Sicherheitsdienste können diese Signale automatisch
          auslösen. Bildabrufe sind kein Nachweis, dass eine Person eine
          Nachricht gelesen hat. Wir messen damit weder Aufenthaltsdauer noch
          Gesprächsinhalte. Erkannte automatisierte Aufrufe werden gesondert
          gekennzeichnet. Die Auswertung sieht ausschließlich der
          Plattformbetreiber.
        </p>
      </LegalSection>
      <LegalSection title="Widerruf und Speicherung">
        <p>
          Über den Abmeldelink jeder Werbemail können Sie weitere Werbe-Mailings
          abbestellen; dies beendet auch die künftige personenbezogene
          Auswertung. Nur die Auswertung können Sie gesondert über die oben
          genannte Adresse widerrufen. Notwendige Vertrags- und Kontonachrichten
          bleiben unberührt. Die Rechtmäßigkeit vor dem Widerruf bleibt
          bestehen.
        </p>
        <p>
          Einzelne Auswertungssignale werden im System längstens 180 Tage
          bereitgehalten. Kontaktdaten und Freigaben werden nur so lange
          benötigt, wie der jeweilige Zweck besteht oder ein Nachweis
          erforderlich ist. Gegen erneute unerwünschte Ansprache speichern wir
          eine nicht im Klartext lesbare Sperrkennung der E-Mail-Adresse.
          Betriebs- und Zustellinformationen dienen der Versandkontrolle und
          Fehlerbehebung.
        </p>
      </LegalSection>
      <LegalSection title="Ihre Rechte">
        <p>
          Sie haben die gesetzlichen Rechte auf Auskunft, Berichtigung,
          Löschung, Einschränkung, Datenübertragbarkeit und gegebenenfalls
          Widerspruch sowie das Recht auf Beschwerde bei einer
          Datenschutzaufsichtsbehörde. Weitere Informationen finden Sie in den{" "}
          <a href="/datenschutz/unternehmen">Datenschutzhinweisen zum Portal</a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
