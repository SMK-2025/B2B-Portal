# Veröffentlichung über Git und Vercel

Das Repository enthält zwei Vercel-Projekte:

1. `apps/api` – NestJS-API als Vercel Function
2. `apps/web` – Next.js-Webanwendung

## 1. Git-Repository anlegen

Ein leeres Repository bei GitHub, GitLab oder Bitbucket erstellen. Lokal im Projektordner:

```bash
git init
git add .
git commit -m "Initiale Portalplattform"
git branch -M main
git remote add origin <URL-DES-REPOSITORIES>
git push -u origin main
```

Die enthaltene GitHub Action prüft bei GitHub jeden Pull Request und jeden Push nach `main`.

## 2. Datenbank vor Produktivbetrieb

Im Vercel Marketplace Neon Postgres anlegen und die bereitgestellte `DATABASE_URL` in Preview und Production hinterlegen. Das SQL aus `packages/database/migrations` muss auf die Datenbank angewendet werden.

Wichtig: Der aktuelle lokale Speicheradapter dient Entwicklung und Ablaufprüfung. Vor realer öffentlicher Registrierung muss der PostgreSQL-Adapter aktiviert sein. Ohne persistente Datenbank darf die Anwendung nicht als Produktivportal genutzt werden.

## 3. API-Projekt importieren

- In Vercel „Add New → Project“ auswählen.
- Dasselbe Git-Repository importieren.
- Root Directory: `apps/api`
- Framework: NestJS (wird automatisch erkannt)
- Region: Frankfurt (`fra1`, bereits in `vercel.json`)
- Umgebungsvariablen:
  - `WEB_ORIGIN=https://<WEB-PROJEKT>.vercel.app`
  - `DATABASE_URL=<NEON-VERBINDUNG>`
  - `PLATFORM_ADMIN_EMAIL=<IHRE-GESCHÄFTLICHE-E-MAIL>`
  - `PLATFORM_ADMIN_PASSWORD=<STARKES-PASSWORT-MINDESTENS-16-ZEICHEN>`
  - `PLATFORM_ADMIN_FIRST_NAME=Martin`
  - `PLATFORM_ADMIN_LAST_NAME=Kelm`
  - später E-Mail-, Datei- und KI-Zugangsdaten

Das Plattformadministratorkonto wird nicht öffentlich registriert. Es wird ausschließlich aus diesen geschützten Umgebungsvariablen bereitgestellt. Die Werte niemals in Dateien, GitHub oder Screenshots eintragen.

Nach dem ersten Deployment die API-Adresse notieren.

## 4. Web-Projekt importieren

- Noch einmal „Add New → Project“ auswählen.
- Dasselbe Repository importieren.
- Root Directory: `apps/web`
- Framework: Next.js
- Umgebungsvariable:
  - `NEXT_PUBLIC_API_URL=https://<API-PROJEKT>.vercel.app`

Anschließend beim API-Projekt `WEB_ORIGIN` auf die endgültige Webadresse setzen und erneut deployen.

## 5. Automatisches Deployment

Nach der einmaligen Verbindung sind keine manuellen Deploymentbefehle nötig:

- Push auf einen anderen Branch: Vercel erzeugt eine Preview-Adresse.
- Pull Request: Vercel verknüpft die Preview mit dem Pull Request.
- Merge oder Push nach `main`: Vercel veröffentlicht die Produktionsversion.
- Ein fehlgeschlagener CI-Build sollte nicht nach `main` übernommen werden.

## 6. Eigene Domain

Die Domain wird im Webprojekt hinterlegt. Für die API empfiehlt sich eine Subdomain wie `api.example.de`. Danach werden `NEXT_PUBLIC_API_URL` und `WEB_ORIGIN` auf die endgültigen Domains geändert.

## 7. Vor öffentlicher Freigabe zwingend

- PostgreSQL-Adapter und Migrationen aktiv
- echter E-Mail-Versand und keine sichtbaren Bestätigungstokens
- sichere Geheimnisse ausschließlich in Vercel Environment Variables
- Datenschutztexte und Auftragsverarbeitungsverträge
- Dateispeicher mit privaten Buckets und Virenprüfung
- Zwei-Faktor-Anmeldung für Prüfer und Administratoren
- Backup- und Wiederherstellungstest
- Rate Limits, Monitoring und Alarmierung
- vollständiger Abnahmetest in einer Vercel-Preview
