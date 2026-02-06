import { buildPairLabel, scoreGameCategoryPair } from "@/lib/game-search";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length === 0) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

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
    },
  });

  const scoredPairs = offerings
    .map((offering) => {
      const label = buildPairLabel({
        gameName: offering.game.name,
        categoryName: offering.category.name,
        offeringName: offering.name,
      });
      const score = scoreGameCategoryPair(
        {
          gameName: offering.game.name,
          categoryName: offering.category.name,
          offeringName: offering.name,
        },
        query,
      );

      return { score, offering, label };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, 18);

  const suggestions = scoredPairs.map((entry) => ({
    id: `offering:${entry.offering.id}`,
    type: "game_category" as const,
    label: entry.label,
    href: `/games/${entry.offering.gameId}/${entry.offering.categoryId}`,
    gameName: entry.offering.game.name,
    gameIcon: entry.offering.game.icon,
    categoryName: entry.offering.category.name,
  }));

  return NextResponse.json({ suggestions }, { status: 200 });
}
