import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  CurrencyMode,
  ListingStatus,
  OfferingFormatType,
  PrismaClient,
  Role,
} from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "DemoPass123!";

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function upsertCategory(name) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true, name: true },
  });
}

async function upsertGame(name) {
  return prisma.game.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true, name: true },
  });
}

async function ensureGameCategory(gameId, categoryId) {
  await prisma.gameCategory.upsert({
    where: { gameId_categoryId: { gameId, categoryId } },
    update: {},
    create: { gameId, categoryId },
  });
}

async function upsertOffering({
  gameId,
  categoryId,
  name,
  formatType,
  currencyMode,
  currencyUnitLabel,
}) {
  const desiredName = normalize(name);
  const existingByPair = await prisma.gameOffering.findUnique({
    where: { gameId_categoryId: { gameId, categoryId } },
    select: { id: true, name: true },
  });

  if (existingByPair) {
    let nextName = existingByPair.name;

    if (existingByPair.name !== desiredName) {
      const conflictingOffering = await prisma.gameOffering.findFirst({
        where: {
          gameId,
          name: desiredName,
          NOT: { id: existingByPair.id },
        },
        select: { id: true },
      });

      if (!conflictingOffering) {
        nextName = desiredName;
      }
    }

    return prisma.gameOffering.update({
      where: { id: existingByPair.id },
      data: {
        name: nextName,
        formatType,
        currencyMode,
        currencyUnitLabel,
      },
      select: {
        id: true,
        gameId: true,
        categoryId: true,
        name: true,
        formatType: true,
        currencyMode: true,
        currencyUnitLabel: true,
      },
    });
  }

  let finalCreateName = desiredName;
  let suffix = 2;
  // Avoid collisions on @@unique([gameId, name]) in existing datasets.
  for (;;) {
    const conflictingOffering = await prisma.gameOffering.findFirst({
      where: {
        gameId,
        name: finalCreateName,
      },
      select: { id: true },
    });

    if (!conflictingOffering) {
      break;
    }

    finalCreateName = `${desiredName} ${suffix}`;
    suffix += 1;
  }

  return prisma.gameOffering.create({
    data: {
      gameId,
      categoryId,
      name: finalCreateName,
      formatType,
      currencyMode,
      currencyUnitLabel,
    },
    select: {
      id: true,
      gameId: true,
      categoryId: true,
      name: true,
      formatType: true,
      currencyMode: true,
      currencyUnitLabel: true,
    },
  });
}

async function upsertSeller({ email, name, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.USER,
      isBlocked: false,
      isActive: true,
      blockedAt: null,
      blockedReason: null,
      deactivatedAt: null,
      deactivatedReason: null,
    },
    create: {
      email,
      name,
      passwordHash,
      role: Role.USER,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

try {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [accountsCategory, ucCategory, coinsCategory] = await Promise.all([
    upsertCategory("Accounts"),
    upsertCategory("UC"),
    upsertCategory("Coins"),
  ]);

  const [gtaGame, pubgGame, eightBallGame] = await Promise.all([
    upsertGame("Grand Theft Auto 5"),
    upsertGame("PUBG Mobile"),
    upsertGame("8 Ball Pool"),
  ]);

  await Promise.all([
    ensureGameCategory(gtaGame.id, accountsCategory.id),
    ensureGameCategory(pubgGame.id, accountsCategory.id),
    ensureGameCategory(pubgGame.id, ucCategory.id),
    ensureGameCategory(eightBallGame.id, coinsCategory.id),
  ]);

  const [gtaAccountsOffering, pubgAccountsOffering, pubgUcOffering, eightBallCoinsOffering] =
    await Promise.all([
      upsertOffering({
        gameId: gtaGame.id,
        categoryId: accountsCategory.id,
        name: "GTA 5 Accounts",
        formatType: OfferingFormatType.ACCOUNT,
        currencyMode: CurrencyMode.OPEN_QUANTITY,
        currencyUnitLabel: null,
      }),
      upsertOffering({
        gameId: pubgGame.id,
        categoryId: accountsCategory.id,
        name: "PUBG Mobile Accounts",
        formatType: OfferingFormatType.ACCOUNT,
        currencyMode: CurrencyMode.OPEN_QUANTITY,
        currencyUnitLabel: null,
      }),
      upsertOffering({
        gameId: pubgGame.id,
        categoryId: ucCategory.id,
        name: "PUBG Mobile UC",
        formatType: OfferingFormatType.CURRENCY,
        currencyMode: CurrencyMode.FIXED_PACKAGES,
        currencyUnitLabel: "UC",
      }),
      upsertOffering({
        gameId: eightBallGame.id,
        categoryId: coinsCategory.id,
        name: "8 Ball Pool Coins",
        formatType: OfferingFormatType.CURRENCY,
        currencyMode: CurrencyMode.OPEN_QUANTITY,
        currencyUnitLabel: "Coins",
      }),
    ]);

  const fixedPackageAmounts = [60, 325, 660, 1800, 3850, 8100];
  for (const amount of fixedPackageAmounts) {
    await prisma.offeringPackageOption.upsert({
      where: {
        offeringId_amount: {
          offeringId: pubgUcOffering.id,
          amount,
        },
      },
      update: {},
      create: {
        offeringId: pubgUcOffering.id,
        amount,
      },
    });
  }

  const packageOptions = await prisma.offeringPackageOption.findMany({
    where: { offeringId: pubgUcOffering.id },
    orderBy: { amount: "asc" },
    select: { id: true, amount: true },
  });
  const packageOptionByAmount = new Map(
    packageOptions.map((option) => [option.amount, option]),
  );

  const sellerConfigs = [
    {
      email: "seller.alpha@gamesbazaar.local",
      name: "AlphaSeller",
    },
    {
      email: "seller.bravo@gamesbazaar.local",
      name: "BravoStore",
    },
    {
      email: "seller.charlie@gamesbazaar.local",
      name: "CharlieTrade",
    },
  ];

  const sellers = [];
  for (const config of sellerConfigs) {
    sellers.push(
      await upsertSeller({
        ...config,
        passwordHash,
      }),
    );
  }

  const [sellerAlpha, sellerBravo, sellerCharlie] = sellers;

  await prisma.listing.deleteMany({
    where: {
      sellerId: {
        in: sellers.map((seller) => seller.id),
      },
    },
  });

  const firstAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  const listingsToCreate = [
    {
      sellerId: sellerAlpha.id,
      gameId: gtaGame.id,
      categoryId: accountsCategory.id,
      offeringId: gtaAccountsOffering.id,
      title: "[Seed] GTA 5 Account - Rank 250",
      description:
        "Platform: PC | Money: 120M | Rank 250 | Full access email included.",
      deliveryTimeText: "5 min - 15 min",
      pricePkr: 7800,
      status: ListingStatus.ACTIVE,
      formatData: null,
    },
    {
      sellerId: sellerBravo.id,
      gameId: gtaGame.id,
      categoryId: accountsCategory.id,
      offeringId: gtaAccountsOffering.id,
      title: "[Seed] GTA 5 Account - Starter Bundle",
      description:
        "Platform: PC | Rank 120 | Includes vehicles and starter businesses.",
      deliveryTimeText: "10 min - 30 min",
      pricePkr: 5600,
      status: ListingStatus.ACTIVE,
      formatData: null,
    },
    {
      sellerId: sellerCharlie.id,
      gameId: gtaGame.id,
      categoryId: accountsCategory.id,
      offeringId: gtaAccountsOffering.id,
      title: "[Seed] GTA 5 Account - Veteran",
      description: "High-end account with rare unlocks and maxed stats.",
      deliveryTimeText: "15 min - 45 min",
      pricePkr: 11200,
      status: ListingStatus.PAUSED,
      formatData: null,
    },
    {
      sellerId: sellerAlpha.id,
      gameId: pubgGame.id,
      categoryId: accountsCategory.id,
      offeringId: pubgAccountsOffering.id,
      title: "[Seed] PUBG Mobile Account - Conqueror Ready",
      description: "Level 74, premium skins, linked email included.",
      deliveryTimeText: "10 min - 25 min",
      pricePkr: 9400,
      status: ListingStatus.ACTIVE,
      formatData: null,
    },
    {
      sellerId: sellerAlpha.id,
      gameId: eightBallGame.id,
      categoryId: coinsCategory.id,
      offeringId: eightBallCoinsOffering.id,
      title: "[Seed] 8 Ball Coins - Fast Delivery",
      description:
        "Send player ID after order. Safe transfer method. 24/7 support.",
      deliveryTimeText: "1 min - 10 min",
      pricePkr: 12,
      status: ListingStatus.ACTIVE,
      formatData: {
        unitLabel: "Coins",
        stockAmount: 2200000,
        minQuantity: 1000,
      },
    },
    {
      sellerId: sellerBravo.id,
      gameId: eightBallGame.id,
      categoryId: coinsCategory.id,
      offeringId: eightBallCoinsOffering.id,
      title: "[Seed] 8 Ball Coins - Budget Seller",
      description: "Bulk coin delivery with instant response.",
      deliveryTimeText: "3 min - 20 min",
      pricePkr: 10,
      status: ListingStatus.ACTIVE,
      formatData: {
        unitLabel: "Coins",
        stockAmount: 1800000,
        minQuantity: 2000,
      },
    },
    {
      sellerId: sellerCharlie.id,
      gameId: eightBallGame.id,
      categoryId: coinsCategory.id,
      offeringId: eightBallCoinsOffering.id,
      title: "[Seed] 8 Ball Coins - Admin Hidden Example",
      description: "Hidden demo listing for admin moderation page.",
      deliveryTimeText: "5 min - 30 min",
      pricePkr: 14,
      status: ListingStatus.HIDDEN_BY_ADMIN,
      moderatedByAdminId: firstAdmin?.id ?? null,
      moderatedAt: new Date(),
      moderationReason: "Seeded hidden example",
      formatData: {
        unitLabel: "Coins",
        stockAmount: 1200000,
        minQuantity: 1500,
      },
    },
  ];

  for (const amount of [60, 325, 660, 1800, 3850, 8100]) {
    const packageOption = packageOptionByAmount.get(amount);
    if (!packageOption) {
      continue;
    }

    listingsToCreate.push({
      sellerId: sellerAlpha.id,
      gameId: pubgGame.id,
      categoryId: ucCategory.id,
      offeringId: pubgUcOffering.id,
      packageOptionId: packageOption.id,
      title: `[Seed] PUBG UC ${amount.toLocaleString()} Package`,
      description:
        "Share player ID and region. Delivery is manual but fast with confirmation.",
      deliveryTimeText: "1 min - 20 min",
      pricePkr: Math.max(200, Math.round(amount * 2.7)),
      status: ListingStatus.ACTIVE,
      formatData: {
        unitLabel: "UC",
        amount,
      },
    });
  }

  for (const amount of [60, 325, 660]) {
    const packageOption = packageOptionByAmount.get(amount);
    if (!packageOption) {
      continue;
    }

    listingsToCreate.push({
      sellerId: sellerBravo.id,
      gameId: pubgGame.id,
      categoryId: ucCategory.id,
      offeringId: pubgUcOffering.id,
      packageOptionId: packageOption.id,
      title: `[Seed] PUBG UC ${amount.toLocaleString()} Package - Alt Seller`,
      description: "Alternative seller for package comparison.",
      deliveryTimeText: "5 min - 30 min",
      pricePkr: Math.max(220, Math.round(amount * 2.9)),
      status: ListingStatus.ACTIVE,
      formatData: {
        unitLabel: "UC",
        amount,
      },
    });
  }

  await prisma.listing.createMany({
    data: listingsToCreate,
  });

  console.log("Seeded demo listings successfully.");
  console.log("Demo seller credentials:");
  console.log(`- seller.alpha@gamesbazaar.local / ${DEMO_PASSWORD}`);
  console.log(`- seller.bravo@gamesbazaar.local / ${DEMO_PASSWORD}`);
  console.log(`- seller.charlie@gamesbazaar.local / ${DEMO_PASSWORD}`);
  console.log(
    `Created ${listingsToCreate.length} listings across account, open currency, and fixed packages.`,
  );
} catch (error) {
  console.error("Failed to seed demo listings.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
