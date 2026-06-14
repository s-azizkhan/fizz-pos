// Single-café deployment: every domain row links back to this store. Keeping
// the id central makes the schema multi-store ready — swap this for a lookup
// when more than one café shares a database.
export const STORE_ID = 1;
