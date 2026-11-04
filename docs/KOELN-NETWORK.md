# Unternehmernetzwerk Köln

Eigenständiges, geschlossenes B2B-Netzwerk. Landingpage `/Koeln`, Netzwerkkennung `unternehmernetzwerkkoeln`, Registrierung `/registrieren?network=unternehmernetzwerkkoeln`, Login mit `&mode=login`.

Vom Betreiber am 04.11.2026 beauftragt und bestätigt: 29 Euro netto/Monat, 12 Monate, keine kostenlose Phase, keine automatische Verlängerung. Rechnung nach Freigabe und verbindlicher Buchung. Keine Mitgliederübernahme, keine E-Mail beim Anlegen, keine automatische Übertragung privater Inhalte.

Einmalige idempotente Einrichtung nach Wiederherstellung des produktiven Datenbestands (`core/provision-koeln.ts`). Wartungsbeleg verhindert Wiederanlage nach Löschung und Überschreiben späterer Änderungen. Existierende gleichnamige Kennungen werden nicht verändert. Begrüßungsbeitrag mit Hero und Diskussion, Standardmodule ohne automatische Mannschaftszuordnung. Speicherung über bestehende PostgreSQL-Persistenz. Kein neuer öffentlicher administrativer Endpunkt.

## Branding und Inhalte

Eigenständiges Rot `#c8102e`, Weiß und Anthrazit `#171717`. Keine Übernahme amtlicher Gestaltung oder des Stadtwappens. Stadtfarben als Anregung: [Hauptsatzung Köln](https://www.stadt-koeln.de/mediaasset/content/satzungen/hauptsatzung_17122020.pdf). Neun Stadtbezirke nach [Stadt Köln](https://www.stadt-koeln.de/leben-in-koeln/stadtbezirke/). Betreiberanschrift bleibt korrekt in Leverkusen. Keine städtische Trägerschaft, keine erfundenen Mitgliederdaten.

Gemeinsam genutzte Landing-Komponenten behalten Leverkusen als Standard; Köln übergibt Kennung und Farben ausdrücklich. Öffentliche Netzwerkfarben und Teilnahmeangebote werden geladen. AGB/Datenschutz, Aufnahmeprüfung, Passwortsicherheit und Rollen bleiben dieselben zentralen Funktionen.

## Bild

Finales Projektasset: `apps/web/public/images/koeln-network-blue-hour.webp`, 2172 × 724 Pixel, ca. 204 kB. Eigene KI-Bildmontage, kein tatsächliches Treffen oder verbindlicher Aussichtspunkt. Erzeugt mit dem integrierten Bildwerkzeug, anschließend nur nach WebP konvertiert. Original bleibt im Generierungsordner. Eigenes vektorbasiertes Netzwerklogo: `apps/web/public/images/unternehmernetzwerk-koeln.svg`.

### Generierungs-Prompt

Use case: photorealistic-natural. Asset: original wide panoramic 3:1 website hero for an independent local B2B Unternehmernetzwerk Köln, Germany. Create a sophisticated authentic candid business networking scene at blue hour on a riverside terrace in Cologne, with a recognizable realistic Cologne Cathedral (Kölner Dom with its two Gothic pointed towers) and the Hohenzollern rail bridge across the Rhine in the distant background. Five diverse adult local entrepreneurs aged 30-60, women and men in smart casual clothing, relaxed conversation, warm practical lighting, natural faces and hands, not looking at camera, no staged handshake. Put people and Cathedral predominantly in the right 60 percent, with the cathedral near the upper right but not at the very edge, so it can remain recognizable in a portrait mobile crop at object position 78 percent. Left 40 percent calm darker river and blue-hour sky for white webpage text. Refined warm red accent reflections and amber terrace lights, deep charcoal shadows, natural navy twilight sky, not heavy red color grading. Cinematic but credible regional business atmosphere, welcoming, not luxury gala. Photoreal editorial visual montage, not a documentary photo or a claimed exact terrace view. No text, no slogans, no company logos, no municipal or football emblems, no watermarks, no Leverkusen landmarks, no water tower, no Bayer cross, no sci-fi network lines. High quality detailed panoramic original hero.
