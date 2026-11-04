# Betreiber-Mailings

Der Bereich `/portal/admin/mailings` ist ausschließlich für `platform_admin` zugänglich. Alle Kampagnen und Kontakte sind netzwerkbezogen. Der Entwurf für Leverkusen ist vorbereitet; weder ein Deployment noch ein Import startet einen Versand.

## Versand und Auswertung

- CSV: E-Mail/email, Vorname/firstName, Nachname/lastName, Unternehmen/company/Firma. Semikolon oder Komma; höchstens 500 Kontakte / 1 MB.
- Import ohne Zustimmung ist möglich, aber nicht der Versand. Versand- und personenbezogene Trackingfreigabe werden mit Zeitpunkt und Nachweis getrennt dokumentiert. Eine öffentliche Adresse oder eine pauschale Annahme ist kein Nachweis.
- Vorschau versendet nichts und enthält keine Empfängerkennungen. „Test an mich“ erfordert einen ausdrücklichen Klick und geht nur an die authentifizierte Betreiberadresse.
- Jeder produktive Versandlauf verlangt den aktuellen Mailingnamen, die Revision und den aktuellen Empfängerumfang. Maximal 20 Empfänger pro Lauf, 200 pro UTC-Tag. Nach jedem Lauf kann der Rest geprüft und erneut freigegeben werden. Keine Hintergrund- oder Wiederholungsmailings.
- Vor jedem Versand wird eine eindeutige Empfängerzustellung dauerhaft reserviert. Unklare Zustände werden nicht automatisch wiederholt. Ein gestarteter Entwurf kann nicht geändert werden. Die bestehende PortalState-Persistenz unterstützt einen API-Prozess; vor horizontaler Skalierung ist eine transaktionale Outbox mit datenbankweiten Zustellschlüsseln erforderlich.
- Eigene Links erfassen getrennt Homepage, Netzwerk-Landingpage und Registrierungsaufruf. Nur die fest hinterlegten eigenen Ziele werden weitergeleitet; keine offenen Weiterleitungen.
- Bildabrufe sind keine Lesebestätigungen. Automatisierte Aufrufe werden nach erkennbaren Merkmalen getrennt angezeigt, sind aber nicht vollständig erkennbar. Keine Aussage über Aufenthaltsdauer oder sicher identifizierte Leser.
- Weiterleitung zur Registrierung verwendet eine zufällige Kennung, keine Cookies oder Fingerabdrücke. Seitenaufrufe und Weitergabe dieser Kennung erfordern zusätzlich eine aktive Marketingfreigabe in der bestehenden Browser-Datenschutzentscheidung. Der Server prüft weiterhin die separat dokumentierte Trackingfreigabe. Ein Ablehnen im Browser verhindert die weitere Zuordnung.
- Registrierung zählt nur für dieselbe Empfängeradresse und dasselbe Netzwerk, danach wird die bestätigte E-Mail gesondert angezeigt. „Bestätigt“ ist keine Mitgliedschaftsfreigabe. Weitergeleitete E-Mails können keine sichere Personenzuordnung erlauben.
- Detailereignisse werden nach 180 Tagen bei der nächsten stündlichen Bereinigung oder Abfrage entfernt. Gesperrte Adressen werden als SHA-256-Sperrkennung vor erneutem Werbeversand geschützt. Abmeldung gilt global für Betreiber-Mailings, nicht für notwendige Vertragsnachrichten.

## Produktionskonfiguration

Bestehender Versand: `SENDGRID_API_KEY`, `MAIL_FROM_EMAIL`, optional `MAIL_FROM_NAME`, `MAIL_REPLY_TO`.

Öffentliche Webadresse: `PUBLIC_WEB_URL` (bestehende Web-Origin-Konfiguration wird ersatzweise verwendet).

Öffentliche API-Adresse: `PUBLIC_MAILING_API_URL`, ersatzweise `PUBLIC_API_URL` oder die von Railway bereitgestellte `RAILWAY_PUBLIC_DOMAIN`. Ohne gültige HTTPS-Adresse ist kein Produktivversand möglich, da sonst auch die Abmeldung nicht funktionieren könnte.

### Zustell- und Rückläufermeldungen

Im SendGrid-Konto einen **signierten Event Webhook** für `https://<öffentliche-api>/api/mailings/public/webhook` konfigurieren. Die Events `delivered`, `bounce`, `dropped`, `deferred`, `spamreport` aktivieren. Bestehende, eventuell gemeinsam genutzte Webhooks nicht unbesehen überschreiben.

Den Base64-DER-Public-Key des Webhooks als `SENDGRID_EVENT_PUBLIC_KEY` im API-Dienst hinterlegen. Es handelt sich um einen öffentlichen Signaturprüfschlüssel, nicht um den Versand-API-Key. Anschließend API neu bereitstellen. Ohne diesen Schritt werden keine Zustellmeldungen akzeptiert; die Oberfläche weist darauf hin. „Übergeben“ bedeutet ausschließlich, dass der Maildienst den Auftrag akzeptiert hat, nicht Posteingang oder Lektüre.

Die API prüft Signatur auf Zeitstempel + unverändertem Rohkörper, maximal fünf Minuten Zeitabweichung und einmalige Provider-Ereigniskennungen. Provider-seitiges Open/Click-Tracking bleibt deaktiviert. Rückläufer und Spam-Meldungen sperren die Adresse für weiteren Werbeversand.

## Tests ohne Versand

- `node apps/api/node_modules/vitest/vitest.mjs run --root apps/api`
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.build.json`
- `node apps/api/tests/mailings-http.mjs`

Der HTTP-Test startet eine isolierte lokale API ohne Datenbank. Der Maildienst ist vollständig ersetzt. Nie mit einer produktiven Instanz verbinden. Die Browserprüfung wurde mit simulierten Kontakten und gesperrten echten Versand-Endpunkten auf Desktop, Tablet und Mobil durchgeführt.
