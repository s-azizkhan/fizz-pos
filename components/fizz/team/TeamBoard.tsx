"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { toast } from "@/lib/store/toast";
import type { UserRole } from "@/lib/db/schema";

export type Member = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

// What each role can actually touch — spelled out so an admin picks with their
// eyes open instead of guessing from the word.
const ROLES: { value: UserRole; label: string; blurb: string }[] = [
  { value: "admin", label: "Admin", blurb: "Everything — team, store settings, the books." },
  { value: "manager", label: "Manager", blurb: "Runs the shift: till, menu, inventory, expenses." },
  { value: "staff", label: "Staff", blurb: "Rings orders at the till." },
];

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<
  UserRole,
  string
>;

const inviteUrl = (token: string) =>
  typeof window === "undefined" ? "" : `${window.location.origin}/join/${token}`;

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// The whole point of this feature: no mail goes out, so the admin copies the
// link and sends it however they already talk to their staff.
function CopyLinkButton({ token, label = "Copy link" }: { token: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(inviteUrl(token));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Couldn't copy. Select the link and copy it by hand.");
        }
      }}
      className="rounded-full border border-fizz px-3 py-1 text-xs font-semibold text-fizz transition-colors hover:bg-fizz/10"
    >
      {copied ? "Copied ●" : label}
    </button>
  );
}

function InviteLinkCard({ token, email }: { token: string; email: string }) {
  return (
    <div className="mt-5 rounded-fizz border border-fizz/40 bg-fizz/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Invite ready
      </p>
      <p className="mt-2 text-sm text-cream">
        Send this link to <span className="font-semibold">{email}</span>. They pick
        their name and password when they open it. Expires in 7 days.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-fizz border border-ink-line bg-ink px-3 py-2 text-xs text-steam">
          {inviteUrl(token)}
        </code>
        <CopyLinkButton token={token} />
      </div>
    </div>
  );
}

function InviteForm() {
  const trpc = useTRPC();
  const [fresh, setFresh] = useState<{ token: string; email: string } | null>(null);
  const [role, setRole] = useState<UserRole>("staff");

  const invite = useMutation(
    trpc.team.invite.mutationOptions({
      meta: { silentError: true },
      onSuccess: (row) => setFresh({ token: row.token, email: row.email }),
    }),
  );
  const error = invite.error?.message ?? null;

  return (
    <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
      <h2 className="font-display text-xl font-bold tracking-tight">Invite someone</h2>
      <p className="mt-2 max-w-[60ch] text-sm text-steam">
        Pick the email and what they&apos;re allowed to do. We don&apos;t send mail
        yet — you&apos;ll get a link to pass along.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFresh(null);
          invite.mutate(fields(e.currentTarget));
        }}
        className="mt-5 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="new.hire@cafe.com"
            className="rounded-fizz border border-ink-line bg-ink px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Permissions
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer rounded-fizz border p-4 transition-colors ${
                  role === r.value
                    ? "border-fizz bg-fizz/10"
                    : "border-ink-line hover:border-fizz/50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  className="sr-only"
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                />
                <span className="block font-display font-bold text-cream">
                  {r.label}
                </span>
                <span className="mt-1 block text-xs text-steam">{r.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-[#E2655A]" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={invite.isPending}
          className="self-start rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
        >
          {invite.isPending ? "Minting…" : "Create invite link"}
        </button>
      </form>

      {fresh && <InviteLinkCard token={fresh.token} email={fresh.email} />}
    </div>
  );
}

function RoleSelect({ member, self }: { member: Member; self: boolean }) {
  const trpc = useTRPC();
  const update = useMutation(
    trpc.team.updateRole.mutationOptions({
      onSuccess: () => toast.success("Role updated"),
    }),
  );

  if (self) {
    return <span className="text-sm text-steam">{ROLE_LABEL[member.role]} (you)</span>;
  }

  return (
    <select
      value={member.role}
      disabled={update.isPending}
      onChange={(e) =>
        update.mutate({ userId: member.id, role: e.target.value as UserRole })
      }
      className="rounded-fizz border border-ink-line bg-ink px-3 py-1.5 text-sm text-cream outline-none focus:border-fizz focus:ring-2 focus:ring-fizz/40 disabled:opacity-50"
      aria-label={`Role for ${member.name}`}
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

function RemoveButton({ member }: { member: Member }) {
  const trpc = useTRPC();
  const remove = useMutation(
    trpc.team.remove.mutationOptions({
      onSuccess: () => toast.success("Removed from the team"),
    }),
  );
  return (
    <button
      type="button"
      disabled={remove.isPending}
      onClick={() => {
        if (confirm(`Remove ${member.name} from the team?`)) {
          remove.mutate({ userId: member.id });
        }
      }}
      className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-50"
    >
      {remove.isPending ? "…" : "Remove"}
    </button>
  );
}

function RevokeButton({ id }: { id: string }) {
  const trpc = useTRPC();
  const revoke = useMutation(
    trpc.team.revoke.mutationOptions({
      onSuccess: () => toast.success("Invite revoked"),
    }),
  );
  return (
    <button
      type="button"
      disabled={revoke.isPending}
      onClick={() => revoke.mutate({ id })}
      className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-50"
    >
      {revoke.isPending ? "…" : "Revoke"}
    </button>
  );
}

export default function TeamBoard({
  members,
  pending,
  currentUserId,
}: {
  members: Member[];
  pending: PendingInvite[];
  currentUserId: string;
}) {
  const cell = "px-4 py-3 text-left";

  return (
    <div className="flex flex-col gap-10">
      <InviteForm />

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Pending invites
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-fizz border border-ink-line bg-ink-soft px-4 py-3"
              >
                <span className="font-semibold text-cream">{p.email}</span>
                <span className="rounded-full border border-ink-line px-3 py-1 text-xs text-steam">
                  {ROLE_LABEL[p.role]}
                </span>
                <span className="text-xs text-steam">
                  Expires {fmtDate(p.expiresAt)}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <CopyLinkButton token={p.token} />
                  <RevokeButton id={p.id} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">
          On the floor
        </h2>
        <div className="mt-5 overflow-x-auto rounded-fizz border border-ink-line bg-ink-soft">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-ink-line text-xs uppercase tracking-[0.12em] text-steam">
              <tr>
                <th className={cell}>Name</th>
                <th className={cell}>Email</th>
                <th className={cell}>Permissions</th>
                <th className={cell}>Joined</th>
                <th className={cell} />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const self = m.id === currentUserId;
                return (
                  <tr key={m.id} className="border-b border-ink-line/60 last:border-0">
                    <td className={`${cell} font-semibold text-cream`}>{m.name}</td>
                    <td className={`${cell} text-steam`}>{m.email}</td>
                    <td className={cell}>
                      <RoleSelect member={m} self={self} />
                    </td>
                    <td className={`${cell} text-steam`}>{fmtDate(m.createdAt)}</td>
                    <td className={`${cell} text-right`}>
                      {!self && <RemoveButton member={m} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
