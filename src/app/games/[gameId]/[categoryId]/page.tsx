import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type GameCategoryPageProps = {
  params: Promise<{
    gameId: string;
    categoryId: string;
  }>;
};

export default async function GameCategoryPage({ params }: GameCategoryPageProps) {
  const { gameId, categoryId } = await params;

  const pair = await prisma.gameCategory.findUnique({
    where: {
      gameId_categoryId: {
        gameId,
        categoryId,
      },
    },
    select: {
      gameId: true,
      categoryId: true,
      game: {
        select: {
          id: true,
          name: true,
          icon: true,
          offerings: {
            select: {
              categoryId: true,
              name: true,
            },
          },
          categoryLinks: {
            orderBy: { category: { name: "asc" } },
            select: {
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!pair) {
    notFound();
  }

  const currentOffering = pair.game.offerings.find(
    (offering) => offering.categoryId === categoryId,
  );
  const pageTitle = currentOffering?.name ?? `${pair.game.name} ${pair.category.name}`;

  const listings = await prisma.listing.findMany({
    where: {
      gameId,
      categoryId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      description: true,
      pricePkr: true,
      createdAt: true,
      seller: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              {pair.game.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pair.game.icon}
                  alt={`${pair.game.name} icon`}
                  className="h-10 w-10 rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-muted">
                  G
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="no-scrollbar mt-3 flex min-w-max gap-1 overflow-x-auto border-t border-border pt-2">
            {pair.game.categoryLinks.map((link) => {
              const isActive = link.categoryId === categoryId;

              return (
                <Link
                  key={link.categoryId}
                  href={`/games/${pair.gameId}/${link.categoryId}`}
                  className={`inline-flex items-center gap-1 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <span>{link.category.name}</span>
                </Link>
              );
            })}
          </div>
        </header>

        <section className="mt-4 grid gap-3">
          {listings.length === 0 ? (
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted">
                No active listings for this game category yet.
              </p>
            </article>
          ) : null}

          {listings.map((listing) => (
            <article
              key={listing.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{listing.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Seller: {listing.seller.name} -{" "}
                    {new Date(listing.createdAt).toLocaleString()}
                  </p>
                </div>

                <p className="text-sm font-semibold text-foreground">
                  PKR {listing.pricePkr.toLocaleString()}
                </p>
              </div>

              {listing.description ? (
                <p className="mt-3 text-sm text-foreground">{listing.description}</p>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
