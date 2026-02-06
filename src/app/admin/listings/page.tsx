import { requireAdminUser } from "@/lib/current-user";
import Link from "next/link";

export default async function AdminListingsPage() {
  await requireAdminUser();

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-5xl">
        <header className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Admin Listings
          </h1>
          <p className="mt-2 text-sm text-muted">
            Listings moderation module placeholder. We will add listing review actions in
            the next increment.
          </p>

          <div className="mt-4 flex gap-2">
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
        </header>
      </main>
    </div>
  );
}
