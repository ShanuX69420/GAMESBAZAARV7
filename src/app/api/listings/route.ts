import { getCurrentUser } from "@/lib/current-user";
import {
  getDeliveryTimeLabel,
  isDeliveryTimeOptionValue,
  isInstantDeliveryAllowedForCategory,
} from "@/lib/listing-delivery";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const createListingSchema = z.object({
  gameId: z.string().trim().min(1),
  offeringId: z.string().trim().min(1),
  packageOptionId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  deliveryTimeKey: z.string().trim().min(1).max(32),
  pricePkr: z.number().int().min(1).max(1000000000),
  stockAmount: z.number().int().min(1).max(1000000000).optional(),
  minQuantity: z.number().int().min(1).max(1000000000).optional(),
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
      name: true,
      gameId: true,
      categoryId: true,
      formatType: true,
      currencyMode: true,
      currencyUnitLabel: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!offering || offering.gameId !== parsed.data.gameId) {
    return NextResponse.json(
      { message: "Selected offering is not valid for this game." },
      { status: 400 },
    );
  }

  if (!isDeliveryTimeOptionValue(parsed.data.deliveryTimeKey)) {
    return NextResponse.json({ message: "Invalid delivery time option." }, { status: 400 });
  }

  if (
    parsed.data.deliveryTimeKey === "INSTANT" &&
    !isInstantDeliveryAllowedForCategory(offering.category.name)
  ) {
    return NextResponse.json(
      { message: "Instant delivery is only allowed for Accounts and Gift Cards." },
      { status: 400 },
    );
  }

  const deliveryTimeText = getDeliveryTimeLabel(parsed.data.deliveryTimeKey);

  let formatData: Prisma.InputJsonValue | undefined = undefined;
  let packageOptionId: string | null = null;
  let title: string;
  const offeringName = offering.name.trim();

  if (offering.formatType === "CURRENCY") {
    const unitLabel = offering.currencyUnitLabel?.trim() || "Unit";

    if (offering.currencyMode === "FIXED_PACKAGES") {
      if (!parsed.data.packageOptionId) {
        return NextResponse.json(
          { message: "Select a package option for this listing." },
          { status: 400 },
        );
      }

      const packageOption = await prisma.offeringPackageOption.findFirst({
        where: {
          id: parsed.data.packageOptionId,
          offeringId: offering.id,
        },
        select: {
          id: true,
          amount: true,
        },
      });

      if (!packageOption) {
        return NextResponse.json(
          { message: "Selected package option is invalid." },
          { status: 400 },
        );
      }

      packageOptionId = packageOption.id;
      title = `${offeringName} - ${packageOption.amount.toLocaleString()} ${unitLabel}`;
      formatData = {
        unitLabel,
        amount: packageOption.amount,
      };
    } else {
      const stockAmount = parsed.data.stockAmount;
      const minQuantity = parsed.data.minQuantity;

      if (!stockAmount || !minQuantity) {
        return NextResponse.json(
          { message: "Currency listings require stock and minimum quantity." },
          { status: 400 },
        );
      }

      if (minQuantity > stockAmount) {
        return NextResponse.json(
          { message: "Minimum quantity cannot be greater than stock." },
          { status: 400 },
        );
      }

      title = `${offeringName} - Open Quantity`;
      formatData = {
        unitLabel,
        stockAmount,
        minQuantity,
      };
    }
  } else {
    const normalizedTitle = parsed.data.title?.trim();
    if (!normalizedTitle || normalizedTitle.length < 3) {
      return NextResponse.json(
        { message: "Title is required for account listings." },
        { status: 400 },
      );
    }
    title = normalizedTitle;
  }

  try {
    const listing = await prisma.listing.create({
      data: {
        sellerId: currentUser.id,
        gameId: parsed.data.gameId,
        categoryId: offering.categoryId,
        offeringId: offering.id,
        packageOptionId,
        title,
        description: normalizedDescription,
        deliveryTimeText,
        formatData,
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
