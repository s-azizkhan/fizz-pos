// Fizz's own operators — the people who take payments and flip plans. Not a
// store role: it's the users.is_platform_admin flag, set out-of-band by the
// seeder (ADMIN_EMAIL) or by hand in SQL. Nothing in the app can grant it.
export const isPlatformAdmin = (user: { isPlatformAdmin: boolean }) => user.isPlatformAdmin;
