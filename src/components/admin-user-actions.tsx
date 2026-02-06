"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AdminUserActionsProps = {
  user: {
    id: string;
    name: string;
    isBlocked: boolean;
    isActive: boolean;
    image: string | null;
  };
};

type ModerationActionPayload =
  | { action: "block"; reason: string }
  | { action: "unblock"; reason?: string }
  | { action: "change_display_name"; newDisplayName: string }
  | { action: "remove_profile_picture"; reason: string }
  | { action: "deactivate"; reason?: string }
  | { action: "reactivate"; reason?: string };

type ErrorResponse = {
  message?: string;
};

export function AdminUserActions({ user }: AdminUserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function runAction(payload: ModerationActionPayload) {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as ErrorResponse;
        setErrorMessage(errorResponse.message ?? "Action failed.");
        return;
      }

      setSuccessMessage("Updated.");
      router.refresh();
    });
  }

  function handleBlockToggle() {
    if (user.isBlocked) {
      const reason = window.prompt("Optional reason for unblocking:");
      runAction({
        action: "unblock",
        reason: reason?.trim() ? reason.trim() : undefined,
      });
      return;
    }

    const reason = window.prompt("Reason for blocking (required):");
    if (!reason || reason.trim().length < 3) {
      setErrorMessage("Block reason is required (min 3 chars).");
      return;
    }

    runAction({ action: "block", reason: reason.trim() });
  }

  function handleDisplayNameChange() {
    const nextDisplayName = window.prompt("New display name:", user.name);
    if (!nextDisplayName || nextDisplayName.trim().length < 2) {
      setErrorMessage("Display name must be at least 2 characters.");
      return;
    }

    runAction({
      action: "change_display_name",
      newDisplayName: nextDisplayName.trim(),
    });
  }

  function handleRemoveProfilePicture() {
    if (!user.image) {
      setErrorMessage("User has no profile picture.");
      return;
    }

    const reason = window.prompt("Reason for removing profile picture:");
    if (!reason || reason.trim().length < 3) {
      setErrorMessage("Reason is required (min 3 chars).");
      return;
    }

    runAction({
      action: "remove_profile_picture",
      reason: reason.trim(),
    });
  }

  function handleActiveToggle() {
    if (user.isActive) {
      const reason = window.prompt("Optional reason for deactivation:");
      runAction({
        action: "deactivate",
        reason: reason?.trim() ? reason.trim() : undefined,
      });
      return;
    }

    const reason = window.prompt("Optional reason for reactivation:");
    runAction({
      action: "reactivate",
      reason: reason?.trim() ? reason.trim() : undefined,
    });
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleBlockToggle}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {user.isBlocked ? "Unblock" : "Block"}
        </button>

        <button
          type="button"
          onClick={handleDisplayNameChange}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          Change Display Name
        </button>

        <button
          type="button"
          onClick={handleRemoveProfilePicture}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          Remove Profile Pic
        </button>

        <button
          type="button"
          onClick={handleActiveToggle}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {user.isActive ? "Deactivate" : "Reactivate"}
        </button>
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
