"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type HeaderCategoryMenuItem = {
  id: string;
  label: string;
  href: string;
  gameIcon: string | null;
};

export type HeaderCategoryMenuSection = {
  key: string;
  label: string;
  popularItems: HeaderCategoryMenuItem[];
  allItems: HeaderCategoryMenuItem[];
};

type HeaderCategoryMenusProps = {
  sections: HeaderCategoryMenuSection[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function HeaderCategoryMenus({ sections }: HeaderCategoryMenusProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeKey) ?? null,
    [sections, activeKey],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveKey(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const filteredAllItems = useMemo(() => {
    if (!activeSection) {
      return [];
    }

    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return activeSection.allItems;
    }

    return activeSection.allItems.filter((item) =>
      normalize(item.label).includes(normalizedQuery),
    );
  }, [activeSection, query]);

  const resolvedPopularItems =
    activeSection && activeSection.popularItems.length > 0
      ? activeSection.popularItems
      : (activeSection?.allItems.slice(0, 12) ?? []);

  return (
    <div
      className="relative"
      onMouseLeave={() => {
        setActiveKey(null);
        setQuery("");
      }}
    >
      <div className="flex items-center gap-1">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            className={`rounded-md px-3 py-1.5 text-[15px] font-semibold transition ${
              activeKey === section.key
                ? "bg-surface text-foreground"
                : "text-foreground hover:bg-surface"
            }`}
            onMouseEnter={() => {
              if (activeKey !== section.key) {
                setQuery("");
                setActiveKey(section.key);
              }
            }}
            onFocus={() => {
              if (activeKey !== section.key) {
                setQuery("");
                setActiveKey(section.key);
              }
            }}
            onClick={() => {
              setActiveKey((prev) => {
                const nextKey = prev === section.key ? null : section.key;
                if (nextKey !== prev) {
                  setQuery("");
                }
                return nextKey;
              });
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection ? (
        <div className="absolute left-0 top-full z-50 pt-3">
          <div className="w-[980px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-card shadow-2xl">
            <div className="grid grid-cols-[1.6fr_1fr]">
              <section className="border-r border-border p-5">
                <h3 className="text-sm font-semibold text-foreground">Popular games</h3>

                {resolvedPopularItems.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">No games in this category yet.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
                    {resolvedPopularItems.slice(0, 12).map((item) => (
                      <Link
                        key={`popular-${activeSection.key}-${item.id}`}
                        href={item.href}
                        onClick={() => setActiveKey(null)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition hover:bg-surface"
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
                )}
              </section>

              <section className="p-5">
                <label className="flex items-center rounded-lg border border-border bg-white px-3 py-2">
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

                <p className="mt-3 text-sm font-semibold text-muted">All games</p>

                <div className="mt-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredAllItems.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-muted">No matching games.</p>
                  ) : null}

                  <div className="space-y-0.5">
                    {filteredAllItems.map((item) => (
                      <Link
                        key={`all-${activeSection.key}-${item.id}`}
                        href={item.href}
                        onClick={() => setActiveKey(null)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition hover:bg-surface"
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
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
