import { getCurrentUser } from "@/lib/current-user";
import { publishMessagesWsEvent } from "@/lib/messages-ws-publisher";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const now = new Date();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userOneId: true,
      userTwoId: true,
    },
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  if (conversation.userOneId !== currentUser.id && conversation.userTwoId !== currentUser.id) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      update: { lastReadAt: now },
      create: {
        conversationId,
        userId: currentUser.id,
        lastReadAt: now,
      },
    }),
    prisma.user.update({
      where: { id: currentUser.id },
      data: { lastSeenAt: now },
    }),
  ]);

  await publishMessagesWsEvent({
    type: "conversation-read",
    conversationId,
    participantUserIds: [conversation.userOneId, conversation.userTwoId],
    userId: currentUser.id,
    readAt: now.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
