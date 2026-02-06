import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userOneId: currentUser.id }, { userTwoId: currentUser.id }],
    },
    select: {
      id: true,
      readStates: {
        where: { userId: currentUser.id },
        select: {
          lastReadAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          senderId: true,
          createdAt: true,
        },
      },
    },
  });

  const unreadCount = conversations.reduce((count, conversation) => {
    const lastMessage = conversation.messages[0];
    if (!lastMessage) {
      return count;
    }

    if (lastMessage.senderId === currentUser.id) {
      return count;
    }

    const lastReadAt = conversation.readStates[0]?.lastReadAt ?? null;
    const hasUnread = !lastReadAt || lastMessage.createdAt > lastReadAt;
    return hasUnread ? count + 1 : count;
  }, 0);

  return NextResponse.json({ unreadCount });
}
