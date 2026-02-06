import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const moduleCards = [
  {
    title: "Users",
    description: "Moderate accounts, profile data, and access status.",
    href: "/admin/users",
    cta: "Open Users",
  },
  {
    title: "Catalog",
    description: "Create categories and games, then map valid game-category pairs.",
    href: "/admin/catalog",
    cta: "Open Catalog",
  },
  {
    title: "Listings",
    description: "Review and moderate marketplace listings.",
    href: "/admin/listings",
    cta: "Open Listings",
  },
  {
    title: "Orders",
    description: "Track order health, fraud signals, and disputes.",
    href: "/admin/orders",
    cta: "Open Orders",
  },
];

export default async function AdminIndexPage() {
  const adminUser = await requireAdminUser();

  const [totalUsers, blockedUsers, inactiveUsers, auditEvents, totalCategories, totalGames] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.adminActionLog.count(),
      prisma.category.count(),
      prisma.game.count(),
    ]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted">
                Signed in as admin:{" "}
                <span className="font-medium text-foreground">{adminUser.email}</span>
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Back to home
            </Link>
          </div>
        </header>

        <section className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Total Users
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalUsers}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Blocked Users
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{blockedUsers}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Inactive Users
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{inactiveUsers}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Audit Events
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{auditEvents}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Categories
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalCategories}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Games
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalGames}</p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {moduleCards.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-muted">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
