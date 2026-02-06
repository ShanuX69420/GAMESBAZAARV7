"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

type AdminCatalogFormProps = {
  className?: string;
  children: ReactNode;
  encType?: "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
};

type ApiResponse = {
  message?: string;
};

export function AdminCatalogForm({ className, children, encType }: AdminCatalogFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: {
          "x-gamesbazaar-ajax": "1",
        },
        body: formData,
      });

      const responseBody = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        window.alert(responseBody.message ?? "Failed to apply catalog change.");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Failed to apply catalog change.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={className}
      encType={encType}
      onSubmit={handleSubmit}
      data-submitting={isSubmitting ? "true" : "false"}
    >
      {children}
    </form>
  );
}

