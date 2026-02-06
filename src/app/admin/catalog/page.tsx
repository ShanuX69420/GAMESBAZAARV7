import { AdminCatalogForm } from "@/components/admin-catalog-form";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CurrencyMode, OfferingFormatType } from "@prisma/client";
import Link from "next/link";

type AdminCatalogPageProps = {
  searchParams: Promise<{
    message?: string;
    tone?: string;
    gameSearch?: string;
  }>;
};

const offeringFormatOptions: Array<{ value: OfferingFormatType; label: string }> = [
  { value: OfferingFormatType.ACCOUNT, label: "Account" },
  { value: OfferingFormatType.CURRENCY, label: "Currency" },
];

const currencyModeOptions: Array<{ value: CurrencyMode; label: string }> = [
  { value: CurrencyMode.OPEN_QUANTITY, label: "Open Quantity" },
  { value: CurrencyMode.FIXED_PACKAGES, label: "Fixed Packages" },
];

export default async function AdminCatalogPage({
  searchParams,
}: AdminCatalogPageProps) {
  const adminUser = await requireAdminUser();
  const resolvedSearchParams = await searchParams;

  const [categories, games] = await prisma.$transaction([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { listings: true },
        },
      },
    }),
    prisma.game.findMany({
      where:
        typeof resolvedSearchParams.gameSearch === "string" &&
        resolvedSearchParams.gameSearch.trim().length > 0
          ? {
              name: {
                contains: resolvedSearchParams.gameSearch.trim(),
              },
            }
          : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: { listings: true },
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
          orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        },
      },
    }),
  ]);

  const tone = resolvedSearchParams.tone === "error" ? "error" : "success";
  const message =
    typeof resolvedSearchParams.message === "string"
      ? resolvedSearchParams.message
      : "";
  const gameSearch =
    typeof resolvedSearchParams.gameSearch === "string"
      ? resolvedSearchParams.gameSearch.trim()
      : "";

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin Catalog
              </h1>
              <p className="mt-1 text-sm text-muted">
                Signed in as admin:{" "}
                <span className="font-medium text-foreground">{adminUser.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Back to admin
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Home
              </Link>
            </div>
          </div>

          {message ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm font-medium ${
                tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          ) : null}
        </header>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Categories
            </h2>
            <p className="mt-1 text-sm text-muted">
              Create categories like Accounts, Keys, Top Up, Boosting.
            </p>

            <AdminCatalogForm className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="intent" value="create_category" />
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={60}
                placeholder="New category name"
                className="min-w-[220px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Add Category
              </button>
            </AdminCatalogForm>

            <ul className="mt-4 space-y-2">
              {categories.length === 0 ? (
                <li className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
                  No categories yet.
                </li>
              ) : null}

              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{category.name}</p>
                    <p className="text-xs text-muted">
                      Listings using this category: {category._count.listings}
                    </p>
                  </div>
                  <AdminCatalogForm>
                    <input type="hidden" name="intent" value="delete_category" />
                    <input type="hidden" name="categoryId" value={category.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </AdminCatalogForm>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Games</h2>
            <p className="mt-1 text-sm text-muted">
              Create a game and choose allowed categories. One offering label is auto-created
              for each selected category.
            </p>

            <AdminCatalogForm
              className="mt-4 space-y-3"
              encType="multipart/form-data"
            >
              <input type="hidden" name="intent" value="create_game" />
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="New game name"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
              />

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Game Icon (optional)
                </span>
                <input
                  type="file"
                  name="icon"
                  accept="image/*"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
                />
              </label>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Allowed Categories
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={category.id}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 ? (
                  <p className="mt-2 text-xs text-red-600">
                    Create at least one category before creating games.
                  </p>
                ) : null}
              </fieldset>

              <button
                type="submit"
                disabled={categories.length === 0}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add Game
              </button>
            </AdminCatalogForm>
          </article>
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Game Category Assignments
              </h2>
              <p className="mt-1 text-sm text-muted">
                Update allowed categories per game. Sellers can only list using these pairs.
              </p>
            </div>

            <form method="get" className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="gameSearch"
                defaultValue={gameSearch}
                placeholder="Search games..."
                className="min-w-[220px] rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Search
              </button>
              {gameSearch ? (
                <Link
                  href="/admin/catalog"
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>

          {gameSearch ? (
            <p className="mt-3 text-sm text-muted">
              Search: <span className="font-semibold text-foreground">{gameSearch}</span> (
              {games.length} result{games.length === 1 ? "" : "s"})
            </p>
          ) : null}

          <div className="mt-4 grid gap-3">
            {games.length === 0 ? (
              <article className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
                {gameSearch
                  ? "No games found for this search."
                  : "No games yet."}
              </article>
            ) : null}

            {games.map((game) => {
              const linkedCategoryIds = new Set(
                game.categoryLinks.map((link) => link.categoryId),
              );
              const offeringByCategoryId = new Map(
                game.offerings.map((offering) => [offering.categoryId, offering]),
              );

              return (
                <article
                  key={game.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {game.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={game.icon}
                          alt={`${game.name} icon`}
                          className="h-10 w-10 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-xs font-semibold text-muted">
                          G
                        </div>
                      )}

                      <div>
                        <h3 className="text-base font-semibold text-foreground">{game.name}</h3>
                        <p className="text-xs text-muted">Listings: {game._count.listings}</p>
                      </div>
                    </div>

                    <AdminCatalogForm>
                      <input type="hidden" name="intent" value="delete_game" />
                      <input type="hidden" name="gameId" value={game.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Delete Game
                      </button>
                    </AdminCatalogForm>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AdminCatalogForm
                      encType="multipart/form-data"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="intent" value="update_game_icon" />
                      <input type="hidden" name="gameId" value={game.id} />
                      <input
                        type="file"
                        name="icon"
                        accept="image/*"
                        className="max-w-full text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white"
                      >
                        {game.icon ? "Replace Icon" : "Upload Icon"}
                      </button>
                    </AdminCatalogForm>

                    {game.icon ? (
                      <AdminCatalogForm>
                        <input type="hidden" name="intent" value="remove_game_icon" />
                        <input type="hidden" name="gameId" value={game.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remove Icon
                        </button>
                      </AdminCatalogForm>
                    ) : null}
                  </div>

                  <AdminCatalogForm className="mt-3">
                    <input type="hidden" name="intent" value="update_game_categories" />
                    <input type="hidden" name="gameId" value={game.id} />

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {categories.map((category) => (
                        <label
                          key={`${game.id}-${category.id}`}
                          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                        >
                          <input
                            type="checkbox"
                            name="categoryIds"
                            value={category.id}
                            defaultChecked={linkedCategoryIds.has(category.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white"
                    >
                      Save Categories
                    </button>
                  </AdminCatalogForm>

                  <div className="mt-4 rounded-lg border border-border bg-white p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Offering Labels
                    </h4>
                    <p className="mt-1 text-xs text-muted">
                      Rename labels and pick listing format per offering.
                    </p>

                    <div className="mt-3 grid gap-2">
                      {game.categoryLinks.map((link) => {
                        const offering = offeringByCategoryId.get(link.categoryId);

                        if (!offering) {
                          return (
                            <div
                              key={`${game.id}-${link.categoryId}-missing`}
                              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
                            >
                              Missing offering for {link.category.name}. Re-save categories to
                              auto-create it.
                            </div>
                          );
                        }

                        return (
                          <div
                            key={offering.id}
                            className="rounded-md border border-border bg-surface p-2"
                          >
                            <AdminCatalogForm className="space-y-2">
                              <input type="hidden" name="intent" value="update_game_offering" />
                              <input type="hidden" name="offeringId" value={offering.id} />

                              <div className="grid gap-2 sm:grid-cols-[140px_1fr_150px_auto]">
                                <span className="self-center text-xs font-semibold text-muted">
                                  {link.category.name}
                                </span>
                                <input
                                  type="text"
                                  name="name"
                                  required
                                  minLength={2}
                                  maxLength={120}
                                  defaultValue={offering.name}
                                  className="rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                />
                                <select
                                  name="formatType"
                                  defaultValue={offering.formatType}
                                  className="rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                >
                                  {offeringFormatOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white"
                                >
                                  Save
                                </button>
                              </div>

                              {offering.formatType === OfferingFormatType.CURRENCY ? (
                                <div className="grid gap-2 sm:grid-cols-[190px_1fr]">
                                  <label className="block">
                                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                                      Currency Mode
                                    </span>
                                    <select
                                      name="currencyMode"
                                      defaultValue={offering.currencyMode}
                                      className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                    >
                                      {currencyModeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block">
                                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                                      Unit Label
                                    </span>
                                    <input
                                      type="text"
                                      name="currencyUnitLabel"
                                      maxLength={24}
                                      defaultValue={offering.currencyUnitLabel ?? "Unit"}
                                      placeholder="UC"
                                      className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="hidden"
                                    name="currencyMode"
                                    value={CurrencyMode.OPEN_QUANTITY}
                                  />
                                  <input
                                    type="hidden"
                                    name="currencyUnitLabel"
                                    value=""
                                  />
                                </>
                              )}
                            </AdminCatalogForm>

                            {offering.formatType === OfferingFormatType.CURRENCY &&
                            offering.currencyMode === CurrencyMode.FIXED_PACKAGES ? (
                              <div className="mt-3 rounded-md border border-border bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Fixed Package Amounts
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {offering.packageOptions.length === 0 ? (
                                    <span className="text-xs text-muted">
                                      No package amounts yet.
                                    </span>
                                  ) : null}

                                  {offering.packageOptions.map((option) => (
                                    <AdminCatalogForm
                                      key={option.id}
                                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1"
                                    >
                                      <input
                                        type="hidden"
                                        name="intent"
                                        value="remove_offering_package_option"
                                      />
                                      <input
                                        type="hidden"
                                        name="packageOptionId"
                                        value={option.id}
                                      />
                                      <span className="text-xs font-semibold text-foreground">
                                        {option.amount.toLocaleString()}{" "}
                                        {offering.currencyUnitLabel ?? "Unit"}
                                      </span>
                                      <button
                                        type="submit"
                                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-50"
                                        title="Remove package amount"
                                      >
                                        X
                                      </button>
                                    </AdminCatalogForm>
                                  ))}
                                </div>

                                <AdminCatalogForm className="mt-3 flex flex-wrap gap-2">
                                  <input
                                    type="hidden"
                                    name="intent"
                                    value="add_offering_package_option"
                                  />
                                  <input
                                    type="hidden"
                                    name="offeringId"
                                    value={offering.id}
                                  />
                                  <input
                                    type="number"
                                    name="amount"
                                    required
                                    min={1}
                                    step={1}
                                    placeholder="Amount (e.g. 60)"
                                    className="min-w-[180px] rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface"
                                  >
                                    Add Amount
                                  </button>
                                </AdminCatalogForm>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
