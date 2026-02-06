"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ListingCreateFormProps = {
  games: Array<{
    id: string;
    name: string;
    offerings: Array<{
      id: string;
      name: string;
      categoryName: string;
    }>;
  }>;
};

type ErrorResponse = {
  message?: string;
};

function formatPriceInput(value: string) {
  const numericOnly = value.replace(/[^\d]/g, "");
  return numericOnly;
}

export function ListingCreateForm({ games }: ListingCreateFormProps) {
  const router = useRouter();
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [offeringId, setOfferingId] = useState(games[0]?.offerings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePkr, setPricePkr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId) ?? null,
    [games, gameId],
  );

  const allowedOfferings = selectedGame?.offerings ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!gameId) {
      setErrorMessage("Select a game.");
      return;
    }

    if (!offeringId) {
      setErrorMessage("Select an offering.");
      return;
    }

    const priceAsNumber = Number(pricePkr);
    if (!Number.isInteger(priceAsNumber) || priceAsNumber <= 0) {
      setErrorMessage("Price must be a positive whole number.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        offeringId,
        title,
        description,
        pricePkr: priceAsNumber,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const errorBody = (await response.json()) as ErrorResponse;
      setErrorMessage(errorBody.message ?? "Failed to create listing.");
      return;
    }

    router.push("/dashboard/listings?message=Listing%20created.&tone=success");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Game</span>
        <select
          value={gameId}
          onChange={(event) => {
            const nextGameId = event.target.value;
            setGameId(nextGameId);
            const nextGame = games.find((game) => game.id === nextGameId);
            setOfferingId(nextGame?.offerings[0]?.id ?? "");
          }}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        >
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Offering</span>
        <select
          value={offeringId}
          onChange={(event) => setOfferingId(event.target.value)}
          disabled={allowedOfferings.length === 0}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {allowedOfferings.length === 0 ? (
            <option value="">No offerings configured for this game</option>
          ) : null}
          {allowedOfferings.map((offering) => (
            <option key={offering.id} value={offering.id}>
              {offering.name} ({offering.categoryName})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Title</span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Example: Premium ranked account"
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Description</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Include rank, region, platform, and delivery details."
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Price (PKR)</span>
        <input
          type="text"
          inputMode="numeric"
          required
          value={pricePkr}
          onChange={(event) => setPricePkr(formatPriceInput(event.target.value))}
          placeholder="5000"
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving || !gameId || !offeringId}
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
}
