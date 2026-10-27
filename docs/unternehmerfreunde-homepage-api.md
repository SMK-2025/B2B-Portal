# Öffentliche Homepage-API – Änderungsvorschlag

Stand: 27.10.2026. Keine Produktionsfreigaben gesetzt. Keine Buchungen, Rechnungen, Mitgliederkonten oder Finanzierungsmodelle geändert.

## Routen

- `GET /api/networks/homepage/unternehmerfreunde/feed`: anonyme, ausschließlich lesende öffentliche Projektion. Keine Mitgliedersitzung erforderlich oder zulässig als Integrationsvoraussetzung.
- `GET /api/networks/homepage/unternehmerfreunde/manage`: vorhandene Portal-Anmeldung und Netzwerkleitung oder Plattformadministration erforderlich.
- `POST /api/networks/homepage/unternehmerfreunde/{members|events|recaps}/{id}`: gleiche Berechtigungsprüfung; ID muss zum ausgewählten Netzwerk gehören. Body: `{ "enabled": true, "fields": ["title", "description"], "rightsConfirmed": true }`. Widerruf: `{ "enabled": false }`.
- Oberfläche: `/portal/netzwerk/unternehmerfreunde/veroeffentlichungen`, verlinkt in der Netzwerkverwaltung.

Andere Slugs ergeben 404. Die Freigabe gilt nur für das aktive Netzwerk `unternehmerfreunde`. Bestehende Freigaben innerhalb des geschlossenen Portals werden nicht migriert. Fehlendes `homepageGrants` bedeutet privat.

## Datenformat v1

Antwort: `{version:1, network:"unternehmerfreunde", generatedAt:ISO8601, members:[], events:[], recaps:[]}`. Jeder Eintrag enthält `id`, `network`, `publication:{enabled:true}`, `updatedAt` und nur ausgewählte erlaubte Felder. Keine ungefilterten Datenobjekte oder Profil-Spreads.

| Sammlung | Erlaubte Felder |
|---|---|
| members | title, description, industry, services, website, image, contact.email und contact.phone jeweils einzeln freigegeben; contact.public=true |
| events | title, description, image, startsAt, endsAt, timezone, location, organizer, terms, cost, registrationUrl, status |
| recaps | title, description, date, images |

Mitglieder werden aus aktiven Mitgliedschaften und veröffentlichten Unternehmensprofilen gelesen. Besucher und Netzwerkadministratoren werden nicht als öffentliche Mitglieder ausgegeben. Kontakte fehlen standardmäßig. Freigaben sind an die konkrete Netzwerkmitgliedschaft gebunden, nicht global an das Unternehmen.

Veranstaltungen und Rückblicke basieren auf vorhandenen Event-Datensätzen. Interne Verwaltungsveranstaltungen, Entwürfe und archivierte Einträge bleiben ausgeschlossen. Rückblicktext kommt aus `data.recapSummary`, Bilder aus `data.recapImages`. Es werden keine Teilnehmerlisten, Rückblick-Ergebnisnotizen, Nachrichten, Rollen, Zahlungsdaten oder internen IDs übertragen.

Die Veranstaltungsbearbeitung bietet ergänzende Datenfelder: `imageUrl`, `timezone`, `publicLocation`, `organizer`, `participationTerms`, `cost`, `registrationUrl`, `eventStatus`. Öffentlicher Ort ist bewusst getrennt vom internen Ort/Einwahllink. Bild, Titel, Beschreibung, Beginn, Zeitzone, öffentlicher Ort, Veranstalter, Bedingungen, Kosten und Status sind für die Freigabe Pflicht. Absagen bleiben als `cancelled` sichtbar; kein Anmeldebutton wird angezeigt. Änderungen werden aus den aktuellen Quelldaten gelesen.

Bilder: HTTPS-URLs oder bereits vorhandene Base64-PNG/JPEG/WebP bis 2 MB; keine SVG-/HTML-Data-URLs. Rückblicke maximal sechs Bilder. Rechte müssen ausdrücklich bestätigt werden. Für produktiven Betrieb werden optimierte Bilder auf einem freigegebenen Medienhost empfohlen; dessen Konfiguration ist noch abzustimmen. URL-Parameter mit Token, Passwort, Secret, Einladung oder Session werden ausgeschlossen.

## Freigaben und Widerruf

Neue Felder sind optional und privat. Vorhandene Persistenz speichert die Freigabe im jeweiligen Quell-Datensatz; vorhandener PersistenceInterceptor persistiert Änderungen. Jede Änderung schreibt ein internes Audit-Ereignis mit Bearbeiter, Zeitpunkt, Datensatz und Feldauswahl. Diese Metadaten werden nicht öffentlich geliefert. Netzwerkleitung bestätigt die dokumentierte Veröffentlichungsberechtigung; das Kontrollkästchen ersetzt keine tatsächliche Einwilligung oder sonstige Rechtsgrundlage.

`Cache-Control: no-store, max-age=0`, `CDN-Cache-Control: no-store`; Homepage verwendet serverseitiges `fetch(...,{cache:'no-store'})` und dynamische Seiten. Jeder neue Seitenaufruf liest den aktuellen Stand. Widerruf, Deaktivierung, Entwurf, Archivierung oder Löschung entfernt die Ausgabe beim nächsten Abruf. Bereits angezeigte, heruntergeladene oder bei Suchmaschinen gespeicherte Inhalte können nicht nachträglich aus fremden Geräten gelöscht werden. Es wird kein persistenter öffentlicher Cache und kein Webhook benötigt. API-Ausfall: leere Ausgabe mit Fehlerhinweis, niemals alte Daten weiterverwenden. Timeout 5 Sekunden; neuer Besucheraufruf versucht erneut. Kein stilles Wiederholen schreibender Vorgänge.

## Zugriffsschutz und Betrieb

Öffentliches Lesen benötigt keinen Schlüssel; es liefert ausschließlich freigegebene Inhalte. Die Homepage benötigt keine Mitglieder- oder Administratorsitzung. Änderungen ausschließlich im Portal, anhand der bestehenden Authentifizierung und serverseitig geprüfter Netzwerkleitung. Temporäres Rate-Limit: 120 Feed-Aufrufe je IP und Minute je API-Prozess, maximal 10.000 aktive IP-Buckets. Für mehrere API-Instanzen ist vor Rollout ein gemeinsamer Gateway-/Redis-Limiter erforderlich; bestehende PortalStore-Architektur muss ebenfalls auf konsistente Mehrinstanz-Persistenz geprüft werden. HTTPS am bestehenden Gateway beibehalten.

## Abnahme vor Bereitstellung

Backend und Portaloberfläche gemeinsam in einer isolierten Vorschau bereitstellen. Tests mit fiktiven Datensätzen durchführen: leerer Standard, einzelne Freigabe, falscher Mandant, private Kontakte, interne Veranstaltung, Änderung, Absage, Widerruf und API-Ausfall. Der Änderungsvorschlag setzt selbst keine echte Freigabe. End-to-End-Prüfung der produktiven externen API steht bis zu deren Bereitstellung aus. Kein automatisches Merge oder produktives Deployment.
