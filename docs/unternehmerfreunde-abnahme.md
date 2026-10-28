# Abnahme und Betrieb der öffentlichen Homepage-Anbindung

## Ergänzung aus der Portal-Prüfung am 28.10.2026

- Mit dem aktuellen Portal-Hauptstand konfliktfrei zusammengeführt und lokal geprüft, noch nicht produktiv ausgerollt.
- 68 API-Tests, API-Build, Web-Typprüfung und Next-Produktionsbuild erfolgreich. HTTP-Test mit synthetischen Konten erfolgreich; keine echte Datenbank verwendet.
- Die Profilfreigabe verlangt in der Oberfläche vor dem Speichern eine Vorschau der aktuellen Feldauswahl. Gestaltung an das Portal angepasst.
- Eigene Zustimmung kann auch bei gesperrtem Netzwerk widerrufen werden. Erneute Veröffentlichung erfordert weiterhin ein aktives Netzwerk.
- Kostenlose Netzwerkadministratoren bleiben ohne öffentliche Unternehmensseite.
- Profilkopien in zentral finanzierten Netzwerken werden als zentral finanziert angelegt. Keine öffentliche Zustimmung wird kopiert; Quellprofile und bestehende Rechnungen bleiben unverändert.
- Staging, echte PostgreSQL-Wiederanlaufprüfung und Homepage-Endabnahme bleiben ausdrücklich offen. Produktive Freigaben echter Profile sind kein Ersatz dafür.

Stand: 28.10.2026. Dieser Bericht ersetzt frühere Aussagen zu administratorseitiger Profilfreigabe und Base64-Bildern im öffentlichen Feed.

## Status: vier getrennte Ebenen

| Ebene | Nachweis |
|---|---|
| Implementiert | Mitgliedseigene Zustimmung pro Mitgliedschaft, Feldwahl, authentifizierte Vorschau, Widerruf; separate Verwaltungsausblendung; redaktionelle Termine/Rückblicke; gemeinsames v1-Schema; gesonderte Bildausgabe mit erneuter Freigabeprüfung; technische Fehlerzustände. |
| Automatisiert lokal geprüft | Homepage-Einzeltests und HTTP-Prüfungen; Portal-Einzeltests; echte Nest/Express-HTTP-Anfragen mit Passwortlogin, Sitzungen und produktiver Middleware; lokale Portal→Homepage-Verbindung mit synthetischen Daten. |
| Durchgängig im Staging nachgewiesen | OFFEN. Es gibt laut Nutzer keine isolierte Portal-Staging-Instanz und keine eigene Testdatenbank. Keine Staging-URL wird erfunden. |
| Produktiv freigegeben | NEIN. Benannter Railway-Feed lieferte bei erneuter Prüfung am 28.10.2026 HTTP 404; Portal-PR #2 war offen und Draft. Kein Merge, kein Portal-Deployment und keine echten Profilfreigaben in dieser Arbeit. |

## Versionierter Vertrag und Fehlerverhalten

Verbindliche JSON-Schema-Dateien: Homepage `contracts/homepage-v1.json`, Portal `apps/api/src/networks/contracts/homepage-v1.json`. Sie sind bytegleich; der lokale Verbindungstest prüft dies. Änderungen nur synchron in beiden Repositories; inkompatible Änderungen brauchen eine neue Version. Runtime-Validatoren prüfen die im Schema verwendeten Regeln (Typ, const/enum, Pflichtfelder, Stringlänge/Pattern, Arraygröße und Objektfelder). Es ist kein allgemeiner JSON-Schema-Interpreter für zusätzliche bisher ungenutzte Schlüsselwörter.

Version 1 enthält `version:1`, `network:"unternehmerfreunde"` und zwingend die Arrays `members`, `events`, `recaps`. IDs sind innerhalb einer Sammlung eindeutig und URL-sicher, maximal 100 Zeichen. Name und Beschreibung sind nichtleere Strings. Branche und Leistungen bleiben STRINGS. Zusätzliche unbekannte Eingabefelder werden nicht öffentlich weitergereicht. Herobild, Kurzbeschreibung und weitere Profilabschnitte sind noch nicht zur Veröffentlichung vorgesehen; sie werden nicht stillschweigend übernommen. Allgemeine öffentliche Neuigkeiten sind weiterhin eine offene Erweiterung in Portal UND Homepage und dürfen nicht aus internen Meldungen abgeleitet werden.

- Gültiger Feed mit leeren Arrays: normale leere Übersicht (200), fehlende Detailseite 404.
- Gültiger Feed nach Widerruf/Löschung: betreffende Detailseite 404 und Entfernung aus Sitemap.
- Fehlende Konfiguration, Timeout, nicht erfolgreiche HTTP-Antwort, falscher Content-Type, nicht parsebares JSON oder strukturell ungültiger Gesamtvertrag: technischer Fehler.
- Ungültiger einzelner Datensatz: eigener interner Fehlercode; konservativ wird die komplette Antwort nicht angezeigt. So wird ein kaputter Datensatz nicht als gelöschtes Profil ausgegeben. Keine stille Teilantwort. Doppelte IDs sind ebenfalls Vertragsfehler.
- Homepage: feedabhängige Start-, Übersichts- und Detailseiten liefern bei diesen Fehlern HTTP 500; Sitemap ebenfalls 500, auch wenn die Veröffentlichung noch gesperrt ist. Statische Kontaktseite bleibt 200. Next-Metadaten werden vor dem Antwortbeginn aufgelöst; Statuscodes wurden am Produktionsbuild geprüft. Der Besucher erhält eine allgemeine Meldung ohne interne Ursache.
- Kein alter Ersatzfeed, keine erfundene leere Sitemap. Ein gültiger Feed bei ausgeschalteter Indexierung liefert bewusst eine leere Sitemap.
- Antwortgröße maximal 1.000.000 Bytes; bis 1.000 Datensätze je Sammlung. Größere Bestände benötigen künftig einen abgestimmten paginierten Vertrag, keine stille Kürzung.

## Bedienung: Mitglieder

1. Als Mitglied im Netzwerk `unternehmerfreunde` anmelden und **Meine Partnerseite** öffnen: `/portal/netzwerk/unternehmerfreunde/profil`.
2. Das bestehende Formular pflegt Unternehmensprofil, Branche, Leistungen und Logo im geschlossenen Portal. Öffentliche zusätzliche Profilabschnitte sind noch nicht vorgesehen.
3. Im darunterliegenden Bereich **Mein Profil auf der öffentlichen Homepage** einzelne Felder wählen. Standard: keine Zustimmung und keine ausgewählten Felder. Alte Verwaltungsfreigaben werden hier nicht als Zustimmung anerkannt.
4. **Öffentliche Vorschau prüfen** zeigt nur die ausgewählten Daten. Sie speichert keine Zustimmung und ist nur für das zugehörige Mitglied abrufbar. Ein Logovorschaubild darf hierfür im authentifizierten Antwortkörper enthalten sein; der öffentliche Feed enthält es nie als Base64.
5. Veröffentlichungsrechte/Zustimmung bestätigen und **Meine Freigabe speichern**. Zustimmung wird serverseitig an Benutzer-ID UND Mitgliedschafts-ID gebunden. Andere Mitgliedschaften desselben Unternehmens werden dadurch nicht freigegeben.
6. **Jederzeit widerrufen** benötigt keine erneute Rechtebestätigung. Öffentliche Seiten und Bilder entfallen beim nächsten Abruf. Bestehende Suchmaschinenkopien und bereits offene Seiten lassen sich damit nicht rückwirkend löschen.

Änderungen an bereits freigegebenen Feldern des vorhandenen Unternehmensprofils werden anschließend öffentlich wirksam. Das Profil ist in der bestehenden Architektur unternehmensbezogen und kann von berechtigten Unternehmensadministratoren bearbeitet werden. Zustimmung und Ausblendung sind hingegen mitgliedschaftsbezogen. Diese Unterscheidung ist im Staging besonders mit Mehrfachmitgliedschaften zu prüfen.

## Bedienung: Netzwerkleitung/Redaktion

- **Veranstaltungen und Treffen**: `/portal/netzwerk/unternehmerfreunde/veranstaltungen`. Im Editor eigener Abschnitt für öffentliche Angaben: Zeitzone, öffentlicher Ort, Veranstalter, Bedingungen, Kosten, Status, Format, strukturierte Anschrift, frühere Zeit bei Verlegung und optionaler öffentlicher Anmeldelink. Öffentliches Bild als PNG/JPEG/WebP hochladen, maximal 1,5 MB. Bestehende externe Bildadressen sind nicht öffentlich zugelassen.
- **Veranstaltungsrückblicke**: `/portal/netzwerk/unternehmerfreunde/rueckblicke`. Vorhandener Editor **Worum ging es?** pflegt `recapSummary`; Bildauswahl pflegt bis zu sechs `recapImages`. **Ergebnisse und nächste Schritte** (`recapResults`) bleibt intern. Speicherung im Portal ist noch keine öffentliche Freigabe.
- **Öffentliche Homepage-Freigaben**: `/portal/netzwerk/unternehmerfreunde/veroeffentlichungen`. Termine und Rückblicke getrennt auswählen, Felder auswählen, Berechtigung bestätigen, freigeben/widerrufen. Die aktuelle öffentliche Projektion ist als Vorschau einsehbar. Ein unvollständiger Termin kann nicht freigegeben werden.
- Profile: hier ausschließlich **zusätzlich ausblenden** bzw. diese Ausblendung wieder aufheben. Dies erzeugt nie eine Nutzerzustimmung und erweitert niemals deren Felder. Selbst Plattformadministratoren können keine Profilzustimmung ersetzen.

HTTP-Nachweis: Redaktionelle Bearbeitung einschließlich Rückblicktext/Bildern, Absage und Löschung wurde mit der Netzwerkleitungsrolle über die vorhandenen Content-Endpunkte getestet. Die neue Profil-Oberfläche ist typgeprüft; eine vollständige interaktive Browser-Abnahme mit Rollenwechseln bleibt für das isolierte Staging offen.

## Mediengrenze

Öffentliche Bilder kommen ausschließlich aus bereits gespeicherten Raster-Dateien des Portals. Daten-URL-Typ, Base64-Kodierung, Dateisignatur und maximale decodierte Größe 1.500.000 Bytes werden geprüft; PNG/JPEG/WebP sind erlaubt, SVG/HTML und externe Bild-URLs nicht. Dies ist keine vollständige Virenprüfung oder Bild-Neukodierung; weitergehende Bildnormalisierung bleibt ein möglicher späterer Ingest-Schritt.

Der Feed enthält nur URLs unter dem explizit gesetzten HTTPS-Ursprung `PUBLIC_HOMEPAGE_MEDIA_ORIGIN`, z. B. dem künftigen STAGING-API-Host. Route: `/api/networks/homepage/unternehmerfreunde/{kind}/{id}/media/{image|images-0..5}`. Bei jedem Abruf werden Netzwerk, aktiver Inhalt, Nutzerzustimmung/Redaktionsfreigabe, Feldauswahl und Ausblendung erneut geprüft. Ohne Freigabe 404. Bilder werden als Bytes mit richtigem Content-Type, Content-Length, nosniff und no-store ausgegeben, niemals als Redirect. Die Homepage akzeptiert nur diese Medienroute auf demselben Ursprung wie die konfigurierte API.

Es gibt keinen serverseitigen Abruf fremder Medien und damit keinen Medien-SSRF-Pfad. Private Hosts, signierte Cloud-URLs und Zugangstokens werden nicht als öffentliche Medien weitergereicht. Ein dedizierter Medienhost ist in dieser Fassung nicht angebunden. Bildbytes bleiben im vorhandenen internen Snapshot; der öffentliche Feed transportiert sie nicht mehr bei jedem Seitenaufruf.

## Speicherung: Grenzen verbindlich beachten

Bestehend: ein vollständiger PostgreSQL-Snapshot `portal_state` mit lokalem Arbeitsspeicher und prozesslokaler Promise-Schreibwarteschlange. Lokale Tests mit einem kontrollierten Datenbankadapter belegen Schreibreihenfolge und Ausblendung bei laufenden/fehlgeschlagenen Speicherungen. Öffentliche Lesezugriffe werden während ausstehender Persistenz oder nach einem Speicherfehler mit 503 gesperrt, damit kein unbestätigter Zustand ausgeliefert wird.

NICHT NACHGEWIESEN: echte PostgreSQL-Persistenz, Wiederanlauf, Fehlerwiederherstellung, parallele fachliche Schreibabläufe, überlappende Deployments oder Mehrinstanzbetrieb. Ein fehlgeschlagener Schreibvorgang vergiftet die bestehende Queue; die öffentliche Sperre bleibt bis zum überprüften Neustart bestehen. Neustart erst nach Behebung des Speicherfehlers und Prüfung des letzten bestätigten DB-Stands. Nicht behaupten, fehlgeschlagene Änderungen seien gespeichert.

Für einen Pilotbetrieb höchstens EIN API-Prozess/EINE Replica und keine überlappenden Alt-/Neuprozesse; Stop-before-start statt Rolling Deployment. Schreibkonkurrenz muss im echten Datenbanktest nachgewiesen oder durch einen zentral serialisierten Schreibpfad begrenzt werden. Mehrere Prozesse können weiterhin fremde Snapshots überschreiben und veraltete Daten ausliefern. Vor horizontaler Skalierung ist transaktionale Datensatzpersistenz oder eine zentral koordinierte Versionierung/Serialisierung samt konsistenten Reads erforderlich. Diese grundlegende Datenmigration wurde wegen ihrer Auswirkungen auf das gesamte Portal nicht vorgenommen. Zahlungsmodelle, Buchungen und Rechnungslogik wurden nicht verändert.

## Rate-Limit

Bestehend 120 Feed-Abfragen je IP/Minute, pro Prozess, maximal 10.000 IP-Buckets. Echtes HTTP-Überschreiten mit derselben Absender-IP wurde geprüft. Serverseitige Homepage-Aufrufe teilen sich eventuell eine Egress-IP; 120 ist keine Zusage für 120 Besucher, sondern für API-Aufrufe. Unter Last können technisch korrekte Seiten dann 500 zeigen. Vor Veröffentlichung Lastprofil und Gateway-Konfiguration prüfen, einen zentralen Limiter/geeignete Kapazität festlegen. `trust proxy=1` setzt genau einen vertrauenswürdigen vorgeschalteten Proxy voraus; direkter ungeschützter Zugang zum Backend darf Header-Spoofing nicht ermöglichen. Kein erfundener Besucher-IP-Header zur Umgehung des Limits.

## Letzter lokaler Prüflauf

28.10.2026: 20 Homepage-Tests und 66 Portal-Tests bestanden; Homepage-Produktionsbuild, API-Build und Web-Typprüfung bestanden. HTTP-Abnahme am gebauten Next-Server sowie echter Portal→Homepage-Verbindungstest bestanden. Ausschließlich synthetische Daten im Arbeitsspeicher; KEIN PostgreSQL- oder Staging-Nachweis.

## Reproduzierbare lokale Prüfung

Homepage: `npm test`, `npm run build`, `npm run test:http`.
Portal/API: `node ../../node_modules/typescript/bin/tsc -p tsconfig.build.json`; `node node_modules/vitest/vitest.mjs run src/networks/homepage-publication.spec.ts src/networks/homepage-safety.spec.ts`; `node tests/homepage-http.mjs`.
Optional `HOMEPAGE_CHECKOUT` auf den lokalen Homepage-Checkout setzen, nachdem dort gebaut wurde. Dann startet der HTTP-Test zusätzlich die gebaute Homepage auf 127.0.0.1:3012 und verbindet sie mit dem echten lokalen Nest-Server. Der Testadapter übersetzt nur den synthetischen HTTPS-Endpunkt auf Loopback; dieser Adapter wird nicht von Anwendungscode importiert. Dieser lokale Transporttest beweist keine HTTPS-/Gateway-/Staging-Konfiguration.

Datenbanktest VORBEREITET, NICHT AUSGEFÜHRT: `HOMEPAGE_TEST_DATABASE_URL` muss auf eine leere lokale PostgreSQL-Datenbank mit Namen `uf_homepage_test_...` zeigen. Nur localhost/127.0.0.1/::1 wird akzeptiert. Der Runner entfernt eine eventuell geerbte DATABASE_URL und nutzt niemals die Produktionsdatenbank. In diesem Modus prüft er zusätzlich Neustart mit Zustimmung und Neustart nach Widerruf. Kein automatisches Löschen vorhandener Datenbanken. Eine befüllte Testdatenbank wird abgewiesen. Für den nächsten Lauf eine neue leere Testdatenbank verwenden.

## Spätere Staging-Konfiguration – noch einzurichten

Portal: eigene leere Testdatenbank, synthetische Konten, `WEB_ORIGINS` mit der Staging-Portaloberfläche, `PUBLIC_HOMEPAGE_MEDIA_ORIGIN=https://<staging-api-host>`, genau eine API-Instanz.
Homepage: `PORTAL_PUBLIC_API_URL=https://<staging-api-host>/api/networks/homepage/unternehmerfreunde/feed`, `PORTAL_PUBLIC_API_TOKEN` leer, `HOMEPAGE_TEST_DATA=false`, `SITE_INDEXABLE=false`, passende `SITE_URL`. Hosting-Zugriffsschutz für die Staging-Ansichten aktivieren.
URLs sind bewusst Platzhalter: Es existieren noch keine überprüfbaren Staging-Adressen. Vor Produktionsfreigabe alle obigen offenen Prüfungen einschließlich tatsächlichem HTTPS-Transport, Datenbank, Redaktionsoberfläche, Proxy/Rate-Limit, Medien und öffentlich sichtbaren Ausgaben nachholen. Echte Mitgliederdaten niemals probeweise veröffentlichen.
