# Befristete Mitgliedschaften und Startaktionen

Seit 05.11.2026 werden Mitgliedschaften in allen Netzwerken nicht automatisch verlängert. Neue Einstellungen und Buchungen erzwingen autoRenew=false. Eine einmalige Migration deaktiviert bestehende Verlängerungen, ohne Preise, vereinbarte Enddaten oder ausgestellte Rechnungen zu ändern. Unberechnete zukünftige Folgebuchungen werden gestoppt. Der Rechnungsdienst erstellt keine Verlängerungsbuchungen, auch nicht bei veralteten Daten.

Der Zugang endet am vereinbarten Laufzeitende. Nutzerkonten und Rechnungshistorie werden dadurch nicht gelöscht. Bestehende initiale Zahlungsverpflichtungen und deren Rechnungsversand bleiben unverändert. Spätere Verlängerungs-Mailings sind nicht Teil dieser Umsetzung.

## Begrenzte Startaktionen

Nur Plattformbetreiber konfigurieren unter Zahlungsdetails die Anzahl kostenloser Plätze (1–100.000) und Kalendermonate (1–24). Köln: 100 Plätze, sechs kostenlose Monate. Andere Netzwerke erhalten nicht automatisch eine Aktion. Öffentliche Angebote zeigen keinen Belegungszähler.

Anfrage und E-Mail-Bestätigung reservieren keinen Platz. Erst beim verbindlichen Beitritt mit Unternehmensangaben, geschäftlicher Berechtigung und AGB-Bestätigung erfolgt die atomare Zuteilung. Für kostenlose Startmitgliedschaften werden keine Rechnungsdaten, Zahlungs- oder Verlängerungszustimmungen verlangt und keine Rechnungen versendet. Die kostenlose Laufzeit beginnt am Beitrittstag (Europe/Berlin). Beispiel: Beitritt am 05.11.2026, Ende nach sechs Monaten am 05.05.2027; nutzbar bis einschließlich 04.05.2027.

PostgreSQL-Ledger b2b_launch_places: Advisory Lock, eindeutige Slot-/Nutzer-/Unternehmenszuordnung, kein Zurücksetzen bei Accountlöschung. Bei ausgeschöpfter oder geänderter Aktion wird eine kostenlose Buchung nicht stillschweigend kostenpflichtig. Die geänderten Konditionen müssen neu bestätigt werden. Bereits zugeteilte Laufzeiten bleiben unverändert.

Die Aktion ist für individuell zahlende Netzwerke ohne feste Datumszeiträume verfügbar. Tests prüfen Obergrenzen, parallele Vergabe, Monatsenden, Netzwerkisolation, kostenlose Buchung ohne Rechnungsdaten und das Ausbleiben automatischer Folgerechnungen. Tests versenden keine echten E-Mails und belegen keine produktiven Plätze.
