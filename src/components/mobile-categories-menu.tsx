"use client";

import type { HeaderCategoryMenuSection } from "@/components/header-category-menus";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MobileCategoriesMenuProps = {
  sections: HeaderCategoryMenuSection[];
  buttonClassName?: string;
};

export function MobileCategoriesMenu({
  sections,
  buttonClassName,
}: MobileCategoriesMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function openMenu() {
    setActiveSectionKey(null);
    setQuery("");
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
    setActiveSectionKey(null);
    setQuery("");
  }

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeSectionKey) ?? null,
    [sections, activeSectionKey],
  );

  const filteredAllItems = useMemo(() => {
    if (!activeSection) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return activeSection.allItems;
    }

    return activeSection.allItems.filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery),
    );
  }, [activeSection, query]);

  const resolvedPopularItems = useMemo(() => {
    if (!activeSection) {
      return [];
    }
    if (activeSection.popularItems.length > 0) {
      return activeSection.popularItems;
    }
    return activeSection.allItems.slice(0, 12);
  }, [activeSection]);

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
        onClick={openMenu}
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
          onClick={closeMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Categories menu"
        >
          <div
            className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:h-[calc(100dvh-1.5rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-border px-4 py-4">
              {activeSection ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSectionKey(null);
                      setQuery("");
                    }}
                    className="absolute left-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground transition hover:bg-surface"
                    aria-label="Back to categories"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <h2 className="text-center text-base font-semibold text-foreground">
                    {activeSection.label}
                  </h2>
                </>
              ) : (
                <h2 className="text-center text-base font-semibold text-foreground">
                  Categories
                </h2>
              )}

              <button
                type="button"
                onClick={closeMenu}
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
              {!activeSection ? (
                <div className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-left text-lg font-medium text-foreground transition hover:bg-white"
                      onClick={() => setActiveSectionKey(section.key)}
                    >
                      <span>{section.label}</span>
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
              ) : (
                <div>
                  <label className="flex items-center rounded-lg border border-border bg-surface px-3 py-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for game"
                      className="w-full bg-transparent text-sm text-foreground outline-none"
                    />
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
                  </label>

                  <p className="mt-4 text-sm font-semibold text-muted">Popular games</p>
                  <div className="mt-2 space-y-1">
                    {resolvedPopularItems.length === 0 ? (
                      <p className="px-1 py-1 text-sm text-muted">
                        No games in this category yet.
                      </p>
                    ) : null}
                    {resolvedPopularItems.map((item) => (
                      <Link
                        key={`popular-${item.id}`}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-base text-foreground transition hover:bg-surface"
                      >
                        {item.gameIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.gameIcon}
                            alt={`${item.label} icon`}
                            className="h-7 w-7 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-[10px] font-semibold text-muted">
                            G
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <p className="mt-4 text-sm font-semibold text-muted">All games</p>
                  <div className="mt-2 space-y-1">
                    {filteredAllItems.length === 0 ? (
                      <p className="px-1 py-1 text-sm text-muted">No matching games.</p>
                    ) : null}
                    {filteredAllItems.map((item) => (
                      <Link
                        key={`all-${item.id}`}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-base text-foreground transition hover:bg-surface"
                      >
                        {item.gameIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.gameIcon}
                            alt={`${item.label} icon`}
                            className="h-7 w-7 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-[10px] font-semibold text-muted">
                            G
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
