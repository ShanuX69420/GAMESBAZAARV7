import { buildPairLabel, scoreGameCategoryPair } from "@/lib/game-search";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type GamesPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams.q ?? "").trim();

  const offerings = await prisma.gameOffering.findMany({
    orderBy: [
      { game: { name: "asc" } },
      { category: { name: "asc" } },
      { name: "asc" },
    ],
    take: 1500,
    select: {
      id: true,
      gameId: true,
      categoryId: true,
      name: true,
      game: {
        select: {
          name: true,
          icon: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const scoredOfferings = offerings
    .map((offering) => {
      const label = buildPairLabel({
        gameName: offering.game.name,
        categoryName: offering.category.name,
        offeringName: offering.name,
      });
      const score = query
        ? scoreGameCategoryPair(
            {
              gameName: offering.game.name,
              categoryName: offering.category.name,
              offeringName: offering.name,
            },
            query,
          )
        : 0;

      return {
        ...offering,
        label,
        score,
      };
    })
    .filter((offering) => (query ? offering.score > 0 : true))
    .sort((a, b) => {
      if (query && b.score !== a.score) {
        return b.score - a.score;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, 120);

  const listingCounts =
    scoredOfferings.length === 0
      ? []
      : await prisma.listing.groupBy({
          by: ["gameId", "categoryId"],
          where: {
            status: "ACTIVE",
            OR: scoredOfferings.map((offering) => ({
              gameId: offering.gameId,
              categoryId: offering.categoryId,
            })),
          },
          _count: {
            _all: true,
          },
        });

  const listingCountMap = new Map<string, number>();
  for (const entry of listingCounts) {
    listingCountMap.set(`${entry.gameId}:${entry.categoryId}`, entry._count._all);
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Browse</h1>
          <p className="mt-1 text-sm text-muted">
            Search results as game plus category offerings.
          </p>

          <form className="mt-4 flex flex-wrap gap-2" action="/games" method="get">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search game or offering"
              className="min-w-[240px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Search
            </button>
            {query ? (
              <Link
                href="/games"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                aria-label="Clear search"
                title="Clear search"
              >
                X
              </Link>
            ) : null}
          </form>
        </header>

        <section className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {scoredOfferings.length === 0 ? (
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted">No matching offerings found.</p>
            </article>
          ) : null}

          {scoredOfferings.map((offering) => (
            <article
              key={offering.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {offering.game.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={offering.game.icon}
                    alt={`${offering.game.name} icon`}
                    className="h-10 w-10 rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-muted">
                    G
                  </div>
                )}
                <h2 className="text-lg font-semibold text-foreground">{offering.label}</h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                Active listings: {listingCountMap.get(`${offering.gameId}:${offering.categoryId}`) ?? 0}
              </p>

              <Link
                href={`/games/${offering.gameId}/${offering.categoryId}`}
                className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Open Listings
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
