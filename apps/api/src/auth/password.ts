import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(nodeScrypt);

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = randomBytes(16); const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function validatePasswordStrength(password:string):void{
  if(password.length<12||password.length>200||!/[a-zäöüß]/.test(password)||!/[A-ZÄÖÜ]/.test(password)||!/[0-9]/.test(password)||!/[^\p{L}\p{N}\s]/u.test(password))throw new Error("Das Passwort muss mindestens 12 Zeichen sowie Groß- und Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten.");
  if(/(.)\1{5,}/u.test(password)||/^(?:passwort|password|qwertz|qwerty|123456)/i.test(password))throw new Error("Dieses Passwort ist zu leicht zu erraten. Bitte verwenden Sie ein individuelles Passwort.");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url"); const actual = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function opaqueToken(): string { return randomBytes(32).toString("base64url"); }
export function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
