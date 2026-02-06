"use client";

import { formatLastSeen } from "@/lib/chat";
import { isUserOnline } from "@/lib/chat";
import { getMessagesSocket, type ChatSocketMessage } from "@/lib/messages-socket-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConversationSummary = {
  id: string;
  lastMessageAt: string;
  hasUnread: boolean;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
  otherUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
    lastSeenAt: string | null;
    isOnline: boolean;
  };
};

type ConversationMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
};

type MessagesPageClientProps = {
  currentUserId: string;
  currentUserName: string;
  initialConversationId?: string;
  initialRecipientUserId?: string;
  initialMobileView?: "list" | "chat";
};

type IncomingMessageToast = {
  id: string;
  conversationId: string;
  senderName: string;
  preview: string;
};

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function isOnlineFromLastSeen(lastSeenAt: string | null | undefined, fallbackOnline: boolean) {
  if (fallbackOnline) {
    return true;
  }

  if (!lastSeenAt) {
    return false;
  }

  const dateValue = new Date(lastSeenAt);
  if (Number.isNaN(dateValue.getTime())) {
    return false;
  }

  return isUserOnline(dateValue);
}

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

export function MessagesPageClient({
  currentUserId,
  currentUserName,
  initialConversationId,
  initialRecipientUserId,
  initialMobileView,
}: MessagesPageClientProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    initialMobileView ??
      (initialConversationId || initialRecipientUserId ? "chat" : "list"),
  );
  const [, setPresenceTick] = useState(0);
  const [incomingMessageToasts, setIncomingMessageToasts] = useState<IncomingMessageToast[]>([]);
  const conversationsRequestRef = useRef(0);
  const currentUserIdRef = useRef(currentUserId);
  const currentUserNameRef = useRef(currentUserName.trim() || "User");
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const toastTimerRef = useRef<Map<string, number>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    currentUserNameRef.current = currentUserName.trim() || "User";
  }, [currentUserName]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPresenceTick((value) => value + 1);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMobileView("list");
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (initialMobileView) {
      setMobileView(initialMobileView);
    }
  }, [initialMobileView]);

  const dismissToast = useCallback((toastId: string) => {
    const existingTimer = toastTimerRef.current.get(toastId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      toastTimerRef.current.delete(toastId);
    }
    setIncomingMessageToasts((previous) =>
      previous.filter((toast) => toast.id !== toastId),
    );
  }, []);

  const pushIncomingMessageToast = useCallback(
    (event: { conversationId: string; message: ChatSocketMessage }) => {
      const toastId = event.message.id;
      setIncomingMessageToasts((previous) => {
        if (previous.some((toast) => toast.id === toastId)) {
          return previous;
        }

        const conversationFromState = conversationsRef.current.find(
          (conversation) => conversation.id === event.conversationId,
        );

        const senderName =
          event.message.sender?.name?.trim() ||
          conversationFromState?.otherUser.name ||
          "New message";

        const preview = truncate(event.message.body, 90);
        const next = [
          ...previous,
          {
            id: toastId,
            conversationId: event.conversationId,
            senderName,
            preview,
          },
        ];

        return next.slice(-4);
      });

      const timer = window.setTimeout(() => {
        dismissToast(toastId);
      }, 4500);
      toastTimerRef.current.set(toastId, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timersRef = toastTimerRef.current;
    return () => {
      for (const timer of timersRef.values()) {
        window.clearTimeout(timer);
      }
      timersRef.clear();
    };
  }, []);

  useEffect(() => {
    const handleOpenListView = () => {
      setMobileView("list");
    };
    window.addEventListener("messages:open-list", handleOpenListView);
    return () => {
      window.removeEventListener("messages:open-list", handleOpenListView);
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const activeOtherUser = activeConversation?.otherUser ?? null;

  const refreshConversations = useCallback(
    async (options?: { preferredConversationId?: string | null; forcePreferred?: boolean }) => {
      const requestId = ++conversationsRequestRef.current;

      const response = await fetch("/api/messages/conversations", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations.");
      }

      const payload = (await response.json()) as { conversations: ConversationSummary[] };
      if (requestId !== conversationsRequestRef.current) {
        return;
      }

      const nextConversations = payload.conversations ?? [];
      setConversations(nextConversations);

      setActiveConversationId((currentActiveConversationId) => {
        const preferredConversationId = options?.preferredConversationId ?? null;
        const hasConversation = (conversationId: string | null | undefined) =>
          !!conversationId &&
          nextConversations.some((conversation) => conversation.id === conversationId);

        if (options?.forcePreferred && hasConversation(preferredConversationId)) {
          return preferredConversationId!;
        }

        if (hasConversation(currentActiveConversationId)) {
          return currentActiveConversationId;
        }

        if (hasConversation(preferredConversationId)) {
          return preferredConversationId!;
        }

        return nextConversations[0]?.id ?? null;
      });
    },
    [],
  );

  const fetchMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `/api/messages/conversations/${conversationId}/messages`,
      { method: "GET", cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error("Failed to load messages.");
    }
    const payload = (await response.json()) as { messages: ConversationMessage[] };
    return payload.messages ?? [];
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    await fetch(`/api/messages/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }, []);

  const toConversationMessage = useCallback((message: ChatSocketMessage): ConversationMessage => {
    const fallbackName =
      message.senderId === currentUserIdRef.current ? currentUserNameRef.current : "User";
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: {
        id: message.sender?.id?.trim() || message.senderId,
        name: message.sender?.name?.trim() || fallbackName,
        image: message.sender?.image ?? null,
      },
    };
  }, []);

  const sendPresenceHeartbeat = useCallback(async () => {
    await fetch("/api/messages/presence", {
      method: "POST",
    });
  }, []);

  const startConversationWithUser = useCallback(async (recipientUserId: string) => {
    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientUserId }),
    });

    if (!response.ok) {
      throw new Error("Could not start conversation.");
    }

    const payload = (await response.json()) as { conversationId: string };
    return payload.conversationId;
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setIsLoadingConversations(true);
      setErrorMessage("");
      try {
        let preferredConversationId = initialConversationId ?? null;

        if (initialRecipientUserId) {
          if (initialRecipientUserId === currentUserId) {
            preferredConversationId = null;
            if (isMounted) {
              setErrorMessage("You cannot start a chat with yourself.");
            }
          } else {
            const conversationId = await startConversationWithUser(initialRecipientUserId);
            preferredConversationId = conversationId;
          }
        }

        await refreshConversations({
          preferredConversationId,
          forcePreferred: !!preferredConversationId,
        });
      } catch {
        if (isMounted) {
          setErrorMessage("Could not load conversations.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingConversations(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    currentUserId,
    initialConversationId,
    initialRecipientUserId,
    refreshConversations,
    startConversationWithUser,
  ]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);
    setErrorMessage("");

    (async () => {
      try {
        const initialMessages = await fetchMessages(activeConversationId);
        if (!isMounted) {
          return;
        }
        setMessages(initialMessages);
        if (initialMessages.some((message) => message.senderId !== currentUserIdRef.current)) {
          await markConversationRead(activeConversationId);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Could not load chat messages.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, fetchMessages, markConversationRead]);

  useEffect(() => {
    sendPresenceHeartbeat().catch(() => undefined);
    const heartbeatInterval = window.setInterval(() => {
      sendPresenceHeartbeat().catch(() => undefined);
    }, 25000);

    return () => {
      window.clearInterval(heartbeatInterval);
    };
  }, [sendPresenceHeartbeat]);

  useEffect(() => {
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

        const payload = (await response.json()) as {
          token: string;
          wsUrl: string;
        };
        if (!payload?.token || !payload?.wsUrl || !isMounted) {
          return;
        }

        const socket = getMessagesSocket(payload.wsUrl, payload.token);

        const handleMessageCreated = async (event: {
          conversationId: string;
          message: ChatSocketMessage;
        }) => {
          const selectedConversationId = activeConversationIdRef.current;
          if (!selectedConversationId) {
            await refreshConversations();
            return;
          }

          if (event.conversationId === selectedConversationId) {
            const nextMessage = toConversationMessage(event.message);
            setMessages((previous) => upsertMessageById(previous, nextMessage));

            if (event.message.senderId !== currentUserIdRef.current) {
              await markConversationRead(event.conversationId);
            }
          } else if (event.message.senderId !== currentUserIdRef.current) {
            pushIncomingMessageToast(event);
          }

          await refreshConversations({
            preferredConversationId: selectedConversationId,
          });
        };

        const handleConversationUpsert = async () => {
          await refreshConversations({
            preferredConversationId: activeConversationIdRef.current,
          });
        };

        const handleConversationRead = async () => {
          await refreshConversations({
            preferredConversationId: activeConversationIdRef.current,
          });
        };

        const handlePresenceChanged = (event: {
          userId: string;
          isOnline: boolean;
          lastSeenAt: string;
        }) => {
          setConversations((previous) =>
            previous.map((conversation) => {
              if (conversation.otherUser.id !== event.userId) {
                return conversation;
              }

              return {
                ...conversation,
                otherUser: {
                  ...conversation.otherUser,
                  isOnline: event.isOnline,
                  lastSeenAt: event.lastSeenAt,
                },
              };
            }),
          );
        };

        const handlePresenceSnapshot = (event: {
          onlineUserIds: string[];
          emittedAt: string;
        }) => {
          const onlineUsers = new Set(
            Array.isArray(event.onlineUserIds)
              ? event.onlineUserIds.filter((value): value is string => typeof value === "string")
              : [],
          );

          setConversations((previous) =>
            previous.map((conversation) => {
              const shouldBeOnline = onlineUsers.has(conversation.otherUser.id);
              const nextLastSeenAt = shouldBeOnline
                ? conversation.otherUser.lastSeenAt ?? event.emittedAt
                : conversation.otherUser.lastSeenAt;

              if (
                conversation.otherUser.isOnline === shouldBeOnline &&
                conversation.otherUser.lastSeenAt === nextLastSeenAt
              ) {
                return conversation;
              }

              return {
                ...conversation,
                otherUser: {
                  ...conversation.otherUser,
                  isOnline: shouldBeOnline,
                  lastSeenAt: nextLastSeenAt,
                },
              };
            }),
          );
        };

        socket.on("message:created", handleMessageCreated);
        socket.on("conversation:upsert", handleConversationUpsert);
        socket.on("conversation:read", handleConversationRead);
        socket.on("presence:changed", handlePresenceChanged);
        socket.on("presence:snapshot", handlePresenceSnapshot);
        socket.emit("presence:snapshot:request");

        cleanupSocketListeners = () => {
          socket.off("message:created", handleMessageCreated);
          socket.off("conversation:upsert", handleConversationUpsert);
          socket.off("conversation:read", handleConversationRead);
          socket.off("presence:changed", handlePresenceChanged);
          socket.off("presence:snapshot", handlePresenceSnapshot);
        };
      } catch {
        // Messages page still works with manual refresh if socket server is unavailable.
      }
    })();

    return () => {
      isMounted = false;
      if (cleanupSocketListeners) {
        cleanupSocketListeners();
      }
    };
  }, [
    markConversationRead,
    pushIncomingMessageToast,
    refreshConversations,
    toConversationMessage,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSendMessage() {
    const trimmed = draft.trim();
    if (!activeConversationId || !trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/messages/conversations/${activeConversationId}/messages`,
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
      await refreshConversations({ preferredConversationId: activeConversationId });
    } catch {
      setErrorMessage("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  function renderMessagesTimeline() {
    const ownDisplayName = currentUserNameRef.current;

    return (
      <div className="space-y-0.5">
        {messages.map((message, index) => {
          const isOwn = message.senderId === currentUserId;
          const senderName = isOwn ? ownDisplayName : message.sender.name || "User";
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const currentMessageTime = new Date(message.createdAt).getTime();
          const previousMessageTime = previousMessage
            ? new Date(previousMessage.createdAt).getTime()
            : Number.NaN;
          const hasFiveMinuteGap =
            !previousMessage ||
            !Number.isFinite(currentMessageTime) ||
            !Number.isFinite(previousMessageTime) ||
            currentMessageTime - previousMessageTime >= 5 * 60 * 1000;
          const shouldShowSender =
            !previousMessage ||
            previousMessage.senderId !== message.senderId ||
            hasFiveMinuteGap;
          const shouldShowTimestamp = shouldShowSender;

          return (
            <div
              key={message.id}
              className={`rounded-md px-2 ${
                shouldShowSender ? "pt-2 pb-1.5" : "pt-0.5 pb-1.5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {shouldShowSender ? (
                    <p className="text-[15px] font-bold leading-tight text-foreground">
                      {senderName}
                    </p>
                    ) : null}
                  <p
                    className={`whitespace-pre-wrap break-words text-sm text-foreground ${
                      shouldShowSender ? "mt-0.5" : "mt-0"
                    }`}
                  >
                    {message.body}
                  </p>
                </div>
                {shouldShowTimestamp ? (
                  <p className="shrink-0 text-[11px] text-muted">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        {errorMessage ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <section className="md:hidden">
          {mobileView === "list" || !activeConversationId ? (
            <aside className="flex h-[calc(100vh-13.5rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Chats</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {isLoadingConversations ? (
                  <p className="px-2 py-3 text-sm text-muted">Loading chats...</p>
                ) : null}

                {!isLoadingConversations && conversations.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted">No conversations yet.</p>
                ) : null}

                {conversations.map((conversation) => {
                  const isOtherUserOnline = isOnlineFromLastSeen(
                    conversation.otherUser.lastSeenAt,
                    conversation.otherUser.isOnline,
                  );
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setMobileView("chat");
                      }}
                      className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-surface"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-9 shrink-0">
                          {conversation.otherUser.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={conversation.otherUser.image}
                              alt={`${conversation.otherUser.name} avatar`}
                              className="h-9 w-9 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                              {conversation.otherUser.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card ${
                              isOtherUserOnline ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {conversation.otherUser.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {conversation.lastMessage
                              ? truncate(conversation.lastMessage.body, 36)
                              : "No messages yet"}
                          </p>
                        </div>

                        <p className="shrink-0 text-[11px] text-muted">
                          {new Date(conversation.lastMessageAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : (
            <article className="flex h-[calc(100vh-13.5rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                {activeOtherUser ? (
                  (() => {
                    const isActiveOtherUserOnline = isOnlineFromLastSeen(
                      activeOtherUser.lastSeenAt,
                      activeOtherUser.isOnline,
                    );

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMobileView("list")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm text-foreground transition hover:bg-surface"
                          aria-label="Back to chats"
                        >
                          ←
                        </button>
                        {activeOtherUser.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeOtherUser.image}
                            alt={`${activeOtherUser.name} avatar`}
                            className="h-9 w-9 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                            {activeOtherUser.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {activeOtherUser.name}
                          </p>
                          <p
                            className={`text-xs ${
                              isActiveOtherUserOnline ? "text-emerald-600" : "text-muted"
                            }`}
                          >
                            {isActiveOtherUserOnline
                              ? "Online"
                              : formatLastSeen(activeOtherUser.lastSeenAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-muted">Select a conversation to start chatting.</p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {activeConversationId && isLoadingMessages ? (
                  <p className="text-sm text-muted">Loading messages...</p>
                ) : null}

                {activeConversationId && !isLoadingMessages && messages.length === 0 ? (
                  <p className="text-sm text-muted">No messages yet. Say hello.</p>
                ) : null}

                {renderMessagesTimeline()}
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
                        void handleSendMessage();
                      }
                    }}
                    disabled={!activeConversationId}
                    placeholder={activeConversationId ? "Type a message..." : "Select a chat first"}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-surface"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={!activeConversationId || !draft.trim() || isSending}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </article>
          )}
        </section>

        <section className="hidden h-[calc(100vh-13.5rem)] min-h-[520px] gap-3 md:grid md:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr_280px]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Chats</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoadingConversations ? (
                <p className="px-2 py-3 text-sm text-muted">Loading chats...</p>
              ) : null}

              {!isLoadingConversations && conversations.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted">No conversations yet.</p>
              ) : null}

              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const isOtherUserOnline = isOnlineFromLastSeen(
                  conversation.otherUser.lastSeenAt,
                  conversation.otherUser.isOnline,
                );
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setMobileView("chat");
                    }}
                    className={`w-full rounded-lg px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-surface"
                        : "hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative h-9 w-9 shrink-0">
                        {conversation.otherUser.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conversation.otherUser.image}
                            alt={`${conversation.otherUser.name} avatar`}
                            className="h-9 w-9 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                            {conversation.otherUser.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card ${
                            isOtherUserOnline ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {conversation.otherUser.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {conversation.lastMessage
                            ? truncate(conversation.lastMessage.body, 36)
                            : "No messages yet"}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted">
                          {new Date(conversation.lastMessageAt).toLocaleDateString()}
                        </p>
                        {conversation.hasUnread ? (
                          <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-accent" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              {activeOtherUser ? (
                (() => {
                  const isActiveOtherUserOnline = isOnlineFromLastSeen(
                    activeOtherUser.lastSeenAt,
                    activeOtherUser.isOnline,
                  );
                  return (
                <div className="flex items-center gap-3">
                  {activeOtherUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeOtherUser.image}
                      alt={`${activeOtherUser.name} avatar`}
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted">
                      {activeOtherUser.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-foreground">{activeOtherUser.name}</p>
                    <p
                      className={`text-xs ${
                        isActiveOtherUserOnline ? "text-emerald-600" : "text-muted"
                      }`}
                    >
                      {isActiveOtherUserOnline ? "Online" : formatLastSeen(activeOtherUser.lastSeenAt)}
                    </p>
                  </div>
                </div>
                  );
                })()
              ) : (
                <p className="text-sm text-muted">Select a conversation to start chatting.</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {!activeConversationId ? (
                <p className="text-sm text-muted">
                  No active conversation selected.
                </p>
              ) : null}

              {activeConversationId && isLoadingMessages ? (
                <p className="text-sm text-muted">Loading messages...</p>
              ) : null}

              {activeConversationId && !isLoadingMessages && messages.length === 0 ? (
                <p className="text-sm text-muted">No messages yet. Say hello.</p>
              ) : null}

              {renderMessagesTimeline()}
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
                      void handleSendMessage();
                    }
                  }}
                  disabled={!activeConversationId}
                  placeholder={activeConversationId ? "Type a message..." : "Select a chat first"}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-surface"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!activeConversationId || !draft.trim() || isSending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </article>

          <aside className="hidden min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm xl:block">
            <p className="text-sm font-semibold text-foreground">User Info</p>

            {activeOtherUser ? (
              (() => {
                const isActiveOtherUserOnline = isOnlineFromLastSeen(
                  activeOtherUser.lastSeenAt,
                  activeOtherUser.isOnline,
                );
                return (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  {activeOtherUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeOtherUser.image}
                      alt={`${activeOtherUser.name} avatar`}
                      className="h-11 w-11 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-muted">
                      {activeOtherUser.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{activeOtherUser.name}</p>
                    <p className="text-xs text-muted">{activeOtherUser.email}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
                  <p>
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        isActiveOtherUserOnline ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {isActiveOtherUserOnline ? "Online" : "Offline"}
                    </span>
                  </p>
                  <p className="mt-1">{formatLastSeen(activeOtherUser.lastSeenAt)}</p>
                  <p className="mt-1">
                    Joined: {new Date(activeOtherUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
                );
              })()
            ) : (
              <p className="mt-2 text-sm text-muted">Open a conversation to view profile details.</p>
            )}
          </aside>
        </section>
      </main>

      {incomingMessageToasts.length > 0 ? (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 sm:bottom-6 sm:right-6">
          {incomingMessageToasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              onClick={() => {
                setActiveConversationId(toast.conversationId);
                setMobileView("chat");
                dismissToast(toast.id);
              }}
              className="block w-[min(92vw,320px)] rounded-lg border border-border bg-card px-3 py-2 text-left shadow-lg transition hover:border-accent hover:shadow-xl"
            >
              <p className="text-sm font-semibold text-foreground">{toast.senderName}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{toast.preview}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
