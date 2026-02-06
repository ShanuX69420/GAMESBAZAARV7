"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type HeaderSearchProps = {
  mobile?: boolean;
};

type SearchSuggestion = {
  id: string;
  type: "game_category";
  label: string;
  href: string;
  gameName: string;
  gameIcon?: string | null;
  categoryName?: string;
};

type SearchResponse = {
  suggestions?: SearchSuggestion[];
};

export function HeaderSearch({ mobile = false }: HeaderSearchProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

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

  useEffect(() => {
    const nextQuery = query.trim();

    if (nextQuery.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(nextQuery)}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }

        const responseBody = (await response.json()) as SearchResponse;
        const nextSuggestions = responseBody.suggestions ?? [];
        setSuggestions(nextSuggestions);
        setIsOpen(true);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 140);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) {
      return;
    }
    setIsOpen(false);
    router.push(`/games?q=${encodeURIComponent(nextQuery)}`);
  }

  return (
    <div
      ref={wrapperRef}
      className={`${mobile ? "w-full" : "w-full lg:max-w-[420px] lg:flex-1"} relative`}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-lg border border-border bg-white px-3 py-2"
      >
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
        <input
          type="text"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search offerings"
          autoComplete="off"
          className="ml-2 w-full bg-transparent text-sm text-foreground outline-none"
        />
      </form>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-muted">Searching...</p>
          ) : null}

          {!isLoading && suggestions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">No matching categories found.</p>
          ) : null}

          {!isLoading
            ? suggestions.map((suggestion) => (
                <Link
                  key={suggestion.id}
                  href={suggestion.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-surface"
                >
                  {suggestion.gameIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={suggestion.gameIcon}
                      alt={`${suggestion.gameName} icon`}
                      className="h-8 w-8 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-[10px] font-semibold text-muted">
                      G
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground">{suggestion.label}</p>
                </Link>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
