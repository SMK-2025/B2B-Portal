# PostgreSQL-Datenbank für den Pilotbetrieb

## Ziel

Die API wird mit einer verwalteten PostgreSQL-Datenbank betrieben. Empfohlen ist Neon in der Vercel-Region Frankfurt. Die öffentliche Domain ist davon unabhängig und kann später ohne Datenmigration geändert werden.

## Reihenfolge

1. Im Vercel-Dashboard das API-Projekt öffnen.
2. Unter `Storage` beziehungsweise `Marketplace` eine Neon-PostgreSQL-Datenbank anlegen.
3. Die Integration ausschließlich mit dem API-Projekt verbinden.
4. `DATABASE_URL` für Production und Preview bereitstellen.
5. Im Neon SQL Editor die Migrationen in dieser Reihenfolge ausführen:
   - `001_initial.sql`
   - `002_network_tenancy.sql`
   - `003_operational_portal.sql`
6. Erst nach erfolgreicher Migration den PostgreSQL-Adapter der API aktivieren.

## Enthaltene Datenbereiche

- Benutzer, E-Mail-Bestätigung, Sitzungen und Passwortzurücksetzung
- Unternehmen, Mitgliedschaften, Profile und Prüfentscheidungen
- Dienstleistungsseiten und Versionen
- Netzwerkpartner, Rollen, Testzugänge und Module
- Bedarfe, Matches und Freigabeentscheidungen
- Nachrichten, Termine, Aktivitäten und Benachrichtigungen
- Netzwerkveranstaltungen und Teilnehmer
- Netzwerkthemen und Dokumentmetadaten
- revisionsnahes Administrationsprotokoll

## Sicherheitsregeln

- `DATABASE_URL` niemals in GitHub oder lokale Dokumente kopieren.
- Für Production und Preview getrennte Datenbanken oder mindestens getrennte Branches verwenden.
- Vor dem Pilotstart Wiederherstellung und Backup prüfen.
- Direkte öffentliche Datenbankzugriffe deaktivieren; nur die API greift auf Daten zu.
- Personenbezogene Daten nicht in Vercel- oder Anwendungslogs schreiben.
