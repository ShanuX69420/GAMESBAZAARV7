import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        <p className="mt-3 text-sm text-muted">
          Logged in as <span className="font-medium text-foreground">{session.user.email}</span>.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
