import { ListingMessageBox } from "@/components/listing-message-box";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ListingDetailPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  const currentUser = await getCurrentUser();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      description: true,
      deliveryTimeText: true,
      pricePkr: true,
      status: true,
      createdAt: true,
      gameId: true,
      categoryId: true,
      sellerId: true,
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
          lastSeenAt: true,
        },
      },
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
          formatType: true,
          name: true,
        },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  const isOwner = currentUser?.id === listing.sellerId;
  const isAdmin = currentUser?.role === "ADMIN";
  const canPreviewInactive = Boolean(isOwner || isAdmin);

  if (listing.status !== "ACTIVE" && !canPreviewInactive) {
    notFound();
  }

  if (listing.offering?.formatType === "CURRENCY") {
    redirect(`/games/${listing.gameId}/${listing.categoryId}`);
  }

  const otherListings = await prisma.listing.findMany({
    where: {
      id: { not: listing.id },
      gameId: listing.gameId,
      categoryId: listing.categoryId,
      offeringId: listing.offering?.id ?? undefined,
      status: "ACTIVE",
    },
    orderBy: [{ pricePkr: "asc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      pricePkr: true,
      deliveryTimeText: true,
      seller: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {listing.game.name} · {listing.category.name}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {listing.title}
                </h1>
              </div>
            </div>

            <Link
              href={`/games/${listing.gameId}/${listing.categoryId}`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Back to listings
            </Link>
          </div>

          {listing.status !== "ACTIVE" && canPreviewInactive ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              Preview mode: this listing status is <span className="font-semibold">{listing.status}</span>.
            </p>
          ) : null}
        </header>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              {listing.seller.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.seller.image}
                  alt={`${listing.seller.name} profile`}
                  className="h-12 w-12 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-muted">
                  {listing.seller.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-foreground">{listing.seller.name}</p>
                <p className="text-sm text-muted">
                  Delivery: {listing.deliveryTimeText ?? "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-sm font-semibold text-foreground">Listing Details</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {listing.description?.trim() || "Seller has not added additional details yet."}
              </p>
            </div>
          </article>

          <div className="space-y-4">
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted">Price</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                PKR {listing.pricePkr.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted">
                Posted: {new Date(listing.createdAt).toLocaleString()}
              </p>

              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Buy now
              </button>
            </article>

            <ListingMessageBox
              currentUserId={currentUser?.id ?? null}
              currentUserName={currentUser?.name ?? "User"}
              sellerId={listing.sellerId}
              sellerName={listing.seller.name}
              sellerImage={listing.seller.image}
              sellerLastSeenAt={
                listing.seller.lastSeenAt ? listing.seller.lastSeenAt.toISOString() : null
              }
            />
          </div>
        </section>

        {otherListings.length > 0 ? (
          <section className="mt-4">
            <h2 className="text-lg font-semibold text-foreground">
              Other sellers ({otherListings.length})
            </h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {otherListings.map((otherListing) => (
                <Link
                  key={otherListing.id}
                  href={`/listings/${otherListing.id}`}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-accent hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-foreground">{otherListing.title}</p>
                  <p className="mt-2 text-xs text-muted">{otherListing.seller.name}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    PKR {otherListing.pricePkr.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">
                    {otherListing.deliveryTimeText ?? "Not specified"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
