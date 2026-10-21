export function verifyPartnerMediaSave(
  requested: { heroImageUrl?: string | null; logoUrl?: string | null },
  saved: { heroImageUrl?: string | null; logoUrl?: string | null },
) {
  if ((requested.heroImageUrl || null) !== (saved.heroImageUrl || null)) {
    throw new Error(
      "Das Titelbild wurde vom Portalserver nicht übernommen. Deine Bildauswahl bleibt erhalten. Bitte versuche es später erneut; der Server muss gegebenenfalls aktualisiert werden.",
    );
  }
  if ((requested.logoUrl || null) !== (saved.logoUrl || null)) {
    throw new Error(
      "Das Firmenlogo wurde nicht übernommen. Deine Bildauswahl bleibt erhalten. Bitte versuche das Speichern erneut.",
    );
  }
}
