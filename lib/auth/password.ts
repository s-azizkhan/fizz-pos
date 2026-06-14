import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

// Hash format: `<saltHex>.<hashHex>`. scrypt is built into Node — no native dep.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}.${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(".");
  if (!salt || !hashHex) return false;
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  const known = Buffer.from(hashHex, "hex");
  // Constant-time compare; guard against length mismatch (timingSafeEqual throws).
  return known.length === derived.length && timingSafeEqual(known, derived);
}
