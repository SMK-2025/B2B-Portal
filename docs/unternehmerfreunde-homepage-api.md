# Öffentliche Homepage-API – lokaler Entwurf, 28.10.2026

Verbindlicher Prüfstand und Betriebsgrenzen: [Integrationsabnahme](unternehmerfreunde-abnahme.md).
Diese Fassung ersetzt die bisherige administratorseitige Profilfreigabe. Alte Administratorfreigaben sind keine Nutzerzustimmung. Keine produktive Integration freigegeben; isoliertes Staging fehlt.

Basis: /api/networks/homepage/unternehmerfreunde. Andere Netzwerke sind ausgeschlossen.

- GET /feed: anonymer, strikt projizierter Feed gemäß gemeinsamem homepage-v1.json.
- GET /my-profiles: angemeldetes Mitglied sieht ausschließlich eigene Mitgliedschaften und Zustimmungen.
- POST /members/:id/preview: eigene Feldauswahl als Vorschau ohne Speicherung.
- POST /members/:id/consent: ausschließlich Eigentümer der Mitgliedschaft; Body { "enabled": true, "fields": ["title", "description"], "rightsConfirmed": true }. Widerruf { "enabled": false }. Standard ausgeschaltet. Zustimmung an Nutzer-ID UND Mitgliedschafts-ID gebunden.
- POST /members/:id/moderation: zuständige Netzwerkleitung/Plattformverwaltung; ausschließlich { "hidden": true } oder false. Keine Zustimmung oder Felderweiterung möglich.
- GET /manage: berechtigte Redaktion prüft aktuelle öffentliche Projektionen.
- POST /{events|recaps}/:id: separate redaktionelle Feldauswahl, Freigabe und Widerruf. Der bisherige Administrator-Endpunkt für members verweigert Änderungen.
- GET /{members|events|recaps}/:id/media/:field: nur ausdrücklich freigegebene gespeicherte PNG/JPEG/WebP, Freigabeprüfung pro Abruf, keine externen Abrufe/Redirects. Nach Widerruf 404.

Alle verändernden und Vorschau-Endpunkte verwenden die vorhandene Portal-Anmeldung. Die Homepage erhält keinen Mitgliederzugang. Lesen ist ohne Cache; fehlende Konfiguration und technische Fehler ergeben auf dynamischen Homepage-Seiten und Sitemap 500, fehlende Datensätze in einem gültigen Feed 404. Ungültige Gesamtantwort und ungültiger Datensatz sind diagnostisch getrennt; beide stoppen den Feed.

Branche und Leistungen bleiben Textfelder. Neuigkeiten sowie zusätzliche Profilbereiche/Herobilder sind noch nicht im gemeinsamen Vertrag umgesetzt und dürfen nicht als angebunden gelten. Details, Feldgrenzen, Testbefehle, Bedienung, Speicherung und offene Abnahmen stehen im Prüfbericht.
