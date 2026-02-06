import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  isActive: boolean;
  sessionVersion: number;
};

async function getSessionUserIdAndVersion() {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionVersion = session?.user?.sessionVersion;

  if (!userId || typeof sessionVersion !== "number") {
    return null;
  }

  return { userId, sessionVersion };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sessionInfo = await getSessionUserIdAndVersion();
  if (!sessionInfo) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionInfo.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isBlocked: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    return null;
  }

  if (user.sessionVersion !== sessionInfo.sessionVersion) {
    return null;
  }

  if (user.isBlocked || !user.isActive) {
    return null;
  }

  return user;
}

export async function requireCurrentUser(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

export async function requireAdminUser(redirectTo = "/login") {
  const user = await requireCurrentUser(redirectTo);
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

export async function getAdminForApi() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
