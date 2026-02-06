import { formatLastSeen, isUserOnline } from "@/lib/chat";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";

type AdminChatsPageProps = {
  searchParams: Promise<{
    q?: string;
    conversation?: string;
    from?: string;
    to?: string;
  }>;
};

function parseDateInput(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toDayEnd(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function buildConversationHref(
  conversationId: string,
  query: string,
  from: string,
  to: string,
) {
  const params = new URLSearchParams();
  params.set("conversation", conversationId);
  if (query) {
    params.set("q", query);
  }
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  return `/admin/chats?${params.toString()}`;
}

export default async function AdminChatsPage({ searchParams }: AdminChatsPageProps) {
  const adminUser = await requireAdminUser();
  const resolvedSearchParams = await searchParams;

  const query = (resolvedSearchParams.q ?? "").trim();
  const fromInput = (resolvedSearchParams.from ?? "").trim();
  const toInput = (resolvedSearchParams.to ?? "").trim();
  const selectedConversationQueryId = (resolvedSearchParams.conversation ?? "").trim();

  const fromDate = parseDateInput(fromInput);
  const toDate = parseDateInput(toInput);

  const whereClauses: Prisma.ConversationWhereInput[] = [
    {
      messages: {
        some: {},
      },
    },
  ];

  if (query) {
    whereClauses.push({
      OR: [
        { id: { contains: query } },
        { userOne: { name: { contains: query } } },
        { userOne: { email: { contains: query } } },
        { userTwo: { name: { contains: query } } },
        { userTwo: { email: { contains: query } } },
        {
          messages: {
            some: {
              body: { contains: query },
            },
          },
        },
      ],
    });
  }

  if (fromDate || toDate) {
    whereClauses.push({
      lastMessageAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDayEnd(toDate) } : {}),
      },
    });
  }

  const conversations = await prisma.conversation.findMany({
    where: whereClauses.length > 0 ? { AND: whereClauses } : undefined,
    orderBy: { lastMessageAt: "desc" },
    take: 120,
    select: {
      id: true,
      lastMessageAt: true,
      userOne: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          lastSeenAt: true,
        },
      },
      userTwo: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          lastSeenAt: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  const selectedConversationId =
    selectedConversationQueryId &&
    conversations.some((conversation) => conversation.id === selectedConversationQueryId)
      ? selectedConversationQueryId
      : conversations[0]?.id ?? null;

  const selectedConversation = selectedConversationId
    ? await prisma.conversation.findUnique({
        where: { id: selectedConversationId },
        select: {
          id: true,
          createdAt: true,
          lastMessageAt: true,
          userOne: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              lastSeenAt: true,
              createdAt: true,
            },
          },
          userTwo: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              lastSeenAt: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      })
    : null;

  const selectedMessagesRaw = selectedConversationId
    ? await prisma.conversationMessage.findMany({
        where: { conversationId: selectedConversationId },
        orderBy: { createdAt: "desc" },
        take: 250,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    : [];

  const selectedMessages = [...selectedMessagesRaw].reverse();

  if (selectedConversationId) {
    const recentAuditWindowStart = new Date();
    recentAuditWindowStart.setMinutes(recentAuditWindowStart.getMinutes() - 5);
    const recentView = await prisma.adminConversationViewLog.findFirst({
      where: {
        adminId: adminUser.id,
        conversationId: selectedConversationId,
        viewedAt: {
          gte: recentAuditWindowStart,
        },
      },
      select: { id: true },
    });

    if (!recentView) {
      await prisma.adminConversationViewLog.create({
        data: {
          adminId: adminUser.id,
          conversationId: selectedConversationId,
        },
      });
    }
  }

  const recentViewLogs = selectedConversationId
    ? await prisma.adminConversationViewLog.findMany({
        where: { conversationId: selectedConversationId },
        orderBy: { viewedAt: "desc" },
        take: 12,
        select: {
          id: true,
          viewedAt: true,
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    : [];

  return (
    <div className="px-4 py-6 sm:px-6">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin Chat Monitor
              </h1>
              <p className="mt-1 text-sm text-muted">
                Read-only monitoring. Signed in as admin:{" "}
                <span className="font-medium text-foreground">{adminUser.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Back to admin
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Home
              </Link>
            </div>
          </div>

          <form className="mt-4 grid gap-2 md:grid-cols-[1fr_160px_160px_auto_auto]">
            <label className="flex items-center rounded-lg border border-border bg-white px-3 py-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by user, email, message text, or conversation ID"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <label className="flex items-center rounded-lg border border-border bg-white px-3 py-2">
              <input
                type="date"
                name="from"
                defaultValue={fromInput}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <label className="flex items-center rounded-lg border border-border bg-white px-3 py-2">
              <input
                type="date"
                name="to"
                defaultValue={toInput}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Search
            </button>
            <Link
              href="/admin/chats"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Clear
            </Link>
          </form>
        </header>

        <section className="grid gap-3 lg:grid-cols-[320px_1fr_280px]">
          <aside className="flex min-h-0 max-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Conversations ({conversations.length})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted">No conversations match your filters.</p>
              ) : null}

              {conversations.map((conversation) => {
                const isActive = selectedConversationId === conversation.id;
                const lastMessage = conversation.messages[0] ?? null;
                const isUserOneOnline = isUserOnline(conversation.userOne.lastSeenAt);
                const isUserTwoOnline = isUserOnline(conversation.userTwo.lastSeenAt);

                return (
                  <Link
                    key={conversation.id}
                    href={buildConversationHref(conversation.id, query, fromInput, toInput)}
                    className={`block rounded-lg border px-3 py-3 transition ${
                      isActive
                        ? "border-accent bg-emerald-50"
                        : "border-transparent hover:border-border hover:bg-surface"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {conversation.userOne.name} {"<->"} {conversation.userTwo.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {conversation.userOne.email} {" / "} {conversation.userTwo.email}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {lastMessage ? lastMessage.body : "No messages yet"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>
                        Msgs: {conversation._count.messages} ·{" "}
                        {isUserOneOnline || isUserTwoOnline ? "Online" : "Offline"}
                      </span>
                      <span>{new Date(conversation.lastMessageAt).toLocaleString()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <article className="flex min-h-0 max-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              {selectedConversation ? (
                <>
                  <p className="text-base font-semibold text-foreground">
                    {selectedConversation.userOne.name} {"<->"} {selectedConversation.userTwo.name}
                  </p>
                  <p className="text-xs text-muted">
                    Conversation ID: {selectedConversation.id}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Messages: {selectedConversation._count.messages} · Last activity:{" "}
                    {new Date(selectedConversation.lastMessageAt).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">Select a conversation to review messages.</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {selectedConversation && selectedMessages.length === 0 ? (
                <p className="text-sm text-muted">No messages in this conversation yet.</p>
              ) : null}

              <div className="space-y-0.5">
                {selectedMessages.map((message, index) => {
                  const previousMessage = index > 0 ? selectedMessages[index - 1] : null;
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
                              {message.sender.name}
                            </p>
                          ) : null}
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                            {message.body}
                          </p>
                        </div>
                        {shouldShowSender ? (
                          <p className="shrink-0 text-[11px] text-muted">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <aside className="flex min-h-0 max-h-[calc(100vh-14rem)] flex-col gap-3 overflow-y-auto">
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Participant A</p>
              {selectedConversation ? (
                <div className="mt-2 text-sm text-foreground">
                  <p className="font-semibold">{selectedConversation.userOne.name}</p>
                  <p className="text-xs text-muted">{selectedConversation.userOne.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    {isUserOnline(selectedConversation.userOne.lastSeenAt)
                      ? "Online"
                      : formatLastSeen(
                          selectedConversation.userOne.lastSeenAt?.toISOString() ?? null,
                        )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Joined: {new Date(selectedConversation.userOne.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">No conversation selected.</p>
              )}
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Participant B</p>
              {selectedConversation ? (
                <div className="mt-2 text-sm text-foreground">
                  <p className="font-semibold">{selectedConversation.userTwo.name}</p>
                  <p className="text-xs text-muted">{selectedConversation.userTwo.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    {isUserOnline(selectedConversation.userTwo.lastSeenAt)
                      ? "Online"
                      : formatLastSeen(
                          selectedConversation.userTwo.lastSeenAt?.toISOString() ?? null,
                        )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Joined: {new Date(selectedConversation.userTwo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">No conversation selected.</p>
              )}
            </article>

            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">View Audit</p>
              <p className="mt-1 text-xs text-muted">
                Recent admins who opened this chat.
              </p>
              {selectedConversationId && recentViewLogs.length === 0 ? (
                <p className="mt-2 text-xs text-muted">No audit entries yet.</p>
              ) : null}

              {recentViewLogs.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {recentViewLogs.map((log) => (
                    <li key={log.id} className="text-xs text-foreground">
                      <span className="font-semibold">{log.admin.name}</span>{" "}
                      <span className="text-muted">({log.admin.email})</span>
                      <div className="text-muted">
                        {new Date(log.viewedAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
