"use client";

import { useEffect, useState } from "react";

type MobileCategoriesMenuProps = {
  links: string[];
  buttonClassName?: string;
};

export function MobileCategoriesMenu({
  links,
  buttonClassName,
}: MobileCategoriesMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface"
        }
        aria-label="Open categories"
        title="Categories"
        onClick={() => setIsOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/25 p-2 sm:p-3"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Categories menu"
        >
          <div
            className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:h-[calc(100dvh-1.5rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-border px-4 py-4">
              <h2 className="text-center text-base font-semibold text-foreground">
                Categories
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground transition hover:bg-surface"
                aria-label="Close categories"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-2">
                {links.map((link) => (
                  <button
                    key={link}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-left text-lg font-medium text-foreground transition hover:bg-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>{link}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5 text-muted"
                      aria-hidden="true"
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
