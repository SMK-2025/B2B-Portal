export const MARKETING_PAGES = {
  vorteile: {
    label: "Ihre Vorteile",
    title: "Ein Netzwerk, das im Alltag weiterhilft.",
    eyebrow: "Mehr aus Ihren Kontakten machen",
    description:
      "Unternehmen sichtbar machen, passende Leistungen finden und direkt miteinander sprechen – ohne auf den nächsten Netzwerktreffen-Termin zu warten.",
  },
  "fuer-wen": {
    label: "Für wen?",
    title: "Für Unternehmen. Und die Menschen, die sie verbinden.",
    eyebrow: "Der passende Zugang für Ihr Vorhaben",
    description:
      "Sie möchten Geschäftskontakte knüpfen? Oder ein eigenes Netzwerk betreiben? Entdecken Sie, welcher Einstieg zu Ihnen passt.",
  },
  netzwerke: {
    label: "Netzwerke",
    title: "Ihr Unternehmernetzwerk vor Ort.",
    eyebrow: "50 Stadtseiten. Eigene Mitgliederbereiche.",
    description:
      "Wählen Sie Ihre Stadt und lernen Sie das zugehörige Unternehmernetzwerk kennen. Jedes Netzwerk bleibt eigenständig – mit eigenen Mitgliedern und Inhalten.",
  },
  funktionen: {
    label: "Funktionen",
    title: "Nicht nur Kontakte sammeln. Miteinander etwas anfangen.",
    eyebrow: "Die Funktionen Ihres Netzwerkportals",
    description:
      "Von der eigenen Unternehmensseite über die Suche bis zum persönlichen Chat: So wird aus einem Verzeichnis ein Ort für Austausch und Zusammenarbeit.",
  },
  "so-funktionierts": {
    label: "So funktioniert’s",
    title: "Von der Anmeldung zum ersten Gespräch.",
    eyebrow: "Ihr Einstieg, Schritt für Schritt",
    description:
      "Hier erfahren Sie, wie Sie Mitglied in einem Stadtnetzwerk werden – und wie wir ein eigenes Portal für Ihre Organisation einrichten.",
  },
  fragen: {
    label: "Fragen",
    title: "Was Sie vor dem Start wissen möchten.",
    eyebrow: "Antworten zu Mitgliedschaft und Portal",
    description:
      "Kosten, Zugang, Unternehmensseite und vertrauliche Gespräche: Hier finden Sie die wichtigsten Antworten ohne lange Suche.",
  },
  "eigenes-portal": {
    label: "Eigenes Portal",
    title: "Ihr Netzwerk verdient einen eigenen digitalen Ort.",
    eyebrow: "White Label. Ihre Marke. Ihre Kontrolle.",
    description:
      "Verbinden Sie Ihre Mitglieder in einem eigenen Netzwerkportal. Mit Ihrem Logo, Ihren Farben und den Funktionen, die zu Ihrer Gemeinschaft passen – auf Wunsch mit einer gemeinsam entwickelten Homepage.",
  },
  sicherheit: {
    label: "Sicherheit",
    title: "Persönlich vernetzt. Klar voneinander getrennt.",
    eyebrow: "Zugang, Rollen und vertraulicher Austausch",
    description:
      "Ein Netzwerkportal braucht klare Grenzen: Wer gehört dazu, wer darf etwas ändern und wer kann ein Gespräch lesen? So ist der Zugang zu B2B Matching aufgebaut.",
  },
} as const;
export type MarketingPageKey = keyof typeof MARKETING_PAGES;
export const MARKETING_NAV: MarketingPageKey[] = [
  "vorteile",
  "fuer-wen",
  "netzwerke",
  "funktionen",
  "so-funktionierts",
  "fragen",
];
export function marketingPage(value: string): MarketingPageKey | null {
  return Object.hasOwn(MARKETING_PAGES, value)
    ? (value as MarketingPageKey)
    : null;
}
export function marketingHref(prefix: string, page: MarketingPageKey) {
  return `${prefix}/${page}`;
}
export const MARKETING_FAQS = [
  {
    group: "Mitgliedschaft",
    question: "Was ist ein Stadtnetzwerk bei B2B Matching?",
    answer:
      "Ein eigener digitaler Mitgliederbereich für Unternehmen einer Stadt. Sie stellen Ihr Unternehmen vor, entdecken Leistungen und kommen mit anderen Mitgliedern ins Gespräch. Es ist kein Angebot der Stadtverwaltung.",
  },
  {
    group: "Mitgliedschaft",
    question: "Sind die Stadtnetzwerke miteinander verbunden?",
    answer:
      "Nein. Jede Stadt hat einen eigenen Mitgliederbereich. Unternehmensseiten, Inhalte und Gespräche werden nicht mit anderen Netzwerken vermischt. Eine Mitgliedschaft ist kein automatischer Zugang zu allen Städten.",
  },
  {
    group: "Mitgliedschaft",
    question: "Wie kann ich teilnehmen?",
    answer:
      "Wählen Sie Ihre Stadt, fragen Sie die Mitgliedschaft an und bestätigen Sie Ihre E-Mail-Adresse. Nach Prüfung und Freigabe schließen Sie die Buchung zu den dann angezeigten Konditionen ab. Die Anfrage allein löst noch keine Rechnung aus.",
  },
  {
    group: "Kosten",
    question: "Was kostet die Mitgliedschaft?",
    answer:
      "Die Stadtmitgliedschaft beginnt standardmäßig bei 9,90 € netto pro Monat für zwölf Monate. Sie können freiwillig mehr zahlen; der Zugang zu den im Netzwerk aktivierten Funktionen bleibt für alle gleich. Vor der verbindlichen Buchung sehen Sie den Jahresbetrag, Umsatzsteuer und Gesamtbetrag. Maßgeblich sind die im jeweiligen Netzwerk vor Vertragsschluss ausgewiesenen Konditionen. Bestehende Buchungen bleiben unverändert.",
  },
  {
    group: "Kosten",
    question: "Was bewirkt ein freiwillig höherer Beitrag?",
    answer:
      "Der Mehrbeitrag unterstützt zusätzliche B2B-Kampagnen und die Mitgliedergewinnung für genau Ihr Stadtnetzwerk. Netzwerke mit mehr zusätzlichem Budget können bei der Bewerbung stärker berücksichtigt werden und ihre Reichweite ausbauen. Sie kaufen damit kein zusätzliches Funktionspaket und keine bessere persönliche Platzierung. Neue Mitglieder, Kontakte oder Aufträge sind nicht garantiert.",
  },
  {
    group: "Kosten",
    question: "Gibt es kostenlose Startmonate?",
    answer:
      "Eine Startaktion gilt nur, wenn sie für das gewählte Netzwerk aktuell angeboten und bei der Anmeldung bestätigt wird. Bereits zugesagte oder gebuchte Konditionen bleiben erhalten. Ohne angezeigte Aktion entstehen keine zusätzlichen kostenlosen Monate.",
  },
  {
    group: "Kosten",
    question: "Wird der Monatsbeitrag monatlich abgebucht?",
    answer:
      "Ein ausgewiesener Monatsbeitrag beschreibt den Preis pro Monat, nicht automatisch eine monatliche Zahlungsweise. Vor dem Abschluss sehen Sie den Gesamtbetrag und die vereinbarte Abrechnung. Bei einer Jahresbuchung wird der Jahresbetrag im Voraus berechnet.",
  },
  {
    group: "Im Portal",
    question: "Wie entsteht meine Unternehmensseite?",
    answer:
      "Sie tragen Ihre Unternehmensangaben ein oder lassen mit PagePilot AI einen Entwurf aus Ihrer bestehenden Homepage vorbereiten. Sie prüfen und ergänzen den Inhalt und veröffentlichen Ihre Seite selbst. Ein Entwurf ist noch kein veröffentlichter Auftritt.",
  },
  {
    group: "Im Portal",
    question: "Kann die Netzwerkleitung meine privaten Chats mitlesen?",
    answer:
      "Private Gespräche sind für die jeweiligen Gesprächsteilnehmer bestimmt. Die Netzwerkleitung wird einem Gespräch nicht automatisch hinzugefügt. Veröffentlicht werden keine Chat-Inhalte, sondern nur die dafür vorgesehenen freigegebenen Angaben.",
  },
  {
    group: "Im Portal",
    question: "Was kann ich im Netzwerk veröffentlichen?",
    answer:
      "Sie können Ihr Unternehmen, Leistungen sowie Angebote und Gesuche vorstellen. Neuigkeiten und Veranstaltungen ergänzen den Austausch. Welche Bereiche im jeweiligen Netzwerk genutzt werden, bestimmt die Netzwerkleitung.",
  },
  {
    group: "Im Portal",
    question: "Sind passende Kontakte oder Aufträge garantiert?",
    answer:
      "Nein. Welche Kontakte entstehen, hängt von den teilnehmenden Unternehmen und dem gemeinsamen Austausch ab. Ein Portal kann das Kennenlernen erleichtern, aber keine bestimmte Mitgliederzahl, Kooperation oder einen Auftrag garantieren.",
  },
  {
    group: "Eigenes Portal",
    question: "Kann mein Netzwerk unter unserer eigenen Marke auftreten?",
    answer:
      "Ja. Ein eigenes Portal kann mit Ihrem Netzwerknamen, Logo und Ihren Farben gestaltet werden. Die Mitglieder und Inhalte bleiben von anderen Netzwerken getrennt. Auf Wunsch entwickeln wir gemeinsam eine passende öffentliche Homepage.",
  },
  {
    group: "Eigenes Portal",
    question: "Wer bestimmt, welche Funktionen genutzt werden?",
    answer:
      "B2B Matching stellt die Funktionen bereit. Die Netzwerkleitung entscheidet, welche davon im eigenen Netzwerk aktiviert oder deaktiviert werden. So bleibt der Mitgliederbereich passend zu Ihrer Gemeinschaft.",
  },
  {
    group: "Eigenes Portal",
    question: "Ist das eigene Portal im Stadtmitgliedsbeitrag enthalten?",
    answer:
      "Nein. Eine Mitgliedschaft in einem Stadtnetzwerk und der Betrieb eines eigenen Netzwerkportals sind zwei unterschiedliche Angebote. Die Einrichtung und Konditionen eines eigenen Portals besprechen wir mit Ihnen individuell.",
  },
] as const;
