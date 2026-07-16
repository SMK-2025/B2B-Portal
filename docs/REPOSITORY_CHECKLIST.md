# Repository- und Abnahmecheckliste

## Vor dem ersten Push

- [ ] Projektname und öffentliche Texte geprüft
- [ ] `.env` wurde nicht eingecheckt
- [ ] `pnpm install --frozen-lockfile` erfolgreich
- [ ] `pnpm typecheck` erfolgreich
- [ ] `pnpm test` erfolgreich
- [ ] `pnpm build` erfolgreich

## Vor dem ersten Vercel-Test

- [ ] API-Projekt mit Root Directory `apps/api` erstellt
- [ ] Webprojekt mit Root Directory `apps/web` erstellt
- [ ] Preview-Umgebungsvariablen hinterlegt
- [ ] Web- und API-Adressen gegenseitig konfiguriert
- [ ] Frankfurt als Funktionsregion kontrolliert

## Vor öffentlicher Registrierung

- [ ] persistente PostgreSQL-Datenhaltung aktiv
- [ ] E-Mail-Versand aktiv
- [ ] Administrator-MFA aktiv
- [ ] Datenschutz und Nutzungsbedingungen freigegeben
- [ ] Dateiablage und Virenprüfung aktiv
- [ ] Lösch- und Exportprozesse getestet
- [ ] Sicherheits- und Berechtigungstests abgeschlossen
