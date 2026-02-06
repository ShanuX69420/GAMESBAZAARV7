import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { deleteLocalProfileImage, saveProfileImage } from "@/lib/profile-image";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const profileNameSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid form submission." },
      { status: 400 },
    );
  }

  const nameValue = formData.get("name");
  const removeImageFlag = formData.get("removeImage") === "true";
  const avatarFileValue = formData.get("avatar");
  const avatarFile =
    avatarFileValue instanceof File && avatarFileValue.size > 0
      ? avatarFileValue
      : null;

  const parsedName = profileNameSchema.safeParse({ name: nameValue });
  if (!parsedName.success) {
    return NextResponse.json({ message: "Invalid display name." }, { status: 400 });
  }

  let nextImagePath: string | null = currentUser.image;

  if (removeImageFlag) {
    await deleteLocalProfileImage(currentUser.image);
    nextImagePath = null;
  }

  if (avatarFile) {
    try {
      const savedImagePath = await saveProfileImage(avatarFile);
      await deleteLocalProfileImage(nextImagePath);
      nextImagePath = savedImagePath;
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
        return NextResponse.json(
          { message: "Only image files are allowed." },
          { status: 400 },
        );
      }

      if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
        return NextResponse.json(
          { message: "Profile image must be 5MB or smaller." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { message: "Failed to upload profile image." },
        { status: 500 },
      );
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name: parsedName.data.name,
        image: nextImagePath,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Failed to update profile." },
      { status: 500 },
    );
  }
}
