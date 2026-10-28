import { isIP } from "node:net";
export function mediaOrigin() {
  try {
    const u = new URL(process.env.PUBLIC_HOMEPAGE_MEDIA_ORIGIN || "");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash ||
      isIP(u.hostname) ||
      u.hostname === "localhost" ||
      !u.hostname.includes(".")
    )
      return null;
    return u.origin;
  } catch {
    return null;
  }
}
export function decodePublicImage(
  input: unknown,
): { bytes: Buffer; type: string } | null {
  if (typeof input !== "string" || input.length > 2_000_000) return null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    input,
  );
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (
    bytes.length > 1_500_000 ||
    bytes.length < 12 ||
    bytes.toString("base64") !== m[2]
  )
    return null;
  const valid =
    m[1] === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : m[1] === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString() === "RIFF" &&
          bytes.subarray(8, 12).toString() === "WEBP";
  return valid ? { bytes, type: "image/" + m[1] } : null;
}
export function publicImageUrl(
  input: unknown,
  kind: string,
  id: string,
  field: string,
) {
  const origin = mediaOrigin();
  return origin && /^[a-zA-Z0-9_-]{1,100}$/.test(id) && decodePublicImage(input)
    ? `${origin}/api/networks/homepage/unternehmerfreunde/${kind}/${id}/media/${field}`
    : null;
}
