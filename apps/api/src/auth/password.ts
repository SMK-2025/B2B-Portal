import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(nodeScrypt);

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error("Das Passwort muss mindestens 12 Zeichen enthalten.");
  const salt = randomBytes(16); const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url"); const actual = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function opaqueToken(): string { return randomBytes(32).toString("base64url"); }
export function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
