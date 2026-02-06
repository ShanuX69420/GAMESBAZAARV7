import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const PROFILE_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profiles",
);

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isLocalProfileImagePath(imagePath: string | null | undefined) {
  return Boolean(imagePath && imagePath.startsWith("/uploads/profiles/"));
}

export async function deleteLocalProfileImage(imagePath: string | null | undefined) {
  if (!isLocalProfileImagePath(imagePath)) {
    return;
  }

  const relativePath = imagePath?.replace(/^\//, "");
  if (!relativePath) {
    return;
  }

  const absolutePath = path.join(process.cwd(), relativePath);

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore deletion failures because file might already be missing.
  }
}

export async function saveProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const extension =
    mimeToExtension[file.type] ??
    path.extname(file.name).replace(".", "").toLowerCase() ??
    "jpg";

  const safeExtension = extension.match(/^[a-z0-9]+$/) ? extension : "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${safeExtension}`;

  await mkdir(PROFILE_UPLOAD_DIR, { recursive: true });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const absoluteFilePath = path.join(PROFILE_UPLOAD_DIR, fileName);
  await writeFile(absoluteFilePath, fileBuffer);

  return `/uploads/profiles/${fileName}`;
}
