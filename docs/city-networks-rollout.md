# Stadtnetzwerke: Ausbau auf 50 Städte

Betreiberauftrag vom 18.11.2026: Die 50 größten Städte mit eigenen Netzwerken
versorgen, Kölns aktuelle Konditionen übernehmen, Bestandsnetzwerke nicht ändern.

## Grundlage und Zuordnung

Katalog: `apps/api/src/networks/city-networks.json`. Web und API lesen dieselbe
Datei. Auswahl anhand der Städte-Statistik (Bevölkerungsstand 31.12.2025):
https://www.staedtetag.de/ueber-uns/statistik-der-staedte
https://www.staedtetag.de/files/dst/docs/Wir-ueber-uns/Statistik-der-Staedte/2026/1-abc-311225.pdf

Köln und Leverkusen behalten ihre Kennungen und URLs. Weitere Standorte erhalten
`/netzwerke/{stadt}` und eine eigene Netzwerkkennung. Registrierung und Login
verwenden immer genau diese Kennung. Die technische Anmeldung ist gemeinsam,
Mitgliedschaft und interne Daten bleiben netzwerkbezogen.

## Anlage

Nur Plattformadministratoren: POST `/api/networks/admin/city-networks/provision`,
auch über den Button in der Netzwerkverwaltung. Der Vorgang ist wiederholbar;
bestehende Kennungen werden übersprungen, niemals überschrieben. Keine E-Mails,
Rechnungen oder neuen Benutzer werden durch den Vorgang angelegt.

Übernommen werden aktuelle Preise, Laufzeiten und Startaktionsbedingungen aus
Köln sowie das Branding. Keine Kopie von Mitgliedern, Rechnungen, Chats,
Inhalten, Einladungen, individuellen Textüberschreibungen oder Aktionsnutzung.
Jedes neue Netzwerk erhält eine eigene ID und eine eigene Startaktionskennung.
Alle Portalmodule stehen zur Verfügung. Sportfunktionen benötigen wie bisher
eine gesonderte Konfiguration durch den Initiator.

## Suchmaschinen und KI-Integrität

- Öffentliche Übersicht und Sitemap enthalten nur tatsächlich aktive Netzwerke.
- Nicht angelegte und unbekannte Stadtseiten liefern 404, keine Scheinangebote.
- Servergerenderte Texte, eigene Titel, Beschreibung und kanonische URL.
- Strukturierte Service- und FAQ-Daten entsprechen sichtbaren Inhalten.
- Klar benannter privater Betreiber; keine behauptete städtische Trägerschaft.
- Neue Seiten erklären den Aufbauzustand. Keine erfundenen Mitglieder,
  Bewertungen, Erfolgsmeldungen, Aufträge oder Veranstaltungen.
- Generisches KI-Symbolbild ist als solches bezeichnet, keine falsche Stadtkulisse.
- Login, Registrierung und private Portale bleiben von der Indexierung ausgenommen.

Die Struktur verbessert Lesbarkeit und Auffindbarkeit. Sie garantiert keine
Platzierung bei Suchmaschinen oder eine Empfehlung durch KI-Suchdienste.
Langfristig sollen tatsächlich vorhandene lokale Angebote und redaktionelle
Inhalte ergänzt werden; 50 reine Namensvarianten sind keine SEO-Erfolgsstrategie.
