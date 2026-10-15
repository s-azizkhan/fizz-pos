import "server-only";

// Vercel project domains. Off (every call a no-op) unless VERCEL_TOKEN and
// VERCEL_PROJECT_ID are set — self-hosters point DNS at the box themselves.
const token = process.env.VERCEL_TOKEN;
const project = process.env.VERCEL_PROJECT_ID;
const team = process.env.VERCEL_TEAM_ID;

export const vercelEnabled = Boolean(token && project);

async function call(method: string, path: string, body?: unknown) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (team) url.searchParams.set("teamId", team);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  return { ok: res.ok, status: res.status, json };
}

export async function addDomain(name: string): Promise<void> {
  if (!vercelEnabled) return;
  const r = await call("POST", `/v10/projects/${project}/domains`, { name });
  // Already on this project = fine.
  if (!r.ok && r.json.error?.code !== "domain_already_exists")
    throw new Error(r.json.error?.message ?? `Vercel said ${r.status}`);
}

export async function removeDomain(name: string): Promise<void> {
  if (!vercelEnabled) return;
  await call("DELETE", `/v9/projects/${project}/domains/${encodeURIComponent(name)}`);
}

export type DomainStatus = {
  /** Vercel-managed? false when self-hosted: show generic DNS help. */
  managed: boolean;
  /** DNS points here and (if needed) ownership is verified. */
  live: boolean;
  /** Records the café must add at their registrar. */
  records: { type: "A" | "CNAME" | "TXT"; name: string; value: string }[];
};

export async function domainStatus(name: string): Promise<DomainStatus> {
  const apex = name.split(".").length === 2;
  const host = apex ? "@" : name.split(".").slice(0, -1).join(".");
  if (!vercelEnabled) return { managed: false, live: false, records: [] };
  const [dom, cfg] = await Promise.all([
    call("GET", `/v9/projects/${project}/domains/${encodeURIComponent(name)}`),
    call("GET", `/v6/domains/${encodeURIComponent(name)}/config`),
  ]);
  const d = dom.json as { verified?: boolean; verification?: { type: string; domain: string; value: string }[] };
  const c = cfg.json as {
    misconfigured?: boolean;
    recommendedIPv4?: { value: string[] }[];
    recommendedCNAME?: { value: string }[];
  };
  const records: DomainStatus["records"] = apex
    ? [{ type: "A", name: host, value: c.recommendedIPv4?.[0]?.value[0] ?? "76.76.21.21" }]
    : [{ type: "CNAME", name: host, value: c.recommendedCNAME?.[0]?.value ?? "cname.vercel-dns.com" }];
  // Domain owned by another Vercel account: a TXT record proves it's theirs.
  for (const v of d.verification ?? [])
    if (v.type === "TXT") records.push({ type: "TXT", name: v.domain.replace(`.${name}`, ""), value: v.value });
  return { managed: true, live: Boolean(d.verified) && c.misconfigured === false, records };
}
