import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {year} GamesBazaar. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
          <Link href="/profile" className="transition hover:text-foreground">
            Profile
          </Link>
          <Link href="/profile/settings" className="transition hover:text-foreground">
            Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
