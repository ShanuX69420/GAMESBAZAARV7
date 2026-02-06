import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

const navLinks = ["Currency", "Accounts", "Top Ups", "Items", "Boosting"];

const marketSections = [
  {
    title: "Popular Accounts",
    items: ["Grand Theft Auto 5", "Valorant", "Fortnite", "League of Legends"],
  },
  {
    title: "Popular Currency",
    items: ["Robux", "FC Coins", "OSRS Gold", "WoW Classic Gold"],
  },
  {
    title: "Popular Top Ups",
    items: ["Mobile Legends", "PUBG UC", "Genshin Impact", "Free Fire"],
  },
  {
    title: "Popular Items",
    items: ["CS2 Skins", "Dota 2 Items", "Rocket League", "Path of Exile"],
  },
];

export default async function Home() {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "User";

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 lg:shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
                G
              </span>
              <Link href="/" className="text-[32px] font-semibold leading-none tracking-tight text-foreground">
                GamesBazaar
              </Link>
            </div>

            <nav className="hidden gap-1 lg:flex lg:items-center">
              {navLinks.map((link) => (
                <button
                  key={link}
                  type="button"
                  className="rounded-md px-3 py-1.5 text-[15px] font-semibold text-foreground transition hover:bg-surface"
                >
                  {link}
                </button>
              ))}
            </nav>

            <label className="flex w-full items-center rounded-lg border border-border bg-white px-3 py-2 lg:max-w-[420px] lg:flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search GamesBazaar"
                className="ml-2 w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>

            <div className="flex items-center gap-2 self-end lg:ml-auto lg:self-auto">
              {session?.user ? (
                <>
                  <span className="hidden text-sm text-muted md:inline">{userName}</span>
                  <Link
                    href="/dashboard"
                    className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                  >
                    Dashboard
                  </Link>
                  <LogoutButton />
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

            <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {navLinks.map((link) => (
                <button
                  key={link}
                  type="button"
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  {link}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Buy and sell game accounts, currency, and items.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">
            Clean, fast, and mobile-first marketplace experience.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={session?.user ? "/dashboard" : "/register"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {session?.user ? "Open Dashboard" : "Get Started"}
            </Link>
            {!session?.user ? (
              <Link
                href="/login"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Login
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {marketSections.map((section) => (
            <article
              key={section.title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {section.title}
              </h2>
              <ul className="mt-3 grid gap-2 text-sm text-foreground">
                {section.items.map((item) => (
                  <li key={item} className="rounded-md bg-surface px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
