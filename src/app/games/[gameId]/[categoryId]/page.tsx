import { OpenQuantityCheckoutCard } from "@/components/open-quantity-checkout-card";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

type GameCategoryPageProps = {
  params: Promise<{
    gameId: string;
    categoryId: string;
  }>;
  searchParams: Promise<{
    package?: string;
  }>;
};

type CurrencyListingData = {
  unitLabel: string;
  stockAmount: number;
  minQuantity: number;
};

type FixedPackageListingData = {
  unitLabel: string;
  amount: number;
};

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function isInstantDelivery(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return value.toLowerCase().includes("instant");
}

function parseOpenQuantityData(
  value: Prisma.JsonValue | null,
  fallbackUnitLabel: string,
): CurrencyListingData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const stockAmount = objectValue.stockAmount;
  const minQuantity = objectValue.minQuantity;

  if (
    typeof stockAmount !== "number" ||
    !Number.isInteger(stockAmount) ||
    stockAmount < 1 ||
    typeof minQuantity !== "number" ||
    !Number.isInteger(minQuantity) ||
    minQuantity < 1
  ) {
    return null;
  }

  return {
    // Always trust current offering unit from admin settings.
    unitLabel: fallbackUnitLabel,
    stockAmount,
    minQuantity,
  };
}

function parseFixedPackageData(
  value: Prisma.JsonValue | null,
  fallbackUnitLabel: string,
): FixedPackageListingData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const amount = objectValue.amount;

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 1
  ) {
    return null;
  }

  return {
    // Always trust current offering unit from admin settings.
    unitLabel: fallbackUnitLabel,
    amount,
  };
}

export default async function GameCategoryPage({
  params,
  searchParams,
}: GameCategoryPageProps) {
  const { gameId, categoryId } = await params;
  const resolvedSearchParams = await searchParams;

  const pair = await prisma.gameCategory.findUnique({
    where: {
      gameId_categoryId: {
        gameId,
        categoryId,
      },
    },
    select: {
      gameId: true,
      categoryId: true,
      game: {
        select: {
          id: true,
          name: true,
          icon: true,
          offerings: {
            select: {
              id: true,
              categoryId: true,
              name: true,
              formatType: true,
              currencyMode: true,
              currencyUnitLabel: true,
              packageOptions: {
                select: {
                  id: true,
                  amount: true,
                },
                orderBy: { amount: "asc" },
              },
            },
          },
          categoryLinks: {
            orderBy: { category: { name: "asc" } },
            select: {
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
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

  if (!pair) {
    notFound();
  }

  const currentOffering = pair.game.offerings.find(
    (offering) => offering.categoryId === categoryId,
  );
  if (!currentOffering) {
    notFound();
  }

  const pageTitle = currentOffering.name ?? `${pair.game.name} ${pair.category.name}`;
  const isCurrencyOffering = currentOffering.formatType === "CURRENCY";
  const isFixedPackages =
    isCurrencyOffering && currentOffering.currencyMode === "FIXED_PACKAGES";
  const currencyUnitLabel = currentOffering.currencyUnitLabel?.trim() || "Unit";

  const listings = await prisma.listing.findMany({
    where: {
      gameId,
      categoryId,
      status: "ACTIVE",
      offeringId: currentOffering.id,
    },
    orderBy:
      isCurrencyOffering
        ? [{ pricePkr: "asc" }, { createdAt: "asc" }]
        : [{ createdAt: "desc" }],
    take: 60,
    select: {
      id: true,
      title: true,
      description: true,
      pricePkr: true,
      createdAt: true,
      deliveryTimeText: true,
      formatData: true,
      packageOptionId: true,
      packageOption: {
        select: {
          id: true,
          amount: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const openCurrencyListings = listings.map((listing) => {
    const parsedData = parseOpenQuantityData(listing.formatData, currencyUnitLabel);
    return {
      ...listing,
      currencyData: parsedData ?? {
        unitLabel: currencyUnitLabel,
        stockAmount: 1,
        minQuantity: 1,
      },
    };
  });

  const primaryOpenCurrencyListing =
    isCurrencyOffering && !isFixedPackages ? openCurrencyListings[0] ?? null : null;
  const otherOpenCurrencyListings =
    isCurrencyOffering && !isFixedPackages ? openCurrencyListings.slice(1) : [];

  const fixedPackageListings = listings
    .map((listing) => {
      const parsedData = parseFixedPackageData(listing.formatData, currencyUnitLabel);
      return {
        ...listing,
        fixedPackageData: parsedData,
      };
    })
    .filter((listing) => listing.packageOptionId && listing.fixedPackageData);

  const listingsByPackageId = new Map<string, typeof fixedPackageListings>();
  for (const listing of fixedPackageListings) {
    const packageId = listing.packageOptionId;
    if (!packageId) {
      continue;
    }
    const existing = listingsByPackageId.get(packageId) ?? [];
    existing.push(listing);
    listingsByPackageId.set(packageId, existing);
  }

  const selectedPackageIdFromQuery = resolvedSearchParams.package?.trim() ?? "";
  const hasSelectedPackageFromQuery = currentOffering.packageOptions.some(
    (option) => option.id === selectedPackageIdFromQuery,
  );
  const defaultPackageId =
    currentOffering.packageOptions.find((option) =>
      listingsByPackageId.has(option.id),
    )?.id ??
    currentOffering.packageOptions[0]?.id ??
    "";
  const selectedPackageId = hasSelectedPackageFromQuery
    ? selectedPackageIdFromQuery
    : defaultPackageId;

  const selectedPackageOption =
    currentOffering.packageOptions.find((option) => option.id === selectedPackageId) ?? null;
  const selectedPackageListings = [
    ...(listingsByPackageId.get(selectedPackageId) ?? []),
  ].sort((a, b) => {
    if (a.pricePkr !== b.pricePkr) {
      return a.pricePkr - b.pricePkr;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const primaryFixedListing = selectedPackageListings[0] ?? null;
  const otherFixedListings = selectedPackageListings.slice(1);

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              {pair.game.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pair.game.icon}
                  alt={`${pair.game.name} icon`}
                  className="h-10 w-10 rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-muted">
                  G
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="no-scrollbar mt-3 flex min-w-max gap-1 overflow-x-auto border-t border-border pt-2">
            {pair.game.categoryLinks.map((link) => {
              const isActive = link.categoryId === categoryId;

              return (
                <Link
                  key={link.categoryId}
                  href={`/games/${pair.gameId}/${link.categoryId}`}
                  className={`inline-flex items-center gap-1 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <span>{link.category.name}</span>
                </Link>
              );
            })}
          </div>
        </header>

        {isCurrencyOffering ? (
          <section className="mt-4 space-y-4">
            {isFixedPackages ? (
              <>
                <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
                  <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-foreground">Select amount</h2>

                    {currentOffering.packageOptions.length === 0 ? (
                      <p className="mt-3 text-sm text-muted">
                        No package amounts configured by admin yet.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {currentOffering.packageOptions.map((option) => {
                          const packageListings = listingsByPackageId.get(option.id) ?? [];
                          const lowestPrice = packageListings.reduce<number | null>(
                            (lowest, listing) => {
                              if (lowest === null) {
                                return listing.pricePkr;
                              }
                              return Math.min(lowest, listing.pricePkr);
                            },
                            null,
                          );
                          const isActive = option.id === selectedPackageId;

                          return (
                            <Link
                              key={option.id}
                              href={`/games/${pair.gameId}/${categoryId}?package=${option.id}`}
                              className={`rounded-lg border p-3 transition ${
                                isActive
                                  ? "border-accent bg-emerald-50"
                                  : "border-border bg-white hover:bg-surface"
                              }`}
                            >
                              <p className="text-lg font-semibold text-foreground">
                                {option.amount.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted">{currencyUnitLabel}</p>
                              <p className="mt-3 text-sm font-semibold text-foreground">
                                {lowestPrice === null
                                  ? "No sellers"
                                  : `PKR ${lowestPrice.toLocaleString()}`}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </article>

                  <div className="space-y-4">
                    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <p className="text-sm text-muted">
                        {selectedPackageOption
                          ? `${selectedPackageOption.amount.toLocaleString()} ${currencyUnitLabel}`
                          : "No package selected"}
                      </p>

                      {primaryFixedListing ? (
                        <>
                          <p className="mt-2 text-2xl font-semibold text-foreground">
                            PKR {primaryFixedListing.pricePkr.toLocaleString()}
                          </p>
                          <p className="mt-2 text-sm text-muted">
                            Delivery: {primaryFixedListing.deliveryTimeText ?? "Not specified"}
                          </p>
                          <p className="mt-2 text-sm text-muted">
                            Seller: {primaryFixedListing.seller.name}
                          </p>

                          <button
                            type="button"
                            className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                          >
                            Buy now
                          </button>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-muted">
                          No sellers for this package right now.
                        </p>
                      )}
                    </article>

                    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-foreground">
                        Delivery Instructions
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {primaryFixedListing?.description?.trim() ||
                          "Seller has not added instructions yet."}
                      </p>
                    </article>
                  </div>
                </div>

                <section>
                  <h2 className="text-lg font-semibold text-foreground">
                    Other sellers ({otherFixedListings.length})
                  </h2>

                  {otherFixedListings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {otherFixedListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="rounded-lg border border-border bg-white px-3 py-3 transition hover:border-accent hover:bg-surface hover:shadow-sm"
                        >
                          <div className="grid gap-3 text-sm sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center">
                            <p className="font-semibold text-foreground">{listing.seller.name}</p>
                            <p className="text-foreground sm:text-right">
                              PKR {listing.pricePkr.toLocaleString()}
                            </p>
                            <p className="text-muted">
                              Delivery: {listing.deliveryTimeText ?? "Not specified"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      No other sellers for this selected package yet.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <>
                {!primaryOpenCurrencyListing ? (
                  <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-sm text-muted">
                      No active listings for this offering yet.
                    </p>
                  </article>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-[1.75fr_1fr] xl:items-start">
                    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        {primaryOpenCurrencyListing.seller.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primaryOpenCurrencyListing.seller.image}
                            alt={`${primaryOpenCurrencyListing.seller.name} profile`}
                            className="h-12 w-12 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-muted">
                            {primaryOpenCurrencyListing.seller.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {primaryOpenCurrencyListing.seller.name}
                          </p>
                          <p className="text-sm text-muted">
                            Delivery time:{" "}
                            {primaryOpenCurrencyListing.deliveryTimeText ?? "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h2 className="text-sm font-semibold text-foreground">
                          Delivery Instructions
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-foreground">
                          {primaryOpenCurrencyListing.description?.trim() ||
                            "Seller has not added instructions yet."}
                        </p>
                      </div>
                    </article>

                    <OpenQuantityCheckoutCard
                      pricePkr={primaryOpenCurrencyListing.pricePkr}
                      unitLabel={primaryOpenCurrencyListing.currencyData.unitLabel}
                      minQuantity={primaryOpenCurrencyListing.currencyData.minQuantity}
                      stockAmount={primaryOpenCurrencyListing.currencyData.stockAmount}
                    />
                  </div>
                )}

                {otherOpenCurrencyListings.length > 0 ? (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground">
                      Other sellers ({otherOpenCurrencyListings.length})
                    </h2>

                    <div className="mt-3 overflow-x-auto">
                      <div className="min-w-[860px] space-y-2">
                        {otherOpenCurrencyListings.map((listing) => (
                          <article
                            key={listing.id}
                            className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition hover:border-accent hover:bg-surface hover:shadow-md"
                          >
                            <div className="grid gap-3 text-sm sm:grid-cols-[1.45fr_0.9fr_0.9fr_1fr_1fr] sm:items-center">
                              <div className="flex items-center gap-3">
                                {listing.seller.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={listing.seller.image}
                                    alt={`${listing.seller.name} profile`}
                                    className="h-10 w-10 rounded-full border border-border object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                                    {listing.seller.name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <p className="font-semibold text-foreground">
                                  {listing.seller.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted">In stock</p>
                                <p className="font-semibold text-foreground">
                                  {listing.currencyData.stockAmount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted">Min qty</p>
                                <p className="font-semibold text-foreground">
                                  {listing.currencyData.minQuantity.toLocaleString()}{" "}
                                  {listing.currencyData.unitLabel}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted">Delivery</p>
                                <p className="font-semibold text-foreground">
                                  {listing.deliveryTimeText ?? "Not specified"}
                                </p>
                              </div>
                              <p className="text-lg font-semibold text-foreground">
                                PKR {listing.pricePkr.toLocaleString()} /{" "}
                                {listing.currencyData.unitLabel}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </section>
        ) : (
          <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.length === 0 ? (
              <article className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-2 xl:col-span-3">
                <p className="text-sm text-muted">
                  No active listings for this offering yet.
                </p>
              </article>
            ) : null}

            {listings.map((listing) => (
              <article
                key={listing.id}
                className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-accent hover:shadow-md"
              >
                <div className="min-h-6 text-xs text-muted">
                  Platform tags coming soon
                </div>

                <h2 className="text-base font-semibold leading-6 text-foreground">
                  {truncateText(listing.title, 56)}
                </h2>

                <div className="mt-5 flex items-center gap-2">
                  {listing.seller.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.seller.image}
                      alt={`${listing.seller.name} profile`}
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                      {listing.seller.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground">{listing.seller.name}</p>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
                  <p className="text-3xl font-semibold leading-none text-foreground">
                    PKR {listing.pricePkr.toLocaleString()}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      isInstantDelivery(listing.deliveryTimeText)
                        ? "text-accent"
                        : "text-muted"
                    }`}
                  >
                    {listing.deliveryTimeText ?? "Not specified"}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
