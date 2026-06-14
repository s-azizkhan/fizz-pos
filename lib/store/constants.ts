// Single-café deployment: every domain row links back to this store. Keeping
// the id central makes the schema multi-store ready — swap this for a lookup
// when more than one café shares a database.
//
// A fixed UUID for the singleton store so the constant stays stable across
// environments and seeds.
export const STORE_ID = "00000000-0000-0000-0000-000000000001";
