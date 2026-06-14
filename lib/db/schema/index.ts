// Barrel for the DB schema. Each table lives in its own module under this folder
// (e.g. `user.ts`, `store.ts`). Re-export everything so `@/lib/db/schema`
// and Drizzle's `* as schema` import keep working.
export * from "./user";
export * from "./store";
export * from "./waitlist";
export * from "./dailySales";
export * from "./expenses";
