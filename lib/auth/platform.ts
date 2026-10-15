// Fizz's own operators — the people who take payments and flip plans. Not a
// store role: a platform admin is just a normal user whose email is listed in
// PLATFORM_ADMIN_EMAILS (comma-separated). Nothing in the DB marks them.
export function isPlatformAdmin(email: string): boolean {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
