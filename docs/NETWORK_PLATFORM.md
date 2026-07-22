# Modulare Netzwerkpartner-Plattform

## Zielbild

B2B Matching betreibt eine gemeinsame Plattform für das allgemeine Portal und beliebig viele geschlossene Partnernetzwerke. Jedes Netzwerk ist ein eigener Mandant. Datenzugriffe werden durch die Netzwerkmitgliedschaft und die darin vergebene Rolle begrenzt.

Netzwerkmandanten werden ausschließlich durch eine echte Registrierung oder durch die Plattformadministration angelegt. Es gibt keine fest eingebauten Kundenmandanten, Beispielnetzwerke, IDs oder kundenspezifischen Sonderseiten. Die öffentliche Website eines Netzwerkpartners bleibt ein eigenständiges Projekt und kann auf Registrierung, Anmeldung und Portal verlinken.

## Registrierung und Freigabe

Eine entscheidungsberechtigte Person kann bei der Registrierung die Rolle als Netzwerkbetreiber wählen, die erforderlichen Erklärungen bestätigen und zunächst eine zehn Tage gültige, unverbindliche Testansicht erhalten. In der Testansicht sind keine produktiven Speicher-, Einladungs- oder Veröffentlichungsfunktionen freigeschaltet.

Die verbindliche Nutzung beginnt erst nach Buchung. Die Plattformadministration kann Netzwerkmandanten prüfen, aktivieren, sperren oder löschen sowie Test- und Dauerzugänge verwalten.

Nach der Aktivierung lädt der Netzwerkadministrator Mitgliedsunternehmen über kontrollierte Einladungslinks ein. Mitglieder können einem geschlossenen Netzwerk nicht ohne Einladung beitreten.

## Mandantenmodell

Ein Benutzer kann mehreren Unternehmen und Netzwerken angehören. Eine Netzwerkmitgliedschaft verbindet Netzwerk, Unternehmen, Benutzer, Netzwerkrolle sowie Aufnahme- und Prüfstatus.

## Rollen

- `network_admin`: vollständige Verwaltung des eigenen Netzwerkmandanten
- `moderator`: Mitglieder, Inhalte und operative Abläufe verwalten
- `organization_admin`: das eigene Mitgliedsunternehmen im Netzwerk verwalten
- `member`: freigegebene Netzwerkbereiche nutzen

Die Plattformrollen `platform_admin` und `reviewer` bleiben davon getrennt. Ein Netzwerkadministrator besitzt keine Rechte über andere Mandanten oder die Gesamtplattform.

## Module

Jeder Mandant besitzt eine eigene Liste aktivierter Module: Mitglieder, Profile, Leistungen, Matching, Kommunikation, Veranstaltungen, Community, Aufgaben, Dokumente, Statistiken und Benachrichtigungen. Netzwerkpartner können unterschiedliche Modulkonfigurationen erhalten.

## Sichtbarkeit und Matching

Ein Bedarf kann dem allgemeinen Portal oder einem konkreten Netzwerk zugeordnet werden. Bei einem Netzwerkbedarf berücksichtigt die Matchingberechnung ausschließlich Dienstleisterunternehmen mit aktiver Mitgliedschaft im selben Netzwerk.

Netzwerkübergreifendes Matching ist standardmäßig deaktiviert und erfordert eine ausdrücklich freigegebene Funktion.

## API-Grundlage

- `POST /api/networks`: Netzwerkmandanten anlegen
- `POST /api/networks/:networkId/access`: Testzugang, Aktivierung oder Sperre verwalten
- `POST /api/networks/:networkId/delete`: einen Mandanten mit Sicherheitsbestätigung vollständig löschen
- `GET /api/networks/public/:slug`: freigegebene Netzwerk- und Brandingkonfiguration
- `GET /api/networks/mine`: Netzwerkmitgliedschaften des angemeldeten Benutzers
- `GET /api/networks/:networkId/memberships`: Mitgliederverwaltung
- `POST /api/networks/:networkId/memberships`: eingeladenes Mitglied hinzufügen
- `POST /api/networks/:networkId/memberships/:membershipId/review`: Aufnahme freigeben oder ablehnen

Beim Anlegen eines Unternehmens kann eine gültige Netzwerkeinladung mitgesendet werden. Die Zuordnung ist nur für einen freigegebenen Netzwerkmandanten und innerhalb der Berechtigungen der Einladung zulässig.
