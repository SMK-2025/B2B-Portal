# Prüfung der öffentlichen Partnerportal-Website

Stand: 12. Oktober 2026. Umfang: öffentliche Marketingseiten, sieben Zielgruppen-Landingpages, Rechtstexte-Metadaten und Zugangsseiten-Indexierung. Keine erneute Vollprüfung der angemeldeten Mandantenfunktionen oder rechtliche Freigabe der Rechtstexte.

## Positionierung und Inhalte

- Partnerportal für bestehende Netzwerke, kein öffentlicher Marktplatz für Einzelunternehmen oder Dienstleister.
- Sieben unterschiedliche Zielgruppen mit eigenen Anwendungsfällen, Erklärungen, FAQ und Abschluss-CTAs.
- Keine identischen längeren Absätze (>140 Zeichen) zwischen den sieben Landingpages im gerenderten Vergleich. Navigation und grundlegende Zugangshinweise bleiben bewusst konsistent.
- Doppelte Ergebnisüberschriften und austauschbare Abschlussblöcke bereinigt; fehlerhafte Formulierung „Möglichkeiten hintereinander“ korrigiert.
- Dekorative Hintergrundmotive werden innerhalb derselben Kachelgruppe nicht wiederholt. Ohne passende thematische Zuordnung wird kein beliebiges Ersatzsymbol angezeigt.

## SEO und maschinelle Verständlichkeit

- Individuelle Titel, Beschreibungen, Canonicals, Open Graph und Twitter Cards.
- Einheitliches 1200 × 630 PNG mit dem Schmetterlings-Markensymbol für geteilte Links; Browsericon ebenfalls Schmetterling.
- FAQ-Strukturdaten entsprechen sichtbaren Fragen; BreadcrumbList auf den Zielgruppenseiten.
- Sitemap enthält öffentliche Seiten und keine Partnerportale; künstlich tagesaktuelle lastModified-Angaben entfernt.
- Login, Registrierung, Bestätigung, Passwortwege, Einladungen und Portal erhalten noindex/no-follow-Kennzeichnung. Dies ersetzt keine Authentifizierung.
- Inhalte und relevante Metadaten werden serverseitig ausgegeben, nicht erst nach Animation oder Mausinteraktion.

## Prüfergebnisse

- Produktionsbuild: erfolgreich, einschließlich Typprüfung.
- `scripts/audit-public-seo.mjs`: 17 Seiten, 25 interne Ziele, H1-Anzahl, eindeutige Titel, Beschreibungen, Canonicals, Social-Metadaten, JSON-LD-Parsing, Sitemap, PNG-Endpunkt und noindex-Header erfolgreich.
- Browser: zwölf Marketingseiten bei 390, 900 und 1440 Pixeln, insgesamt 36 Fälle; keine Seiten- oder Überschriftenüberläufe im abschließenden DOM-Test.
- Mobiles Menü geöffnet visuell geprüft: lange Bezeichnungen, scrollbarer Inhalt, Auswahl schließt Menü, Escape schließt Menü und gibt Fokus zurück.
- Desktop-Hero der Wirtschaftsnetzwerk-Seite: 800 Pixel; vier unterschiedliche Nutzenmotive bestätigt.

## Grenzen und nächste externe Prüfungen

Indexierung, Rankings und KI-Zitate werden nicht durch Änderungen garantiert. Search Console und Bing Webmaster Tools sollten für Crawling, Indexierung, Suchanfragen und KI-Zitate geprüft werden; diese Konten wurden hier nicht verbunden oder geändert. Keine realen Core-Web-Vitals-Messwerte oder externen Rich-Results-Prüfungen behauptet. Social-Plattformen können alte Vorschaubilder zwischenspeichern.

Referenzen: Google Search Central „AI features and your website“ und Bing Webmaster Guidelines. Klassische technische Zugänglichkeit und hilfreiche, nachvollziehbare Inhalte sind die Grundlage; kein erfundenes spezielles GEO-Schema.
