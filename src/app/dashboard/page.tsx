import { LogoutButton } from "@/components/logout-button";
import { requireCurrentUser } from "@/lib/current-user";
import Link from "next/link";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        <p className="mt-3 text-sm text-muted">
          Logged in as{" "}
          <span className="font-medium text-foreground">{currentUser.email}</span>.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard/listings"
            className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            My Listings
          </Link>

          {currentUser.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Open Admin Dashboard
            </Link>
          ) : null}

          <Link
            href="/profile"
            className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Open Profile
          </Link>

          <Link
            href="/"
            className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
