export function verifyPartnerMediaSave(
  requested: { heroImageUrl?: string | null; logoUrl?: string | null;contactPhotoUrl?:string|null },
  saved: { heroImageUrl?: string | null; logoUrl?: string | null;contactPhotoUrl?:string|null },
) {
  if(requested.contactPhotoUrl!==undefined&&(requested.contactPhotoUrl||null)!==(saved.contactPhotoUrl||null))throw new Error('Das persönliche Foto wurde nicht übernommen. Bitte erneut speichern.');
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
