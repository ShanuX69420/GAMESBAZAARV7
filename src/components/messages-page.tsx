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
  initialConversationId?: string;
  initialRecipientUserId?: string;
};

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function isOnlineFromLastSeen(lastSeenAt: string | null | undefined, fallbackOnline: boolean) {
  if (!lastSeenAt) {
    return fallbackOnline;
  }

  const dateValue = new Date(lastSeenAt);
  if (Number.isNaN(dateValue.getTime())) {
    return fallbackOnline;
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
  initialConversationId,
  initialRecipientUserId,
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
  const [, setPresenceTick] = useState(0);
  const conversationsRequestRef = useRef(0);
  const currentUserIdRef = useRef(currentUserId);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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
    const fallbackName = message.senderId === currentUserIdRef.current ? "You" : "User";
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

        socket.on("message:created", handleMessageCreated);
        socket.on("conversation:upsert", handleConversationUpsert);
        socket.on("conversation:read", handleConversationRead);
        socket.on("presence:changed", handlePresenceChanged);

        cleanupSocketListeners = () => {
          socket.off("message:created", handleMessageCreated);
          socket.off("conversation:upsert", handleConversationUpsert);
          socket.off("conversation:read", handleConversationRead);
          socket.off("presence:changed", handlePresenceChanged);
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
  }, [markConversationRead, refreshConversations, toConversationMessage]);

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

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted">
            Unified chat history across all listings and deals.
          </p>
          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </header>

        <section className="mt-4 grid gap-3 xl:grid-cols-[300px_1fr_280px]">
          <aside className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Chats</p>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-2">
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
                    onClick={() => setActiveConversationId(conversation.id)}
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

          <article className="flex min-h-[68vh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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

            <div className="flex-1 overflow-y-auto px-4 py-3">
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
                          isOwn
                            ? "bg-accent text-white"
                            : "bg-surface text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            isOwn ? "text-emerald-100" : "text-muted"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
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

          <aside className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
    </div>
  );
}
