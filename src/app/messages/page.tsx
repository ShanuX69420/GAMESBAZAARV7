import { MessagesPageClient } from "@/components/messages-page";
import { requireCurrentUser } from "@/lib/current-user";

type MessagesPageProps = {
  searchParams: Promise<{
    conversation?: string;
    user?: string;
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

  return (
    <MessagesPageClient
      currentUserId={currentUser.id}
      initialConversationId={initialConversationId}
      initialRecipientUserId={initialRecipientUserId}
    />
  );
}

