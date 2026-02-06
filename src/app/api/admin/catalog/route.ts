import { getAdminForApi } from "@/lib/current-user";
import { deleteLocalGameImage, saveGameImage } from "@/lib/game-image";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
});

const deleteCategorySchema = z.object({
  categoryId: z.string().trim().min(1),
});

const createGameSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryIds: z.array(z.string().trim().min(1)).min(1),
});

const updateGameCategoriesSchema = z.object({
  gameId: z.string().trim().min(1),
  categoryIds: z.array(z.string().trim().min(1)),
});

const deleteGameSchema = z.object({
  gameId: z.string().trim().min(1),
});

const updateGameIconSchema = z.object({
  gameId: z.string().trim().min(1),
});

const removeGameIconSchema = z.object({
  gameId: z.string().trim().min(1),
});

const updateGameOfferingNameSchema = z.object({
  offeringId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
});

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildDefaultOfferingName(gameName: string, categoryName: string) {
  return `${normalizeName(gameName)} ${normalizeName(categoryName)}`;
}

function buildRedirect(request: Request, message: string, tone: "success" | "error") {
  const url = new URL("/admin/catalog", request.url);
  url.searchParams.set("message", message);
  url.searchParams.set("tone", tone);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const adminUser = await getAdminForApi();
  if (!adminUser) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return buildRedirect(request, "Invalid form submission.", "error");
  }

  const intent = String(formData.get("intent") ?? "").trim();

  try {
    if (intent === "create_category") {
      const parsed = createCategorySchema.safeParse({
        name: formData.get("name"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Category name must be 2-60 characters.", "error");
      }

      const name = normalizeName(parsed.data.name);

      await prisma.category.create({
        data: { name },
      });

      return buildRedirect(request, "Category created.", "success");
    }

    if (intent === "delete_category") {
      const parsed = deleteCategorySchema.safeParse({
        categoryId: formData.get("categoryId"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid category.", "error");
      }

      const listingCount = await prisma.listing.count({
        where: { categoryId: parsed.data.categoryId },
      });

      if (listingCount > 0) {
        return buildRedirect(
          request,
          "Cannot delete category with existing listings.",
          "error",
        );
      }

      await prisma.category.delete({
        where: { id: parsed.data.categoryId },
      });

      return buildRedirect(request, "Category deleted.", "success");
    }

    if (intent === "create_game") {
      const parsed = createGameSchema.safeParse({
        name: formData.get("name"),
        categoryIds: formData.getAll("categoryIds"),
      });

      if (!parsed.success) {
        return buildRedirect(
          request,
          "Game name is required and at least one category must be selected.",
          "error",
        );
      }

      const gameName = normalizeName(parsed.data.name);
      const uniqueCategoryIds = [...new Set(parsed.data.categoryIds)];
      const iconFileValue = formData.get("icon");
      const iconFile =
        iconFileValue instanceof File && iconFileValue.size > 0 ? iconFileValue : null;

      const categories = await prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true, name: true },
      });

      if (categories.length !== uniqueCategoryIds.length) {
        return buildRedirect(request, "One or more categories are invalid.", "error");
      }

      const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));

      let iconPath: string | null = null;
      if (iconFile) {
        try {
          iconPath = await saveGameImage(iconFile);
        } catch (error) {
          if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
            return buildRedirect(request, "Only image files are allowed.", "error");
          }

          if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
            return buildRedirect(request, "Game icon must be 5MB or smaller.", "error");
          }

          return buildRedirect(request, "Failed to upload game icon.", "error");
        }
      }

      try {
        await prisma.$transaction(async (tx) => {
          const game = await tx.game.create({
            data: {
              name: gameName,
              icon: iconPath,
            },
            select: { id: true },
          });

          await tx.gameCategory.createMany({
            data: uniqueCategoryIds.map((categoryId) => ({
              gameId: game.id,
              categoryId,
            })),
          });

          await tx.gameOffering.createMany({
            data: uniqueCategoryIds.map((categoryId) => ({
              gameId: game.id,
              categoryId,
              name: buildDefaultOfferingName(
                gameName,
                categoryNameMap.get(categoryId) ?? "",
              ),
            })),
          });
        });
      } catch (error) {
        await deleteLocalGameImage(iconPath);
        throw error;
      }

      return buildRedirect(request, "Game created.", "success");
    }

    if (intent === "update_game_categories") {
      const parsed = updateGameCategoriesSchema.safeParse({
        gameId: formData.get("gameId"),
        categoryIds: formData.getAll("categoryIds"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid game category update.", "error");
      }

      const uniqueCategoryIds = [...new Set(parsed.data.categoryIds)];

      const game = await prisma.game.findUnique({
        where: { id: parsed.data.gameId },
        select: {
          id: true,
          name: true,
          categoryLinks: {
            select: {
              categoryId: true,
            },
          },
        },
      });

      if (!game) {
        return buildRedirect(request, "Game not found.", "error");
      }

      const categories = await prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true, name: true },
      });

      if (categories.length !== uniqueCategoryIds.length) {
        return buildRedirect(request, "One or more categories are invalid.", "error");
      }

      const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));
      const existingCategoryIdSet = new Set(
        game.categoryLinks.map((link) => link.categoryId),
      );
      const selectedCategoryIdSet = new Set(uniqueCategoryIds);

      const categoriesToAdd = uniqueCategoryIds.filter(
        (categoryId) => !existingCategoryIdSet.has(categoryId),
      );
      const categoriesToRemove = [...existingCategoryIdSet].filter(
        (categoryId) => !selectedCategoryIdSet.has(categoryId),
      );

      if (categoriesToRemove.length > 0) {
        const listingCount = await prisma.listing.count({
          where: {
            gameId: parsed.data.gameId,
            categoryId: { in: categoriesToRemove },
          },
        });

        if (listingCount > 0) {
          return buildRedirect(
            request,
            "Cannot remove categories that already have listings.",
            "error",
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        if (categoriesToRemove.length > 0) {
          await tx.gameCategory.deleteMany({
            where: {
              gameId: parsed.data.gameId,
              categoryId: { in: categoriesToRemove },
            },
          });

          await tx.gameOffering.deleteMany({
            where: {
              gameId: parsed.data.gameId,
              categoryId: { in: categoriesToRemove },
            },
          });
        }

        if (categoriesToAdd.length > 0) {
          await tx.gameCategory.createMany({
            data: categoriesToAdd.map((categoryId) => ({
              gameId: parsed.data.gameId,
              categoryId,
            })),
          });

          await tx.gameOffering.createMany({
            data: categoriesToAdd.map((categoryId) => ({
              gameId: parsed.data.gameId,
              categoryId,
              name: buildDefaultOfferingName(
                game.name,
                categoryNameMap.get(categoryId) ?? "",
              ),
            })),
          });
        }
      });

      return buildRedirect(request, "Game categories updated.", "success");
    }

    if (intent === "update_game_offering_name") {
      const parsed = updateGameOfferingNameSchema.safeParse({
        offeringId: formData.get("offeringId"),
        name: formData.get("name"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid offering name.", "error");
      }

      const offering = await prisma.gameOffering.findUnique({
        where: { id: parsed.data.offeringId },
        select: { id: true },
      });

      if (!offering) {
        return buildRedirect(request, "Offering not found.", "error");
      }

      await prisma.gameOffering.update({
        where: { id: parsed.data.offeringId },
        data: {
          name: normalizeName(parsed.data.name),
        },
      });

      return buildRedirect(request, "Offering label updated.", "success");
    }

    if (intent === "update_game_icon") {
      const parsed = updateGameIconSchema.safeParse({
        gameId: formData.get("gameId"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid game.", "error");
      }

      const iconFileValue = formData.get("icon");
      const iconFile =
        iconFileValue instanceof File && iconFileValue.size > 0 ? iconFileValue : null;

      if (!iconFile) {
        return buildRedirect(request, "Select an image file first.", "error");
      }

      const targetGame = await prisma.game.findUnique({
        where: { id: parsed.data.gameId },
        select: { id: true, icon: true },
      });

      if (!targetGame) {
        return buildRedirect(request, "Game not found.", "error");
      }

      let nextIconPath: string;
      try {
        nextIconPath = await saveGameImage(iconFile);
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
          return buildRedirect(request, "Only image files are allowed.", "error");
        }

        if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
          return buildRedirect(request, "Game icon must be 5MB or smaller.", "error");
        }

        return buildRedirect(request, "Failed to upload game icon.", "error");
      }

      try {
        await prisma.game.update({
          where: { id: parsed.data.gameId },
          data: { icon: nextIconPath },
        });
      } catch {
        await deleteLocalGameImage(nextIconPath);
        return buildRedirect(request, "Failed to update game icon.", "error");
      }

      await deleteLocalGameImage(targetGame.icon);
      return buildRedirect(request, "Game icon updated.", "success");
    }

    if (intent === "remove_game_icon") {
      const parsed = removeGameIconSchema.safeParse({
        gameId: formData.get("gameId"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid game.", "error");
      }

      const targetGame = await prisma.game.findUnique({
        where: { id: parsed.data.gameId },
        select: { id: true, icon: true },
      });

      if (!targetGame) {
        return buildRedirect(request, "Game not found.", "error");
      }

      if (!targetGame.icon) {
        return buildRedirect(request, "Game has no icon.", "error");
      }

      await prisma.game.update({
        where: { id: parsed.data.gameId },
        data: { icon: null },
      });

      await deleteLocalGameImage(targetGame.icon);
      return buildRedirect(request, "Game icon removed.", "success");
    }

    if (intent === "delete_game") {
      const parsed = deleteGameSchema.safeParse({
        gameId: formData.get("gameId"),
      });

      if (!parsed.success) {
        return buildRedirect(request, "Invalid game.", "error");
      }

      const listingCount = await prisma.listing.count({
        where: { gameId: parsed.data.gameId },
      });

      if (listingCount > 0) {
        return buildRedirect(request, "Cannot delete game with existing listings.", "error");
      }

      const targetGame = await prisma.game.findUnique({
        where: { id: parsed.data.gameId },
        select: { icon: true },
      });

      await prisma.game.delete({
        where: { id: parsed.data.gameId },
      });

      await deleteLocalGameImage(targetGame?.icon ?? null);
      return buildRedirect(request, "Game deleted.", "success");
    }

    return buildRedirect(request, "Unknown admin action.", "error");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return buildRedirect(request, "Name already exists.", "error");
    }

    return buildRedirect(request, "Failed to apply catalog change.", "error");
  }
}
