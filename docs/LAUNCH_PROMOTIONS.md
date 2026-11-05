# Begrenzte kostenlose Startaktionen

Nur Plattformbetreiber können die Aktion beim Anlegen eines Netzwerks oder unter **Zahlungsdetails → Begrenzte Startaktion** konfigurieren. Anzahl der Plätze (1–100.000) und kostenlose Kalendermonate (1–24) sind pro Netzwerk einstellbar. Individuell beitragsfreie Zugänge bleiben eine separate Betreiberentscheidung.

Für Köln wird einmalig für künftige Buchungen aktiviert: 100 Plätze, sechs kostenlose Monate, danach zwölf Monate zu 19 Euro netto monatlich (228 Euro netto, 271,32 Euro brutto). Andere Netzwerke erhalten keine Aktion. Bereits akzeptierte Buchungen werden nicht verändert. Die Migration erstellt keine Mitglieder, Rechnungen oder E-Mails.

## Ablauf

1. Anfrage, E-Mail-Bestätigung und ggf. Betreiberfreigabe ändern den Zähler noch nicht.
2. Beim verbindlichen Beitritt müssen Rechnungsdaten, Preis, AGB, Zahlungsbedingungen und die automatische Verlängerung bestätigt werden. Erst dann wird serverseitig ein Platz zugeteilt. Eine Anfrage verspricht keinen bereits reservierten Platz.
3. Die Laufzeit beginnt am Beitrittstag (Kalenderdatum Europe/Berlin). Während der kostenlosen Anfangslaufzeit gibt es keine Rechnung. Die erste kostenpflichtige Laufzeit umfasst zwölf Monate.
4. Verlängerung im eigenen Konto bis einschließlich 16 Kalendertage vor Beginn der kostenpflichtigen Laufzeit ausschaltbar. Rechnung erst am Folgetag, also 15 Tage vor Beginn, mit 14 Tagen Zahlungsziel. Bei Widerspruch wird keine Folgebuchung und keine Rechnung angelegt.
5. Beispiel Beitritt am 05.11.2026: kostenlos bis einschließlich 04.05.2027; kostenpflichtig ab 05.05.2027; Ausschalten bis 19.04.2027; Rechnung am 20.04.2027, zahlbar bis 04.05.2027. Die regulären Folgejahre können ebenfalls rechtzeitig deaktiviert werden.

## Zähler und Schutz

PostgreSQL-Tabelle `b2b_launch_places`, unabhängig vom Portal-Snapshot. Die Zuteilung läuft in einer Transaktion mit Advisory Lock. Vor der Zuteilung wird die persistierte Netzwerkkonfiguration geprüft. Slot, Nutzerkennung und normalisierter Unternehmens-Hash sind eindeutig. Wiederholungen erzeugen keinen weiteren Platz; Löschen und erneutes Anlegen eines Portalzugangs setzt den Zähler nicht zurück. Es werden keine E-Mail-Adressen in dieses Ledger übernommen. Der Hash ersetzt keine Prüfung der Unternehmensidentität durch den Betreiber.

Bei ausgeschöpfter Aktion wird eine noch als kostenlos bestätigte Buchung abgelehnt. Sie wird niemals stillschweigend kostenpflichtig. Die Person muss die dann regulären Konditionen neu laden und bestätigen. Änderungen der Aktionsdauer oder Abschalten der Aktion erfordern ebenfalls eine erneute Bestätigung. Bereits vergebene Plätze können durch Bearbeiten der Zahlungsdetails nicht zurückgesetzt werden; die Obergrenze darf nicht unter die bereits vergebene Zahl abgesenkt werden.

Für die Aktion sind individuelle Zahlung, automatische Verlängerung, zwölf reguläre Monate und automatischer Rechnungsversand erforderlich. Feste Saison-/Datumszeiträume dürfen nicht parallel gesetzt sein. Deaktivierte Aktionen sind für neue Buchungen nicht mehr verfügbar; bereits zugesagte kostenlose Laufzeiten bleiben bestehen.

## Prüfung

Automatisierte Tests: Obergrenze, parallele Vergabe, Idempotenz, Netzwerkisolation, unterschiedliche Größen/Dauern, Versionswechsel, Preis-/Einwilligungsprüfung, Monatsenden, Rechnungszeitpunkt, Widerspruch und Betreiberrechte. Datenbankzugriffe werden in lokalen Tests simuliert; kein Test versendet reale E-Mails. Produktions-Abnahme nur lesend, ohne künstliche Belegung von Aktionsplätzen.
