# Modulare Netzwerkpartner-Plattform

## Zielbild

B2B Matching betreibt eine gemeinsame Plattform für das allgemeine Portal und beliebig viele abgeschlossene Partnernetzwerke. Jedes Netzwerk ist ein eigener Mandant. Datenzugriffe werden immer über die Netzwerkmitgliedschaft und die darin vergebene Rolle begrenzt.

Der erste vorkonfigurierte Mandant ist:

- Name: Unternehmerfreunde NRW
- Slug: `unternehmerfreunde-nrw`
- ID: `10000000-0000-4000-8000-000000000001`
- Website: `https://www.unternehmerfreunde-nrw.de/`
- Registrierung: `/registrieren?network=unternehmerfreunde-nrw`

Die öffentliche Website des Netzwerkpartners bleibt ein eigenständiges Projekt. Sie verlinkt lediglich auf Registrierung, Anmeldung und Portal.

## Mandantenmodell

Ein Benutzer kann mehreren Unternehmen und Netzwerken angehören. Eine Netzwerkmitgliedschaft verbindet:

- Netzwerk
- Unternehmen
- Benutzer
- Netzwerkrolle
- Aufnahme- und Prüfstatus

Die Mitgliedschaft wird nicht allein durch eine Registrierung aktiv. Bei einer eigenständigen Registrierung entsteht zunächst der Status `pending`. Netzwerkadministration oder Plattformadministration entscheidet über die Aufnahme.

## Rollen

- `network_admin`: vollständige Verwaltung eines Netzwerkmandanten
- `moderator`: Mitglieder, Inhalte und operative Abläufe verwalten
- `organization_admin`: das eigene Mitgliedsunternehmen im Netzwerk verwalten
- `member`: freigegebene Netzwerkbereiche nutzen

Die bestehenden Plattformrollen `platform_admin` und `reviewer` bleiben erhalten.

## Module

Jeder Mandant besitzt eine Liste aktivierter Module:

- Mitglieder
- Profile
- Leistungen
- Matching
- Kommunikation
- Veranstaltungen
- Community
- Aufgaben
- Dokumente
- Statistiken
- Benachrichtigungen

Unternehmerfreunde NRW startet mit allen Modulen. Weitere Netzwerkpartner können später mit einer abweichenden Modulkonfiguration eingerichtet werden.

## Sichtbarkeit und Matching

Ein Bedarf kann dem allgemeinen Portal oder einem konkreten Netzwerk zugeordnet werden. Bei einem Netzwerkbedarf berücksichtigt die Matchingberechnung ausschließlich Dienstleisterunternehmen mit einer aktiven Mitgliedschaft im selben Netzwerk.

Übergreifendes Matching bleibt standardmäßig deaktiviert. Eine spätere Öffnung muss ausdrücklich in den Netzwerkeinstellungen und am einzelnen Inhalt erlaubt werden.

## API-Grundlage

- `GET /api/networks/public/:slug`: öffentliche Netzwerk- und Brandingkonfiguration
- `GET /api/networks/mine`: aktive Netzwerkmitgliedschaften des angemeldeten Benutzers
- `POST /api/networks/:slug/applications`: Mitgliedschaft für ein bestehendes Unternehmen beantragen
- `GET /api/networks/:networkId/memberships`: Mitgliederverwaltung
- `POST /api/networks/:networkId/memberships`: Mitglied durch die Netzwerkadministration hinzufügen
- `POST /api/networks/:networkId/memberships/:membershipId/review`: Antrag freigeben oder ablehnen

Beim Anlegen eines Unternehmens kann `networkSlug` direkt mitgesendet werden. Dadurch werden Unternehmen und Mitgliedschaftsantrag in einem Registrierungsablauf angelegt.

## Weitere Ausbauschritte

1. persistente PostgreSQL-Anbindung statt In-Memory-Testbetrieb
2. Einladungen und E-Mail-Versand
3. Netzwerkwechsel im Portal
4. gebrandete Netzwerkoberfläche
5. Veranstaltungs-, Community-, Aufgaben- und Dokumentenmodule
6. Netzwerkstatistiken und Exporte
7. automatisierte Mandantenbereitstellung und Abrechnung
