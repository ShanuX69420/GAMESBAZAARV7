"use client";

import { getMessagesSocket, type ChatSocketMessage } from "@/lib/messages-socket-client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ListingMessageBoxProps = {
  currentUserId: string | null;
  sellerId: string;
  sellerName: string;
};

type ConversationMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
};

function upsertMessageById<TMessage extends { id: string }>(
  currentMessages: TMessage[],
  nextMessage: TMessage,
) {
  const existingIndex = currentMessages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) {
    return [...currentMessages, nextMessage];
  }

  const updated = currentMessages.slice();
  updated[existingIndex] = nextMessage;
  return updated;
}

export function ListingMessageBox({
  currentUserId,
  sellerId,
  sellerName,
}: ListingMessageBoxProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const canChat = useMemo(
    () => Boolean(currentUserId && currentUserId !== sellerId),
    [currentUserId, sellerId],
  );

  useEffect(() => {
    if (!canChat) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const startResponse = await fetch("/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientUserId: sellerId }),
        });

        if (!startResponse.ok) {
          throw new Error("start-failed");
        }

        const startPayload = (await startResponse.json()) as { conversationId: string };
        if (!isMounted) {
          return;
        }
        setConversationId(startPayload.conversationId);
      } catch {
        if (isMounted) {
          setErrorMessage("Could not open chat.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [canChat, sellerId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let isMounted = true;

    async function refreshMessages() {
      const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("messages-failed");
      }
      const payload = (await response.json()) as { messages: ConversationMessage[] };
      if (isMounted) {
        setMessages(payload.messages ?? []);
      }

      await fetch(`/api/messages/conversations/${conversationId}/read`, {
        method: "POST",
      });
    }

    refreshMessages().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !canChat) {
      return;
    }

    let isMounted = true;
    let cleanupSocketListeners: (() => void) | null = null;

    (async () => {
      try {
        const response = await fetch("/api/messages/ws-token", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok || !isMounted) {
          return;
        }

        const payload = (await response.json()) as { token: string; wsUrl: string };
        if (!payload?.token || !payload?.wsUrl || !isMounted) {
          return;
        }

        const socket = getMessagesSocket(payload.wsUrl, payload.token);

        const handleMessageCreated = async (event: {
          conversationId: string;
          message: ChatSocketMessage;
        }) => {
          if (event.conversationId !== conversationId) {
            return;
          }

          const nextMessage: ConversationMessage = {
            id: event.message.id,
            body: event.message.body,
            createdAt: event.message.createdAt,
            senderId: event.message.senderId,
          };

          setMessages((previous) => upsertMessageById(previous, nextMessage));

          if (event.message.senderId !== currentUserId) {
            await fetch(`/api/messages/conversations/${conversationId}/read`, {
              method: "POST",
            });
          }
        };

        socket.on("message:created", handleMessageCreated);
        cleanupSocketListeners = () => {
          socket.off("message:created", handleMessageCreated);
        };
      } catch {
        // Listing chat still works with manual sends if socket server is unavailable.
      }
    })();

    return () => {
      isMounted = false;
      if (cleanupSocketListeners) {
        cleanupSocketListeners();
      }
    };
  }, [canChat, conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!conversationId || !trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        },
      );
      if (!response.ok) {
        throw new Error("send-failed");
      }
      const payload = (await response.json()) as { message: ConversationMessage };
      setMessages((previous) => upsertMessageById(previous, payload.message));
      setDraft("");
    } catch {
      setErrorMessage("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  if (!currentUserId) {
    return (
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted">
          Login to message this seller.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-flex rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
        >
          Login
        </Link>
      </article>
    );
  }

  if (currentUserId === sellerId) {
    return (
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted">
          This is your listing. Buyer messages will appear in your Messages page.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Chat with {sellerName}</p>
      </div>

      <div className="h-56 overflow-y-auto px-4 py-3">
        {isLoading ? <p className="text-sm text-muted">Loading chat...</p> : null}
        {!isLoading && messages.length === 0 ? (
          <p className="text-sm text-muted">Start the conversation with this seller.</p>
        ) : null}

        <div className="space-y-2">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isOwn ? "bg-accent text-white" : "bg-surface text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            disabled={!conversationId}
            placeholder="Message seller..."
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-surface"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!conversationId || !draft.trim() || isSending}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
        ) : null}
      </div>
    </article>
  );
}
