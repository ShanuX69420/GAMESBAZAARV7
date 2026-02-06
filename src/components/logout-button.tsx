"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
    >
      Logout
    </button>
  );
}
