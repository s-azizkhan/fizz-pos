// Seed/promote the admin user. Run: npm run db:seed
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { store } from "../lib/db/schema/store";
import { users } from "../lib/db/schema/user";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { STORE_ID } from "../lib/store/constants";

// ponytail: duplicated from lib/auth/password.ts because that module is `server-only`.
// Keep the `<saltHex>.<hashHex>` scrypt/keylen-64 format in sync with it.
const scryptAsync = promisify(scrypt);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${derived.toString("hex")}`;
}

const email = (process.env.ADMIN_EMAIL ?? "admin@fizz.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "fizz1234";
const name = process.env.ADMIN_NAME ?? "Admin";

await db.insert(store).values({ id: STORE_ID }).onConflictDoNothing();

const passwordHash = await hashPassword(password);
const [row] = await db
  .insert(users)
  .values({ email, name, passwordHash, role: "admin" })
  .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: "admin", name } })
  .returning();

console.log(`admin ready: ${row.email} (${row.role})`);
process.exit(0);
