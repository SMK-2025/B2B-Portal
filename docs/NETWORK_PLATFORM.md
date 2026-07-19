# Modulare Netzwerkpartner-Plattform

## Zielbild

B2B Matching betreibt eine gemeinsame Plattform für das allgemeine Portal und beliebig viele abgeschlossene Partnernetzwerke. Jedes Netzwerk ist ein eigener Mandant. Datenzugriffe werden immer über die Netzwerkmitgliedschaft und die darin vergebene Rolle begrenzt.

Der erste vorbereitete Mandant ist:

- Name: Unternehmerfreunde NRW
- Slug: `unternehmerfreunde-nrw`
- ID: `10000000-0000-4000-8000-000000000001`
- Website: `https://www.unternehmerfreunde-nrw.de/`
- Registrierung: `/registrieren?network=unternehmerfreunde-nrw`

Der Mandant wird im Status `draft` angelegt und ist damit zunächst nicht öffentlich nutzbar. Ein vorbereiteter Registrierungslink bedeutet ausdrücklich noch keine Freischaltung. Die öffentliche Website des Netzwerkpartners bleibt ein eigenständiges Projekt und verlinkt später lediglich auf Registrierung, Anmeldung und Portal.

## Verbindliche Freigabelogik

Ein Netzwerkpartner kann sich nicht selbst als Netzwerk registrieren oder aktivieren. Ausschließlich die Plattformadministration darf:

- einen Netzwerkmandanten anlegen,
- einen zeitlich begrenzten Testzugang von 1 bis 180 Tagen erteilen,
- ein Netzwerk dauerhaft aktivieren oder sperren,
- den ersten oder einen weiteren Netzwerkadministrator ernennen.

Die optionale Selbstregistrierung betrifft ausschließlich Mitgliedsunternehmen innerhalb eines bereits freigeschalteten Netzwerks. Dabei entsteht zunächst der Status `pending`. Netzwerkadministration oder Plattformadministration entscheidet anschließend über die Aufnahme.

## Mandantenmodell

Ein Benutzer kann mehreren Unternehmen und Netzwerken angehören. Eine Netzwerkmitgliedschaft verbindet Netzwerk, Unternehmen, Benutzer, Netzwerkrolle sowie Aufnahme- und Prüfstatus.

## Rollen

- `network_admin`: vollständige Verwaltung eines Netzwerkmandanten
- `moderator`: Mitglieder, Inhalte und operative Abläufe verwalten
- `organization_admin`: das eigene Mitgliedsunternehmen im Netzwerk verwalten
- `member`: freigegebene Netzwerkbereiche nutzen

Die bestehenden Plattformrollen `platform_admin` und `reviewer` bleiben erhalten. Die Rolle `network_admin` wird niemals automatisch aus Name, Ansprechpartner oder Registrierung abgeleitet. Sie wird ausschließlich durch die Plattformadministration vergeben.

## Module

Jeder Mandant besitzt eine eigene Liste aktivierter Module: Mitglieder, Profile, Leistungen, Matching, Kommunikation, Veranstaltungen, Community, Aufgaben, Dokumente, Statistiken und Benachrichtigungen. Weitere Netzwerkpartner können mit einer abweichenden Modulkonfiguration eingerichtet werden.

## Sichtbarkeit und Matching

Ein Bedarf kann dem allgemeinen Portal oder einem konkreten Netzwerk zugeordnet werden. Bei einem Netzwerkbedarf berücksichtigt die Matchingberechnung ausschließlich Dienstleisterunternehmen mit einer aktiven Mitgliedschaft im selben Netzwerk.

Übergreifendes Matching bleibt standardmäßig deaktiviert. Eine spätere Öffnung muss ausdrücklich in den Netzwerkeinstellungen und am einzelnen Inhalt erlaubt werden.

## API-Grundlage

- `POST /api/networks`: Netzwerkmandanten als Entwurf anlegen (nur Plattformadministration)
- `POST /api/networks/:networkId/access`: Entwurf, Testzugang, Aktivierung oder Sperre setzen (nur Plattformadministration)
- `GET /api/networks/public/:slug`: öffentliche Netzwerk- und Brandingkonfiguration
- `GET /api/networks/mine`: aktive Netzwerkmitgliedschaften des angemeldeten Benutzers
- `POST /api/networks/:slug/applications`: Mitgliedschaft für ein bestehendes Unternehmen beantragen
- `GET /api/networks/:networkId/memberships`: Mitgliederverwaltung
- `POST /api/networks/:networkId/memberships`: Mitglied hinzufügen; Netzwerkadministratoren nur durch die Plattformadministration
- `POST /api/networks/:networkId/memberships/:membershipId/review`: Antrag freigeben oder ablehnen

Beim Anlegen eines Unternehmens kann `networkSlug` mitgesendet werden. Das funktioniert nur, wenn der Netzwerkmandant aktiv ist oder einen noch gültigen Testzugang besitzt und die Selbstregistrierung für Mitgliedsunternehmen erlaubt wurde.
