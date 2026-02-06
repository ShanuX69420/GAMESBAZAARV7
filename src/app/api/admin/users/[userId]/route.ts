import { getAdminForApi } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { deleteLocalProfileImage } from "@/lib/profile-image";
import { AdminActionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const moderationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("block"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("unblock"),
    reason: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("change_display_name"),
    newDisplayName: z.string().trim().min(2).max(60),
  }),
  z.object({
    action: z.literal("remove_profile_picture"),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("deactivate"),
    reason: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("reactivate"),
    reason: z.string().trim().max(300).optional(),
  }),
]);

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const moderationUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isBlocked: true,
  isActive: true,
  blockedAt: true,
  blockedReason: true,
  deactivatedAt: true,
  deactivatedReason: true,
  sessionVersion: true,
} as const;

export async function PATCH(request: Request, context: RouteContext) {
  const adminUser = await getAdminForApi();
  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { userId } = await context.params;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsedAction = moderationActionSchema.safeParse(requestBody);
  if (!parsedAction.success) {
    return NextResponse.json(
      { message: "Invalid moderation action data." },
      { status: 400 },
    );
  }

  if (
    adminUser.id === userId &&
    (parsedAction.data.action === "block" ||
      parsedAction.data.action === "deactivate")
  ) {
    return NextResponse.json(
      { message: "You cannot block or deactivate your own account." },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: moderationUserSelect,
  });

  if (!targetUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  try {
    switch (parsedAction.data.action) {
      case "block": {
        const reason = parsedAction.data.reason;

        if (targetUser.isBlocked) {
          return NextResponse.json(
            { message: "User is already blocked." },
            { status: 409 },
          );
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              isBlocked: true,
              blockedAt: new Date(),
              blockedReason: reason,
              sessionVersion: { increment: 1 },
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.BLOCK_USER,
              reason,
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      case "unblock": {
        const reason = parsedAction.data.reason;

        if (!targetUser.isBlocked) {
          return NextResponse.json(
            { message: "User is not blocked." },
            { status: 409 },
          );
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              isBlocked: false,
              blockedAt: null,
              blockedReason: null,
              sessionVersion: { increment: 1 },
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.UNBLOCK_USER,
              reason,
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      case "change_display_name": {
        const newDisplayName = parsedAction.data.newDisplayName;

        if (targetUser.name === newDisplayName) {
          return NextResponse.json(
            { message: "New display name must be different." },
            { status: 409 },
          );
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              name: newDisplayName,
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.CHANGE_DISPLAY_NAME,
              metadata: {
                previousName: targetUser.name,
                newName: newDisplayName,
              },
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      case "remove_profile_picture": {
        const reason = parsedAction.data.reason;

        if (!targetUser.image) {
          return NextResponse.json(
            { message: "User has no profile picture to remove." },
            { status: 409 },
          );
        }

        await deleteLocalProfileImage(targetUser.image);

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              image: null,
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.REMOVE_PROFILE_PICTURE,
              reason,
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      case "deactivate": {
        const reason = parsedAction.data.reason;

        if (!targetUser.isActive) {
          return NextResponse.json(
            { message: "User is already deactivated." },
            { status: 409 },
          );
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedReason: reason ?? null,
              sessionVersion: { increment: 1 },
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.DEACTIVATE_USER,
              reason,
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      case "reactivate": {
        const reason = parsedAction.data.reason;

        if (targetUser.isActive) {
          return NextResponse.json(
            { message: "User is already active." },
            { status: 409 },
          );
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              isActive: true,
              deactivatedAt: null,
              deactivatedReason: null,
              sessionVersion: { increment: 1 },
            },
            select: moderationUserSelect,
          });

          await tx.adminActionLog.create({
            data: {
              adminId: adminUser.id,
              targetUserId: userId,
              action: AdminActionType.REACTIVATE_USER,
              reason,
            },
          });

          return user;
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }
    }
  } catch {
    return NextResponse.json(
      { message: "Failed to apply moderation action." },
      { status: 500 },
    );
  }
}
