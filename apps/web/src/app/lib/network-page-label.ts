/** Presentation only: never change the network identity or member/company names. */
export function networkPageLabel(slug: string, networkName: string) {
  return slug === "bayer04leverkusen"
    ? "B2B-Netzwerk-Portal"
    : networkName.toUpperCase();
}
