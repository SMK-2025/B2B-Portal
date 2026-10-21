import { BadRequestException } from "@nestjs/common";
export type PartnerSection = { title: string; body: string };
export function partnerSections(value: unknown): PartnerSection[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new BadRequestException(
      "Bitte höchstens 30 Inhaltsbereiche verwenden.",
    );
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new BadRequestException("Ungültiger Inhaltsbereich.");
    const { title, body } = item as Record<string, unknown>;
    if (
      typeof title !== "string" ||
      typeof body !== "string" ||
      !title.trim() ||
      !body.trim() ||
      title.length > 160 ||
      body.length > 3000
    )
      throw new BadRequestException(
        "Jeder Bereich benötigt eine Überschrift (max. 160 Zeichen) und Text (max. 3.000 Zeichen).",
      );
    return { title: title.trim(), body: body.trim() };
  });
}
export function partnerHero(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > 2_000_000 ||
    !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)
  )
    throw new BadRequestException(
      "Das Herobild muss PNG, JPG oder WebP mit maximal 1,5 MB sein.",
    );
  return value;
}
