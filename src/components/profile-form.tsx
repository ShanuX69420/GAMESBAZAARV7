"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

type ProfileFormProps = {
  initialName: string;
  initialImage: string | null;
  email: string;
};

type ErrorResponse = {
  message?: string;
};

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for crop."));
    image.src = url;
  });
}

async function buildCroppedAvatarFile(imageUrl: string, croppedArea: Area) {
  const image = await createImage(imageUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot crop image.");
  }

  const outputSize = 512;
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Cannot export cropped image.");
  }

  return new File([blob], `avatar-${Date.now()}.png`, { type: "image/png" });
}

export function ProfileForm({
  initialName,
  initialImage,
  email,
}: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropSaving, setIsCropSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filePreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl]);

  const previewUrl = filePreviewUrl ?? (!removeImage ? initialImage : null);

  function resetCropState() {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function handleUseCrop() {
    if (!cropImageUrl || !croppedAreaPixels) {
      return;
    }

    setIsCropSaving(true);

    try {
      const croppedFile = await buildCroppedAvatarFile(
        cropImageUrl,
        croppedAreaPixels,
      );
      setSelectedFile(croppedFile);
      setRemoveImage(false);
      setErrorMessage("");
      resetCropState();
    } catch {
      setErrorMessage("Failed to crop image.");
    } finally {
      setIsCropSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("removeImage", String(removeImage));
    if (selectedFile) {
      formData.append("avatar", selectedFile);
    }

    const response = await fetch("/api/profile", {
      method: "PATCH",
      body: formData,
    });

    setIsSaving(false);

    if (!response.ok) {
      const errorBody = (await response.json()) as ErrorResponse;
      setErrorMessage(errorBody.message ?? "Failed to update profile.");
      return;
    }

    setSelectedFile(null);
    setRemoveImage(false);
    setSuccessMessage("Profile settings saved.");
    router.refresh();
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-muted">{email}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                No Pic
              </div>
            )}

            <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (!file) {
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    setErrorMessage("Only image files are allowed.");
                    return;
                  }

                  setErrorMessage("");
                  const uploadUrl = URL.createObjectURL(file);
                  if (cropImageUrl) {
                    URL.revokeObjectURL(cropImageUrl);
                  }
                  setCropImageUrl(uploadUrl);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setRemoveImage(true);
              }}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface"
            >
              Remove image
            </button>
          </div>

          <p className="text-xs text-muted">
            Max file size: 5MB. Supported: JPG, PNG, WEBP, GIF.
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Display name
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {!errorMessage && successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </main>

      {cropImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Crop Avatar</h2>
              <button
                type="button"
                onClick={resetCropState}
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-surface"
              >
                Close
              </button>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-zinc-900">
              <Cropper
                image={cropImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid
                onCropChange={setCrop}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
                onZoomChange={setZoom}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-muted">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetCropState}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUseCrop}
                disabled={isCropSaving}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCropSaving ? "Saving..." : "Use this crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
