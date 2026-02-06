import { getCurrentUser } from "@/lib/current-user";
import Link from "next/link";

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
  const currentUser = await getCurrentUser();

  return (
    <div className="px-3 py-4 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Buy and sell game accounts, currency, and items.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">
            Clean, fast, and mobile-first marketplace experience.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={currentUser ? "/dashboard" : "/register"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {currentUser ? "Open Dashboard" : "Get Started"}
            </Link>
            {!currentUser ? (
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
