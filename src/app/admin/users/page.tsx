import { AdminUserActions } from "@/components/admin-user-actions";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type AdminUsersPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

const actionLabelMap = {
  BLOCK_USER: "Blocked user",
  UNBLOCK_USER: "Unblocked user",
  CHANGE_DISPLAY_NAME: "Changed display name",
  REMOVE_PROFILE_PICTURE: "Removed profile picture",
  DEACTIVATE_USER: "Deactivated user",
  REACTIVATE_USER: "Reactivated user",
} as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const adminUser = await requireAdminUser();
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { id: { contains: query } },
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : undefined,
    orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      actionsReceived: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin Users
              </h1>
              <p className="mt-1 text-sm text-muted">
                Signed in as admin:{" "}
                <span className="font-medium text-foreground">{adminUser.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Back to admin
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Home
              </Link>
            </div>
          </div>

          <form className="mt-4 flex w-full max-w-3xl flex-wrap items-center gap-2">
            <label className="flex min-w-[240px] flex-1 items-center rounded-lg border border-border bg-white px-3 py-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by name, email, or user ID"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Search
            </button>
            {query ? (
              <Link
                href="/admin/users"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                aria-label="Clear search"
                title="Clear search"
              >
                X
              </Link>
            ) : null}
          </form>
        </header>

        <section className="grid gap-4">
          {users.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted shadow-sm">
              No users found.
            </div>
          ) : null}

          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={`${user.name} profile`}
                      className="h-11 w-11 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-foreground">
                      {getInitials(user.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-sm text-muted">{user.email}</p>
                    <p className="truncate text-xs text-muted">ID: {user.id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-foreground">
                    {user.role}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-foreground">
                    {user.image ? "Photo" : "No Photo"}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 ${
                      user.isBlocked
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {user.isBlocked ? "Blocked" : "Not Blocked"}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 ${
                      user.isActive
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-zinc-300 bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <AdminUserActions
                user={{
                  id: user.id,
                  name: user.name,
                  image: user.image,
                  isBlocked: user.isBlocked,
                  isActive: user.isActive,
                }}
              />

              <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Recent Moderation History
                </h2>

                {user.actionsReceived.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">No moderation actions yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                    {user.actionsReceived.map((actionLog) => (
                      <li key={actionLog.id}>
                        <span className="font-semibold">
                          {actionLabelMap[actionLog.action]}
                        </span>{" "}
                        by {actionLog.admin.name} (
                        {new Date(actionLog.createdAt).toLocaleString()})
                        {actionLog.reason ? ` - Reason: ${actionLog.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
