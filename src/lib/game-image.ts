import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const GAME_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "games");
const MAX_GAME_ICON_BYTES = 5 * 1024 * 1024;

const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isLocalGameImagePath(imagePath: string | null | undefined) {
  return Boolean(imagePath && imagePath.startsWith("/uploads/games/"));
}

export async function deleteLocalGameImage(imagePath: string | null | undefined) {
  if (!isLocalGameImagePath(imagePath)) {
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
    // Ignore deletion errors if file no longer exists.
  }
}

export async function saveGameImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  if (file.size > MAX_GAME_ICON_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const extension =
    mimeToExtension[file.type] ??
    path.extname(file.name).replace(".", "").toLowerCase() ??
    "png";

  const safeExtension = extension.match(/^[a-z0-9]+$/) ? extension : "png";
  const fileName = `${Date.now()}-${randomUUID()}.${safeExtension}`;

  await mkdir(GAME_UPLOAD_DIR, { recursive: true });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const absoluteFilePath = path.join(GAME_UPLOAD_DIR, fileName);
  await writeFile(absoluteFilePath, fileBuffer);

  return `/uploads/games/${fileName}`;
}
