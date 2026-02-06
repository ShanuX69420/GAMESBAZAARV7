import { AdminListingActions } from "@/components/admin-listing-actions";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ListingModerationActionType, ListingStatus, Prisma } from "@prisma/client";
import Link from "next/link";

type AdminListingsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const statusOptions = [
  "ALL",
  ListingStatus.DRAFT,
  ListingStatus.ACTIVE,
  ListingStatus.PAUSED,
  ListingStatus.HIDDEN_BY_ADMIN,
  ListingStatus.REMOVED_BY_ADMIN,
] as const;

const logActionLabelMap: Record<ListingModerationActionType, string> = {
  HIDE_LISTING: "Hidden",
  RESTORE_LISTING: "Restored",
  REMOVE_LISTING: "Removed",
  PAUSE_LISTING: "Paused",
  UNPAUSE_LISTING: "Unpaused",
};

function getStatusBadgeClass(status: ListingStatus) {
  switch (status) {
    case ListingStatus.ACTIVE:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case ListingStatus.PAUSED:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case ListingStatus.HIDDEN_BY_ADMIN:
      return "border-orange-200 bg-orange-50 text-orange-700";
    case ListingStatus.REMOVED_BY_ADMIN:
      return "border-red-200 bg-red-50 text-red-700";
    case ListingStatus.DRAFT:
    default:
      return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }
}

export default async function AdminListingsPage({
  searchParams,
}: AdminListingsPageProps) {
  const adminUser = await requireAdminUser();
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams.q ?? "").trim();
  const rawStatus = (resolvedSearchParams.status ?? "ALL").trim();
  const selectedStatus = statusOptions.includes(rawStatus as (typeof statusOptions)[number])
    ? rawStatus
    : "ALL";

  const where: Prisma.ListingWhereInput = {};

  if (selectedStatus !== "ALL") {
    where.status = selectedStatus as ListingStatus;
  }

  if (query) {
    where.OR = [
      { id: { contains: query } },
      { title: { contains: query } },
      { seller: { email: { contains: query } } },
      { seller: { name: { contains: query } } },
      { game: { name: { contains: query } } },
      { category: { name: { contains: query } } },
      { offering: { name: { contains: query } } },
    ];
  }

  const [listings, totalListings, activeListings, pausedListings, hiddenListings, removedListings] =
    await prisma.$transaction([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          id: true,
          title: true,
          description: true,
          pricePkr: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          moderationReason: true,
          moderatedAt: true,
          game: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          offering: {
            select: {
              id: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          moderatedByAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          moderationLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              action: true,
              reason: true,
              previousStatus: true,
              nextStatus: true,
              createdAt: true,
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      prisma.listing.count({ where: { status: ListingStatus.PAUSED } }),
      prisma.listing.count({ where: { status: ListingStatus.HIDDEN_BY_ADMIN } }),
      prisma.listing.count({ where: { status: ListingStatus.REMOVED_BY_ADMIN } }),
    ]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin Listings
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

          <form className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex min-w-[240px] flex-1 items-center rounded-lg border border-border bg-white px-3 py-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search ID, title, seller, game, offering"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none"
            >
              {statusOptions.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Search
            </button>

            {(query || selectedStatus !== "ALL") && (
              <Link
                href="/admin/listings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                aria-label="Clear filters"
                title="Clear filters"
              >
                X
              </Link>
            )}
          </form>
        </header>

        <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Total Listings
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalListings}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{activeListings}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paused</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{pausedListings}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Hidden</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{hiddenListings}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Removed</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{removedListings}</p>
          </article>
        </section>

        <section className="grid gap-4">
          {listings.length === 0 ? (
            <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted shadow-sm">
              No listings found.
            </article>
          ) : null}

          {listings.map((listing) => {
            const offeringLabel =
              listing.offering?.name ?? `${listing.game.name} ${listing.category.name}`;

            return (
              <article
                key={listing.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {listing.game.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.game.icon}
                        alt={`${listing.game.name} icon`}
                        className="h-10 w-10 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-muted">
                        G
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {listing.title}
                      </h2>
                      <p className="truncate text-sm text-muted">{offeringLabel}</p>
                      <p className="truncate text-xs text-muted">
                        Seller: {listing.seller.name} ({listing.seller.email})
                      </p>
                      <p className="truncate text-xs text-muted">Listing ID: {listing.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-foreground">
                      PKR {listing.pricePkr.toLocaleString()}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 ${getStatusBadgeClass(
                        listing.status,
                      )}`}
                    >
                      {listing.status}
                    </span>
                  </div>
                </div>

                {listing.moderatedAt && listing.moderatedByAdmin ? (
                  <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
                    Last moderation by {listing.moderatedByAdmin.name} (
                    {listing.moderatedByAdmin.email}) at{" "}
                    {new Date(listing.moderatedAt).toLocaleString()}
                    {listing.moderationReason
                      ? ` - Reason: ${listing.moderationReason}`
                      : ""}
                  </p>
                ) : null}

                <AdminListingActions
                  listing={{
                    id: listing.id,
                    status: listing.status,
                  }}
                />

                <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Recent Moderation History
                  </h3>
                  {listing.moderationLogs.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      No moderation actions yet for this listing.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                      {listing.moderationLogs.map((log) => (
                        <li key={log.id}>
                          <span className="font-semibold">{logActionLabelMap[log.action]}</span>{" "}
                          ({log.previousStatus} {"->"} {log.nextStatus}) by {log.admin.name} (
                          {new Date(log.createdAt).toLocaleString()}) - Reason: {log.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
