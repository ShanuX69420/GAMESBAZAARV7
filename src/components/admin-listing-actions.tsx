"use client";

import type { ListingStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AdminListingActionsProps = {
  listing: {
    id: string;
    status: ListingStatus;
  };
};

type ModerationPayload =
  | { action: "hide"; reason: string }
  | { action: "remove"; reason: string }
  | { action: "restore"; reason: string }
  | { action: "pause"; reason: string }
  | { action: "unpause"; reason: string };

type ErrorResponse = {
  message?: string;
};

function promptReason(actionLabel: string) {
  const reason = window.prompt(`Reason for ${actionLabel} (required):`);
  if (!reason || reason.trim().length < 3) {
    return null;
  }
  return reason.trim();
}

export function AdminListingActions({ listing }: AdminListingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function runAction(payload: ModerationPayload) {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as ErrorResponse;
        setErrorMessage(errorResponse.message ?? "Moderation action failed.");
        return;
      }

      setSuccessMessage("Updated.");
      router.refresh();
    });
  }

  function handleHide() {
    const reason = promptReason("hiding listing");
    if (!reason) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }
    runAction({ action: "hide", reason });
  }

  function handleRemove() {
    const reason = promptReason("removing listing");
    if (!reason) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }
    runAction({ action: "remove", reason });
  }

  function handleRestore() {
    const reason = promptReason("restoring listing");
    if (!reason) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }
    runAction({ action: "restore", reason });
  }

  function handlePause() {
    const reason = promptReason("pausing listing");
    if (!reason) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }
    runAction({ action: "pause", reason });
  }

  function handleUnpause() {
    const reason = promptReason("unpausing listing");
    if (!reason) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }
    runAction({ action: "unpause", reason });
  }

  const showPause = listing.status === "ACTIVE";
  const showUnpause = listing.status === "PAUSED";
  const showHide =
    listing.status === "ACTIVE" ||
    listing.status === "PAUSED" ||
    listing.status === "DRAFT";
  const showRestore =
    listing.status === "HIDDEN_BY_ADMIN" || listing.status === "REMOVED_BY_ADMIN";
  const showRemove = listing.status !== "REMOVED_BY_ADMIN";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {showPause ? (
          <button
            type="button"
            onClick={handlePause}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
          >
            Pause
          </button>
        ) : null}

        {showUnpause ? (
          <button
            type="button"
            onClick={handleUnpause}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
          >
            Unpause
          </button>
        ) : null}

        {showHide ? (
          <button
            type="button"
            onClick={handleHide}
            disabled={isPending}
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Hide
          </button>
        ) : null}

        {showRestore ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Restore
          </button>
        ) : null}

        {showRemove ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Remove
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-2 text-xs font-medium text-red-600">{errorMessage}</p>
      ) : null}

      {!errorMessage && successMessage ? (
        <p className="mt-2 text-xs font-medium text-accent">{successMessage}</p>
      ) : null}
    </div>
  );
}
