# B2B-Dienstleistungsportal

Technische Grundlage für ein geschlossenes, KI-gestütztes B2B-Netzwerk. Unternehmen veröffentlichen vertrauliche Bedarfe, prüfen passende Dienstleister zuerst und geben einzelne Matches gezielt frei.

## Struktur

- `apps/web`: Next.js-Webanwendung und späterer Adminbereich
- `apps/api`: NestJS-API und zentrale Geschäftsregeln
- `apps/worker`: Hintergrundprozesse für Prüfung und Matching
- `packages/contracts`: gemeinsame Datenverträge
- `packages/database`: SQL-Schema und Migrationen
- `infrastructure`: lokale PostgreSQL-, Redis- und Dateiablage

## Lokal starten

1. `.env.example` als `.env` kopieren.
2. `docker compose -f infrastructure/compose.yaml up -d` starten.
3. `pnpm install` ausführen.
4. `pnpm dev` starten.

Web: `http://localhost:3000`  
API-Status: `http://localhost:3001/health`

## Leitplanken

- Kein ungeprüftes Profil nimmt am Matching teil.
- Dienstleister sehen einen Bedarf erst nach Einzel-Freigabe.
- Bezahlte Pakete verändern den fachlichen Matchwert nicht.
- Berechtigungen werden serverseitig und später zusätzlich über PostgreSQL-Richtlinien erzwungen.

## Vercel und automatische Git-Deployments

Das Monorepo ist für zwei Vercel-Projekte vorbereitet: `apps/web` und `apps/api`. Nach der einmaligen Verbindung mit GitHub, GitLab oder Bitbucket wird jeder Branch als Preview und `main` als Produktion deployt. Die vollständige Einrichtung steht in `docs/VERCEL_DEPLOYMENT.md`.

Die derzeitige In-Memory-Datenhaltung ist ausschließlich für lokale Entwicklung und Ablaufprüfungen vorgesehen. Vor einer öffentlichen Registrierung muss der PostgreSQL-Adapter mit einer persistenten Datenbank, beispielsweise Neon Postgres über den Vercel Marketplace, aktiviert werden.
