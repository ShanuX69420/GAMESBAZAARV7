import {
  getOtherConversationUserId,
  isUserOnline,
  normalizeConversationPair,
} from "@/lib/chat";
import { getCurrentUser } from "@/lib/current-user";
import { publishMessagesWsEvent } from "@/lib/messages-ws-publisher";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const startConversationSchema = z.object({
  recipientUserId: z.string().trim().min(1),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { lastSeenAt: new Date() },
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userOneId: currentUser.id }, { userTwoId: currentUser.id }],
    },
    orderBy: { lastMessageAt: "desc" },
    take: 120,
    select: {
      id: true,
      userOneId: true,
      userTwoId: true,
      lastMessageAt: true,
      userOne: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          lastSeenAt: true,
        },
      },
      userTwo: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          lastSeenAt: true,
        },
      },
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
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  const response = conversations.map((conversation) => {
    const otherUserId = getOtherConversationUserId(
      conversation.userOneId,
      conversation.userTwoId,
      currentUser.id,
    );
    const otherUser =
      conversation.userOne.id === otherUserId ? conversation.userOne : conversation.userTwo;
    const lastMessage = conversation.messages[0] ?? null;
    const lastReadAt = conversation.readStates[0]?.lastReadAt ?? null;
    const hasUnread =
      !!lastMessage &&
      lastMessage.senderId !== currentUser.id &&
      (!lastReadAt || lastMessage.createdAt > lastReadAt);

    return {
      id: conversation.id,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      hasUnread,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
        image: otherUser.image,
        createdAt: otherUser.createdAt.toISOString(),
        lastSeenAt: otherUser.lastSeenAt ? otherUser.lastSeenAt.toISOString() : null,
        isOnline: isUserOnline(otherUser.lastSeenAt),
      },
    };
  });

  return NextResponse.json({ conversations: response });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = startConversationSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid conversation request." }, { status: 400 });
  }

  const recipientUserId = parsed.data.recipientUserId;
  if (recipientUserId === currentUser.id) {
    return NextResponse.json({ message: "Cannot message yourself." }, { status: 400 });
  }

  const recipientUser = await prisma.user.findUnique({
    where: { id: recipientUserId },
    select: {
      id: true,
      isActive: true,
      isBlocked: true,
    },
  });

  if (!recipientUser || !recipientUser.isActive || recipientUser.isBlocked) {
    return NextResponse.json({ message: "Recipient is unavailable." }, { status: 400 });
  }

  const pair = normalizeConversationPair(currentUser.id, recipientUser.id);

  const conversation = await prisma.conversation.upsert({
    where: {
      userOneId_userTwoId: {
        userOneId: pair.userOneId,
        userTwoId: pair.userTwoId,
      },
    },
    update: {},
    create: {
      userOneId: pair.userOneId,
      userTwoId: pair.userTwoId,
      readStates: {
        create: [{ userId: pair.userOneId }, { userId: pair.userTwoId }],
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: currentUser.id },
      data: { lastSeenAt: new Date() },
    }),
    prisma.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: currentUser.id,
        },
      },
      update: {},
      create: {
        conversationId: conversation.id,
        userId: currentUser.id,
      },
    }),
  ]);

  await publishMessagesWsEvent({
    type: "conversation-upsert",
    conversationId: conversation.id,
    participantUserIds: [pair.userOneId, pair.userTwoId],
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
