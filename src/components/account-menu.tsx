"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type AccountMenuProps = {
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
};

export function AccountMenu({ name, email, image, isAdmin }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface transition hover:bg-zinc-100"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open account menu"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="Profile avatar"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5 text-foreground"
            aria-hidden="true"
          >
            <circle cx="12" cy="8.2" r="3.2" />
            <path d="M5.5 19.2c1.2-2.8 3.7-4.2 6.5-4.2s5.3 1.4 6.5 4.2" />
          </svg>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          <div className="mb-2 rounded-lg bg-surface px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            role="menuitem"
          >
            Profile
          </Link>

          <Link
            href="/profile/settings"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            role="menuitem"
          >
            Profile Settings
          </Link>

          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            role="menuitem"
          >
            Dashboard
          </Link>

          {isAdmin ? (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
              role="menuitem"
            >
              Admin Dashboard
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
