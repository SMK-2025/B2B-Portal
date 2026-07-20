# Railway-Zielarchitektur für den Pilotbetrieb

## Klare Systemtrennung

- Vercel betreibt ausschließlich die Next.js-Webanwendung.
- Railway betreibt die NestJS-API.
- Railway betreibt PostgreSQL als getrennten Dienst mit eigenem Volume.
- Nur die API erhält Datenbankzugang über Railways private `DATABASE_URL`.
- Der Browser und die Webanwendung erhalten niemals Datenbankzugangsdaten.

Die spätere Marken- und Live-Domain ist von dieser Aufteilung unabhängig.

## Railway-Projekt anlegen

1. In Railway ein neues Projekt erstellen.
2. `Deploy from GitHub repo` wählen und dieses Repository verbinden.
3. Für den API-Dienst als Konfigurationsdatei `apps/api/railway.json` verwenden.
4. Die Region für API und Datenbank identisch auf `EU West` setzen.
5. Im selben Projekt über `New → Database → PostgreSQL` einen Datenbankdienst anlegen.
6. Den PostgreSQL-Dienst nicht mit einer öffentlichen Domain versehen.
7. Im API-Dienst eine Referenz auf die private `DATABASE_URL` des PostgreSQL-Dienstes anlegen.

## API-Variablen bei Railway

```text
NODE_ENV=production
WEB_ORIGINS=https://b2-b-portal-api.vercel.app,https://IHRE-SPAETERE-LIVE-DOMAIN
PLATFORM_ADMIN_EMAIL=IHRE-GESCHAEFTLICHE-E-MAIL
PLATFORM_ADMIN_PASSWORD=IHR-STARKES-PASSWORT
PLATFORM_ADMIN_FIRST_NAME=Martin
PLATFORM_ADMIN_LAST_NAME=Kelm
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Den tatsächlichen Namen des PostgreSQL-Dienstes in der Railway-Referenz verwenden. Geheimnisse niemals in GitHub-Dateien eintragen.

## Datenbankschema

Nach Anlage der Datenbank die SQL-Migrationen einmalig in dieser Reihenfolge ausführen:

1. `packages/database/migrations/001_initial.sql`
2. `packages/database/migrations/002_network_tenancy.sql`
3. `packages/database/migrations/003_operational_portal.sql`

## Vercel-Webprojekt

Im sichtbaren Webprojekt wird anschließend gesetzt:

```text
NEXT_PUBLIC_API_URL=https://IHRE-RAILWAY-API-DOMAIN
NEXT_PUBLIC_SITE_URL=https://IHRE-SPAETERE-LIVE-DOMAIN
```

Bis die Live-Domain verbunden ist, bleibt `NEXT_PUBLIC_SITE_URL` auf der Vercel-Adresse.

## Backups und Betrieb

- Tägliche, wöchentliche und monatliche Volume-Backups aktivieren.
- Point-in-Time-Recovery vor dem Pilotstart einrichten.
- Eine Wiederherstellung testweise durchführen und dokumentieren.
- Kostenlimit und Benachrichtigungen im Railway-Konto setzen.
- API-Healthcheck `/health` überwachen.
- Production und Testdaten strikt in getrennten Railway-Environments führen.
