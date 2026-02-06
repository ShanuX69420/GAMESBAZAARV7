import { MessagesPageClient } from "@/components/messages-page";
import { requireCurrentUser } from "@/lib/current-user";

type MessagesPageProps = {
  searchParams: Promise<{
    conversation?: string;
    user?: string;
    view?: string;
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const currentUser = await requireCurrentUser();
  const resolvedSearchParams = await searchParams;

  const initialConversationId =
    typeof resolvedSearchParams.conversation === "string" &&
    resolvedSearchParams.conversation.trim().length > 0
      ? resolvedSearchParams.conversation.trim()
      : undefined;

  const initialRecipientUserId =
    typeof resolvedSearchParams.user === "string" &&
    resolvedSearchParams.user.trim().length > 0
      ? resolvedSearchParams.user.trim()
      : undefined;

  const initialMobileView =
    typeof resolvedSearchParams.view === "string" &&
    resolvedSearchParams.view.trim().toLowerCase() === "list"
      ? "list"
      : undefined;

  return (
    <MessagesPageClient
      currentUserId={currentUser.id}
      currentUserName={currentUser.name ?? "User"}
      initialConversationId={initialConversationId}
      initialRecipientUserId={initialRecipientUserId}
      initialMobileView={initialMobileView}
    />
  );
}
