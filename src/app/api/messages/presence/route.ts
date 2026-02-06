import { getCurrentUser } from "@/lib/current-user";
import { publishMessagesWsEvent } from "@/lib/messages-ws-publisher";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { lastSeenAt: now },
  });

  await publishMessagesWsEvent({
    type: "presence-changed",
    userId: currentUser.id,
    isOnline: true,
    lastSeenAt: now.toISOString(),
  });

  return NextResponse.json({ ok: true, lastSeenAt: now.toISOString() });
}
