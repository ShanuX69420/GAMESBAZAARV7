import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createListingSchema = z.object({
  gameId: z.string().trim().min(1),
  offeringId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  pricePkr: z.number().int().min(1).max(1000000000),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createListingSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid listing data." }, { status: 400 });
  }

  const normalizedDescription = parsed.data.description?.trim() || null;

  const offering = await prisma.gameOffering.findUnique({
    where: { id: parsed.data.offeringId },
    select: {
      id: true,
      gameId: true,
      categoryId: true,
    },
  });

  if (!offering || offering.gameId !== parsed.data.gameId) {
    return NextResponse.json(
      { message: "Selected offering is not valid for this game." },
      { status: 400 },
    );
  }

  try {
    const listing = await prisma.listing.create({
      data: {
        sellerId: currentUser.id,
        gameId: parsed.data.gameId,
        categoryId: offering.categoryId,
        offeringId: offering.id,
        title: parsed.data.title,
        description: normalizedDescription,
        pricePkr: parsed.data.pricePkr,
      },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Failed to create listing." }, { status: 500 });
  }
}
