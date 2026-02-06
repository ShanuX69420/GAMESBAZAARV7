import { AccountMenu } from "@/components/account-menu";
import {
  HeaderCategoryMenuItem,
  HeaderCategoryMenuSection,
  HeaderCategoryMenus,
} from "@/components/header-category-menus";
import { HeaderSearch } from "@/components/header-search";
import { HeaderMessagesButton } from "@/components/header-messages-button";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { MobileCategoriesMenu } from "@/components/mobile-categories-menu";
import Link from "next/link";

type HeaderMenuKey = "currency" | "accounts" | "topups" | "items" | "boosting";

type HeaderMenuConfig = {
  key: HeaderMenuKey;
  label: string;
  align: "left" | "center" | "right";
};

const desktopMenus: HeaderMenuConfig[] = [
  { key: "currency", label: "Currency", align: "left" },
  { key: "accounts", label: "Accounts", align: "left" },
  { key: "topups", label: "Top Ups", align: "center" },
  { key: "items", label: "Items", align: "center" },
  { key: "boosting", label: "Boosting", align: "right" },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectMenuBucket(
  formatType: "ACCOUNT" | "CURRENCY",
  categoryName: string,
): HeaderMenuKey {
  if (formatType === "CURRENCY") {
    return "currency";
  }

  const normalizedCategory = normalize(categoryName);

  if (normalizedCategory.includes("boost")) {
    return "boosting";
  }

  if (
    normalizedCategory.includes("top up") ||
    normalizedCategory.includes("topup") ||
    normalizedCategory.includes("recharge")
  ) {
    return "topups";
  }

  if (
    normalizedCategory.includes("item") ||
    normalizedCategory.includes("key")
  ) {
    return "items";
  }

  if (normalizedCategory.includes("account")) {
    return "accounts";
  }

  return "accounts";
}

export async function SiteHeader() {
  const [currentUser, offerings] = await Promise.all([
    getCurrentUser(),
    prisma.gameOffering.findMany({
      orderBy: [{ name: "asc" }],
      take: 1000,
      select: {
        id: true,
        name: true,
        formatType: true,
        gameId: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
        game: {
          select: {
            icon: true,
          },
        },
      },
    }),
  ]);

  const offeringIds = offerings.map((offering) => offering.id);

  const listingCounts =
    offeringIds.length === 0
      ? []
      : await prisma.listing.groupBy({
          by: ["offeringId"],
          where: {
            status: "ACTIVE",
            offeringId: { in: offeringIds },
          },
          _count: { _all: true },
        });

  const listingCountMap = new Map(
    listingCounts.map((entry) => [entry.offeringId ?? "", entry._count._all]),
  );

  const allMenuEntries = offerings
    .map((offering) => ({
      bucket: detectMenuBucket(offering.formatType, offering.category.name),
      id: offering.id,
      label: offering.name,
      href: `/games/${offering.gameId}/${offering.categoryId}`,
      gameIcon: offering.game.icon,
      activeListings: listingCountMap.get(offering.id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const menuData = new Map<
    HeaderMenuKey,
    {
      popularItems: HeaderCategoryMenuItem[];
      allItems: HeaderCategoryMenuItem[];
    }
  >();

  for (const menu of desktopMenus) {
    const menuEntries = allMenuEntries.filter((entry) => entry.bucket === menu.key);
    const allItems = menuEntries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      href: entry.href,
      gameIcon: entry.gameIcon,
    }));

    const popularItems = [...menuEntries]
      .filter((entry) => entry.activeListings > 0)
      .sort((a, b) => {
        if (b.activeListings !== a.activeListings) {
          return b.activeListings - a.activeListings;
        }
        return a.label.localeCompare(b.label);
      })
      .slice(0, 12)
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        href: entry.href,
        gameIcon: entry.gameIcon,
      }));

    menuData.set(menu.key, {
      popularItems,
      allItems,
    });
  }

  const desktopMenuSections: HeaderCategoryMenuSection[] = desktopMenus.map((menu) => ({
    key: menu.key,
    label: menu.label,
    popularItems: menuData.get(menu.key)?.popularItems ?? [],
    allItems: menuData.get(menu.key)?.allItems ?? [],
  }));

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur">
      <PresenceHeartbeat enabled={Boolean(currentUser)} />
      <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MobileCategoriesMenu
                sections={desktopMenuSections}
                buttonClassName="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition hover:bg-surface"
              />
              <Link
                href="/"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm"
                aria-label="Go to home"
              >
                G
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <HeaderMessagesButton
                    currentUserId={currentUser.id}
                    href="/messages?view=list"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface"
                    iconClassName="h-4 w-4"
                    ariaLabel="Messages"
                    title="Messages"
                  />
                  <AccountMenu
                    name={currentUser.name}
                    email={currentUser.email}
                    image={currentUser.image}
                    isAdmin={currentUser.role === "ADMIN"}
                  />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <div className="mt-3">
            <HeaderSearch mobile />
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 lg:shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              G
            </span>
            <Link
              href="/"
              className="text-[32px] font-semibold leading-none tracking-tight text-foreground"
            >
              GamesBazaar
            </Link>
          </div>

          <nav className="hidden gap-1 lg:flex lg:items-center">
            <HeaderCategoryMenus sections={desktopMenuSections} />
          </nav>

          <HeaderSearch />

          <div className="ml-auto flex items-center gap-2">
            {currentUser ? (
              <>
                <HeaderMessagesButton
                  currentUserId={currentUser.id}
                  href="/messages?view=list"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface"
                  iconClassName="h-5 w-5"
                  ariaLabel="Messages"
                  title="Messages"
                />
                <AccountMenu
                  name={currentUser.name}
                  email={currentUser.email}
                  image={currentUser.image}
                  isAdmin={currentUser.role === "ADMIN"}
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
