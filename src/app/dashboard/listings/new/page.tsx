import { ListingCreateForm } from "@/components/listing-create-form";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewListingPage() {
  await requireCurrentUser();

  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      offerings: {
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const formGames = games
    .map((game) => ({
      id: game.id,
      name: game.name,
      offerings: game.offerings.map((offering) => ({
        id: offering.id,
        name: offering.name,
        categoryName: offering.category.name,
      })),
    }))
    .filter((game) => game.offerings.length > 0);

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create Listing
            </h1>
            <p className="mt-1 text-sm text-muted">
              Select a game and admin-configured offering.
            </p>
          </div>

          <Link
            href="/dashboard/listings"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Back
          </Link>
        </div>

        {formGames.length === 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No offerings are configured by admin yet. Ask admin to add games, categories,
            and offering labels first.
          </div>
        ) : (
          <ListingCreateForm games={formGames} />
        )}
      </main>
    </div>
  );
}
