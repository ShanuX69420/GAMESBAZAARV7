import { getCurrentUser } from "@/lib/current-user";
import { publishMessagesWsEvent } from "@/lib/messages-ws-publisher";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const url = new URL(request.url);
  const afterRaw = url.searchParams.get("after");

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

  const afterDate =
    afterRaw && !Number.isNaN(new Date(afterRaw).getTime()) ? new Date(afterRaw) : null;

  const messages = await prisma.conversationMessage.findMany({
    where: {
      conversationId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: afterDate ? 200 : 150,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      sender: message.sender,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { conversationId } = await context.params;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid message body." }, { status: 400 });
  }

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

  const createdMessage = await prisma.$transaction(async (tx) => {
    const message = await tx.conversationMessage.create({
      data: {
        conversationId,
        senderId: currentUser.id,
        body: parsed.data.body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    await Promise.all([
      tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      }),
      tx.conversationRead.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: currentUser.id,
          },
        },
        update: {
          lastReadAt: message.createdAt,
        },
        create: {
          conversationId,
          userId: currentUser.id,
          lastReadAt: message.createdAt,
        },
      }),
      tx.user.update({
        where: { id: currentUser.id },
        data: { lastSeenAt: new Date() },
      }),
    ]);

    return message;
  });

  await publishMessagesWsEvent({
    type: "message-created",
    conversationId,
    participantUserIds: [conversation.userOneId, conversation.userTwoId],
    message: {
      id: createdMessage.id,
      body: createdMessage.body,
      createdAt: createdMessage.createdAt.toISOString(),
      senderId: createdMessage.senderId,
      sender: createdMessage.sender,
    },
  });

  return NextResponse.json(
    {
      message: {
        id: createdMessage.id,
        body: createdMessage.body,
        createdAt: createdMessage.createdAt.toISOString(),
        senderId: createdMessage.senderId,
        sender: createdMessage.sender,
      },
    },
    { status: 201 },
  );
}
