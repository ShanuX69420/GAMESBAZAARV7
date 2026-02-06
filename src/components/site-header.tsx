import { AccountMenu } from "@/components/account-menu";
import { getCurrentUser } from "@/lib/current-user";
import { MobileCategoriesMenu } from "@/components/mobile-categories-menu";
import Link from "next/link";

const navLinks = ["Currency", "Accounts", "Top Ups", "Items", "Boosting"];

function SearchInput({ mobile = false }: { mobile?: boolean }) {
  return (
    <label
      className={`flex items-center rounded-lg border border-border bg-white px-3 py-2 ${
        mobile ? "w-full" : "w-full lg:max-w-[420px] lg:flex-1"
      }`}
    >
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
  );
}

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MobileCategoriesMenu
                links={navLinks}
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
                <AccountMenu
                  name={currentUser.name}
                  email={currentUser.email}
                  image={currentUser.image}
                  isAdmin={currentUser.role === "ADMIN"}
                />
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
            <SearchInput mobile />
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

          <SearchInput />

          <div className="ml-auto flex items-center gap-2">
            {currentUser ? (
              <AccountMenu
                name={currentUser.name}
                email={currentUser.email}
                image={currentUser.image}
                isAdmin={currentUser.role === "ADMIN"}
              />
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
