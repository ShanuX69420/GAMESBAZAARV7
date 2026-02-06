type ConversationMessagePayload = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
};

type MessageCreatedEvent = {
  type: "message-created";
  conversationId: string;
  participantUserIds: string[];
  message: ConversationMessagePayload;
};

type ConversationUpsertEvent = {
  type: "conversation-upsert";
  conversationId: string;
  participantUserIds: string[];
};

type ConversationReadEvent = {
  type: "conversation-read";
  conversationId: string;
  participantUserIds: string[];
  userId: string;
  readAt: string;
};

type PresenceChangedEvent = {
  type: "presence-changed";
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
};

export type MessagesWsPublishEvent =
  | MessageCreatedEvent
  | ConversationUpsertEvent
  | ConversationReadEvent
  | PresenceChangedEvent;

function getWsPublishUrl() {
  if (process.env.WS_INTERNAL_URL) {
    return process.env.WS_INTERNAL_URL;
  }

  const wsHost = process.env.WS_HOST ?? "127.0.0.1";
  const wsPort = process.env.WS_PORT ?? "3011";
  return `http://${wsHost}:${wsPort}/internal/publish`;
}

function getWsInternalSecret() {
  return (
    process.env.WS_INTERNAL_SECRET ??
    process.env.WS_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-ws-auth-secret"
  );
}

export async function publishMessagesWsEvent(event: MessagesWsPublishEvent) {
  const secret = getWsInternalSecret();
  const publishUrl = getWsPublishUrl();

  if (!secret || !publishUrl) {
    return;
  }

  try {
    await fetch(publishUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ws-internal-secret": secret,
      },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
    });
  } catch {
    // Do not fail API requests when websocket publisher is unavailable.
  }
}
