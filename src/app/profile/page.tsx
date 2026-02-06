import { requireCurrentUser } from "@/lib/current-user";
import Link from "next/link";

export default async function ProfilePage() {
  const currentUser = await requireCurrentUser();

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted">{currentUser.email}</p>

        <div className="mt-5 flex items-center gap-3">
          {currentUser.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.image}
              alt="Profile avatar"
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
              No Pic
            </div>
          )}
          <div>
            <p className="text-sm text-muted">Display Name</p>
            <p className="text-base font-semibold text-foreground">{currentUser.name}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/profile/settings"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Open Profile Settings
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
