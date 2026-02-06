import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SellerListingsPageProps = {
  searchParams: Promise<{
    message?: string;
    tone?: string;
  }>;
};

export default async function SellerListingsPage({
  searchParams,
}: SellerListingsPageProps) {
  const currentUser = await requireCurrentUser();
  const resolvedSearchParams = await searchParams;

  const listings = await prisma.listing.findMany({
    where: { sellerId: currentUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      pricePkr: true,
      status: true,
      createdAt: true,
      game: { select: { name: true } },
      category: { select: { name: true } },
      offering: { select: { name: true } },
    },
    take: 100,
  });

  const tone = resolvedSearchParams.tone === "error" ? "error" : "success";
  const message =
    typeof resolvedSearchParams.message === "string"
      ? resolvedSearchParams.message
      : "";

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                My Listings
              </h1>
              <p className="mt-1 text-sm text-muted">
                Manage listings linked to admin-defined offerings.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/dashboard/listings/new"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Create Listing
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          {message ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm font-medium ${
                tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          ) : null}
        </header>

        <section className="mt-4 grid gap-3">
          {listings.length === 0 ? (
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted">No listings yet.</p>
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{listing.title}</h2>
                    <p className="mt-1 text-sm text-muted">{offeringLabel}</p>
                    <p className="mt-1 text-xs text-muted">
                      Created: {new Date(listing.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      PKR {listing.pricePkr.toLocaleString()}
                    </p>
                    <span className="mt-2 inline-flex rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">
                      {listing.status}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
