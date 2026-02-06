"use client";

import {
  getAllowedDeliveryTimeOptions,
  isInstantDeliveryAllowedForCategory,
  type DeliveryTimeOptionValue,
} from "@/lib/listing-delivery";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type OfferingFormatType = "ACCOUNT" | "CURRENCY";
type CurrencyMode = "OPEN_QUANTITY" | "FIXED_PACKAGES";

type ListingCreateFormProps = {
  games: Array<{
    id: string;
    name: string;
    offerings: Array<{
      id: string;
      name: string;
      formatType: OfferingFormatType;
      currencyMode: CurrencyMode;
      currencyUnitLabel: string | null;
      packageOptions: Array<{
        id: string;
        amount: number;
      }>;
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

function formatIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getFormatLabel(formatType: OfferingFormatType) {
  switch (formatType) {
    case "CURRENCY":
      return "Currency";
    case "ACCOUNT":
    default:
      return "Account";
  }
}

export function ListingCreateForm({ games }: ListingCreateFormProps) {
  const router = useRouter();
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [offeringId, setOfferingId] = useState(games[0]?.offerings[0]?.id ?? "");
  const [packageOptionId, setPackageOptionId] = useState(
    games[0]?.offerings[0]?.packageOptions[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePkr, setPricePkr] = useState("");
  const [deliveryTimeKey, setDeliveryTimeKey] = useState<DeliveryTimeOptionValue | "">("");
  const [stockAmount, setStockAmount] = useState("");
  const [minQuantity, setMinQuantity] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId) ?? null,
    [games, gameId],
  );

  const allowedOfferings = selectedGame?.offerings ?? [];
  const selectedOffering =
    allowedOfferings.find((offering) => offering.id === offeringId) ?? null;
  const selectedFormatType = selectedOffering?.formatType ?? "ACCOUNT";
  const selectedCurrencyMode = selectedOffering?.currencyMode ?? "OPEN_QUANTITY";
  const selectedCurrencyUnit = selectedOffering?.currencyUnitLabel?.trim() || "Unit";
  const selectedCategoryName = selectedOffering?.categoryName ?? "";
  const allowedDeliveryOptions = getAllowedDeliveryTimeOptions(selectedCategoryName);
  const isInstantDeliveryAvailable =
    isInstantDeliveryAllowedForCategory(selectedCategoryName);
  const fallbackDeliveryTimeKey = allowedDeliveryOptions[0]?.value ?? "";
  const effectiveDeliveryTimeKey =
    deliveryTimeKey && allowedDeliveryOptions.some((option) => option.value === deliveryTimeKey)
      ? deliveryTimeKey
      : fallbackDeliveryTimeKey;

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

    if (selectedFormatType === "ACCOUNT" && title.trim().length < 3) {
      setErrorMessage("Title must be at least 3 characters.");
      return;
    }

    if (!effectiveDeliveryTimeKey) {
      setErrorMessage("Delivery time is required.");
      return;
    }

    const priceAsNumber = Number(pricePkr);
    if (!Number.isInteger(priceAsNumber) || priceAsNumber <= 0) {
      setErrorMessage("Price must be a positive whole number.");
      return;
    }

    const payload: Record<string, unknown> = {
      gameId,
      offeringId,
      description,
      pricePkr: priceAsNumber,
      deliveryTimeKey: effectiveDeliveryTimeKey,
    };

    if (selectedFormatType === "ACCOUNT") {
      payload.title = title.trim();
    }

    if (selectedFormatType === "CURRENCY") {
      if (selectedCurrencyMode === "FIXED_PACKAGES") {
        if (!packageOptionId) {
          setErrorMessage("Select a package amount.");
          return;
        }

        payload.packageOptionId = packageOptionId;
      } else {
        const stockAsNumber = Number(stockAmount);
        const minQtyAsNumber = Number(minQuantity);

        if (!Number.isInteger(stockAsNumber) || stockAsNumber < 1) {
          setErrorMessage("Stock must be a positive whole number.");
          return;
        }

        if (!Number.isInteger(minQtyAsNumber) || minQtyAsNumber < 1) {
          setErrorMessage("Minimum quantity must be a positive whole number.");
          return;
        }

        if (minQtyAsNumber > stockAsNumber) {
          setErrorMessage("Minimum quantity cannot be greater than stock.");
          return;
        }

        payload.stockAmount = stockAsNumber;
        payload.minQuantity = minQtyAsNumber;
      }
    }

    setIsSaving(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
            const nextOffering = nextGame?.offerings[0];
            setOfferingId(nextOffering?.id ?? "");
            setPackageOptionId(nextOffering?.packageOptions[0]?.id ?? "");
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
          onChange={(event) => {
            const nextOfferingId = event.target.value;
            setOfferingId(nextOfferingId);
            const nextOffering = allowedOfferings.find(
              (offering) => offering.id === nextOfferingId,
            );
            setPackageOptionId(nextOffering?.packageOptions[0]?.id ?? "");
          }}
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
        {selectedOffering ? (
          <p className="mt-1 text-xs text-muted">
            Format: {getFormatLabel(selectedOffering.formatType)}
            {selectedOffering.formatType === "CURRENCY"
              ? ` | ${
                  selectedOffering.currencyMode === "FIXED_PACKAGES"
                    ? "Fixed Packages"
                    : "Open Quantity"
                }`
              : ""}
          </p>
        ) : null}
      </label>

      {selectedFormatType === "CURRENCY" ? (
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
          Listing title is auto-generated for currency listings.
        </p>
      ) : null}

      {selectedFormatType === "ACCOUNT" ? (
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
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Delivery Time</span>
        <select
          required
          value={effectiveDeliveryTimeKey}
          onChange={(event) => setDeliveryTimeKey(event.target.value as DeliveryTimeOptionValue)}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        >
          {allowedDeliveryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedOffering ? (
          <p className="mt-1 text-xs text-muted">
            {isInstantDeliveryAvailable
              ? "Instant delivery is available for this category."
              : "Instant delivery is only allowed for Accounts and Gift Cards."}
          </p>
        ) : null}
      </label>

      {selectedFormatType === "CURRENCY" && selectedCurrencyMode === "FIXED_PACKAGES" ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">
            Package Amount
          </span>
          <select
            value={packageOptionId}
            onChange={(event) => setPackageOptionId(event.target.value)}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
          >
            {selectedOffering?.packageOptions.length ? null : (
              <option value="">No package options set by admin</option>
            )}
            {selectedOffering?.packageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.amount.toLocaleString()} {selectedCurrencyUnit}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedFormatType === "CURRENCY" && selectedCurrencyMode === "OPEN_QUANTITY" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Stock</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={stockAmount}
              onChange={(event) => setStockAmount(formatIntegerInput(event.target.value))}
              placeholder="99999"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
            <p className="mt-1 text-xs text-muted">Unit: {selectedCurrencyUnit}</p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Minimum Qty
            </span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={minQuantity}
              onChange={(event) => setMinQuantity(formatIntegerInput(event.target.value))}
              placeholder="1"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Description</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={
            selectedFormatType === "CURRENCY"
              ? "Add buyer instructions, requirements, and any notes."
              : "Include rank, region, platform, and account details."
          }
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">
          {selectedFormatType === "CURRENCY"
            ? selectedCurrencyMode === "FIXED_PACKAGES"
              ? "Package Price (PKR)"
              : `Price Per ${selectedCurrencyUnit} (PKR)`
            : "Price (PKR)"}
        </span>
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
        disabled={
          isSaving ||
          !gameId ||
          !offeringId ||
          (selectedFormatType === "CURRENCY" &&
            selectedCurrencyMode === "FIXED_PACKAGES" &&
            !packageOptionId)
        }
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
}
