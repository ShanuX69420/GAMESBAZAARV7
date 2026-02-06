import { getAdminForApi } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ListingModerationActionType, ListingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const listingModerationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("hide"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("remove"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("restore"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("pause"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("unpause"),
    reason: z.string().trim().min(3).max(300),
  }),
]);

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

function resolveTransition(action: string, currentStatus: ListingStatus) {
  if (action === "hide") {
    if (currentStatus === ListingStatus.HIDDEN_BY_ADMIN) {
      return { error: "Listing is already hidden." };
    }
    if (currentStatus === ListingStatus.REMOVED_BY_ADMIN) {
      return { error: "Restore listing before hiding it." };
    }

    return {
      nextStatus: ListingStatus.HIDDEN_BY_ADMIN,
      logAction: ListingModerationActionType.HIDE_LISTING,
    };
  }

  if (action === "remove") {
    if (currentStatus === ListingStatus.REMOVED_BY_ADMIN) {
      return { error: "Listing is already removed." };
    }

    return {
      nextStatus: ListingStatus.REMOVED_BY_ADMIN,
      logAction: ListingModerationActionType.REMOVE_LISTING,
    };
  }

  if (action === "restore") {
    if (currentStatus === ListingStatus.ACTIVE) {
      return { error: "Listing is already active." };
    }
    if (currentStatus === ListingStatus.PAUSED) {
      return { error: "Use unpause for paused listings." };
    }
    if (
      currentStatus !== ListingStatus.HIDDEN_BY_ADMIN &&
      currentStatus !== ListingStatus.REMOVED_BY_ADMIN
    ) {
      return { error: "This listing cannot be restored from current status." };
    }

    return {
      nextStatus: ListingStatus.ACTIVE,
      logAction: ListingModerationActionType.RESTORE_LISTING,
    };
  }

  if (action === "pause") {
    if (currentStatus === ListingStatus.PAUSED) {
      return { error: "Listing is already paused." };
    }
    if (currentStatus !== ListingStatus.ACTIVE) {
      return { error: "Only active listings can be paused." };
    }

    return {
      nextStatus: ListingStatus.PAUSED,
      logAction: ListingModerationActionType.PAUSE_LISTING,
    };
  }

  if (action === "unpause") {
    if (currentStatus !== ListingStatus.PAUSED) {
      return { error: "Only paused listings can be unpaused." };
    }

    return {
      nextStatus: ListingStatus.ACTIVE,
      logAction: ListingModerationActionType.UNPAUSE_LISTING,
    };
  }

  return { error: "Unsupported moderation action." };
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminUser = await getAdminForApi();
  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { listingId } = await context.params;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsedAction = listingModerationSchema.safeParse(requestBody);
  if (!parsedAction.success) {
    return NextResponse.json(
      { message: "Invalid moderation payload." },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ message: "Listing not found." }, { status: 404 });
  }

  const transition = resolveTransition(parsedAction.data.action, listing.status);
  if ("error" in transition) {
    return NextResponse.json({ message: transition.error }, { status: 409 });
  }

  try {
    const updatedListing = await prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: listingId },
        data: {
          status: transition.nextStatus,
          moderatedByAdminId: adminUser.id,
          moderatedAt: new Date(),
          moderationReason: parsedAction.data.reason,
        },
        select: {
          id: true,
          status: true,
          moderatedAt: true,
          moderationReason: true,
        },
      });

      await tx.listingModerationLog.create({
        data: {
          listingId,
          adminId: adminUser.id,
          action: transition.logAction,
          reason: parsedAction.data.reason,
          previousStatus: listing.status,
          nextStatus: transition.nextStatus,
        },
      });

      return updated;
    });

    return NextResponse.json({ listing: updatedListing }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Failed to apply listing moderation action." },
      { status: 500 },
    );
  }
}
