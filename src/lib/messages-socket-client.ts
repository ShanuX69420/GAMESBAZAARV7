"use client";

import { io, type Socket } from "socket.io-client";

export type ChatSocketMessage = {
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

export type ChatSocketServerEvents = {
  "message:created": (payload: {
    conversationId: string;
    message: ChatSocketMessage;
  }) => void;
  "conversation:upsert": (payload: { conversationId: string }) => void;
  "conversation:read": (payload: {
    conversationId: string;
    userId: string;
    readAt: string;
  }) => void;
  "presence:changed": (payload: {
    userId: string;
    isOnline: boolean;
    lastSeenAt: string;
  }) => void;
};

export type ChatSocketClientEvents = Record<string, never>;

type ChatSocket = Socket<ChatSocketServerEvents, ChatSocketClientEvents>;

let socketInstance: ChatSocket | null = null;
let socketUrlKey = "";

export function getMessagesSocket(wsUrl: string, token: string): ChatSocket {
  if (!socketInstance || socketUrlKey !== wsUrl) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    socketInstance = io(wsUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socketUrlKey = wsUrl;
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}
