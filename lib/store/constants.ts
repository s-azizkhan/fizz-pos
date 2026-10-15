// The store every row belonged to before multi-tenancy. Only the seeder and
// the backfill migration still name it; app code scopes by the signed-in
// user's storeId (lib/auth/dal.ts currentStoreId) or by menu slug/host.
export const STORE_ID = "00000000-0000-0000-0000-000000000001";
