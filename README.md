# B2B-Dienstleistungsportal

Technische Grundlage für ein geschlossenes, KI-gestütztes B2B-Netzwerk. Unternehmen veröffentlichen vertrauliche Bedarfe, prüfen passende Dienstleister zuerst und geben einzelne Matches gezielt frei.

## Struktur

- `apps/web`: Next.js-Webanwendung mit Marketingseiten und rollenbasierten Portalbereichen
- `apps/api`: NestJS-API und zentrale Geschäftsregeln
- `apps/worker`: Hintergrundprozesse für Prüfung und Matching
- `packages/contracts`: gemeinsame Datenverträge
- `packages/database`: SQL-Schema und Migrationen
- `infrastructure`: lokale Entwicklungsdienste

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

## Produktivbetrieb

Die Webanwendung wird über Vercel veröffentlicht. API und PostgreSQL laufen getrennt davon auf Railway. Änderungen werden über das verbundene GitHub-Repository gebaut und bereitgestellt.

Im Produktionsmodus sind `DATABASE_URL`, `WEB_ORIGINS` sowie die öffentliche Web- und API-Adresse Pflicht. Ohne diese Werte startet die betroffene Anwendung bewusst nicht. Eine flüchtige In-Memory-Datenhaltung und lokale Adress-Fallbacks stehen ausschließlich in Entwicklung und Tests zur Verfügung; produktive Geschäftsdaten werden dauerhaft in PostgreSQL gespeichert.
