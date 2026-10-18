import type { CSSProperties } from "react";
function textColor(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
}
export function partnerBranding(
  profile?: { primaryColor?: string; secondaryColor?: string } | null,
): CSSProperties {
  if (!profile?.primaryColor || !/^#[0-9a-f]{6}$/i.test(profile.primaryColor))
    return {};
  const primary = profile.primaryColor,
    secondary =
      profile.secondaryColor && /^#[0-9a-f]{6}$/i.test(profile.secondaryColor)
        ? profile.secondaryColor
        : primary,
    ink = textColor(primary);
  return {
    "--partner-primary": primary,
    "--partner-secondary": secondary,
    "--partner-soft": primary + "0d",
    "--partner-border": primary + "40",
    "--partner-ink": ink,
    "--partner-hero": primary,
  } as CSSProperties;
}
