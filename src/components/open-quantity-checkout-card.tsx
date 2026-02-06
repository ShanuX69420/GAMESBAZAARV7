"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type OpenQuantityCheckoutCardProps = {
  pricePkr: number;
  unitLabel: string;
  minQuantity: number;
  stockAmount: number;
  messageHref?: string | null;
};

function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function sanitizeQuantityInput(value: string) {
  const onlyDigits = value.replace(/[^\d]/g, "");
  if (!onlyDigits) {
    return null;
  }
  return Number(onlyDigits);
}

export function OpenQuantityCheckoutCard({
  pricePkr,
  unitLabel,
  minQuantity,
  stockAmount,
  messageHref,
}: OpenQuantityCheckoutCardProps) {
  const [quantity, setQuantity] = useState(minQuantity);

  const safeQuantity = useMemo(
    () => clamp(quantity, minQuantity, stockAmount),
    [quantity, minQuantity, stockAmount],
  );

  const totalPkr = safeQuantity * pricePkr;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">Price</p>
        <p className="text-3xl font-semibold text-foreground">
          PKR {pricePkr.toLocaleString()} / {unitLabel}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-3">
        <div className="grid grid-cols-[42px_1fr_42px] items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((current) => clamp(current - 1, minQuantity, stockAmount))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-lg font-semibold text-foreground transition hover:bg-card"
            aria-label="Decrease quantity"
          >
            -
          </button>

          <input
            type="text"
            inputMode="numeric"
            value={safeQuantity.toString()}
            onChange={(event) => {
              const parsedValue = sanitizeQuantityInput(event.target.value);
              if (parsedValue === null) {
                return;
              }
              setQuantity(clamp(parsedValue, minQuantity, stockAmount));
            }}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-center text-lg font-semibold text-foreground outline-none transition focus:border-accent"
            aria-label="Selected quantity"
          />

          <button
            type="button"
            onClick={() => setQuantity((current) => clamp(current + 1, minQuantity, stockAmount))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-lg font-semibold text-foreground transition hover:bg-card"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <p>
            Min qty:{" "}
            <span className="font-semibold text-foreground">
              {minQuantity.toLocaleString()} {unitLabel}
            </span>
          </p>
          <p>
            In stock:{" "}
            <span className="font-semibold text-foreground">
              {stockAmount.toLocaleString()} {unitLabel}
            </span>
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        PKR {totalPkr.toLocaleString()} | Buy now
      </button>

      {messageHref ? (
        <Link
          href={messageHref}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
        >
          Message seller
        </Link>
      ) : null}
    </article>
  );
}
