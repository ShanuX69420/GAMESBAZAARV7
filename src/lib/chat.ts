export const ONLINE_THRESHOLD_MS = 60 * 1000;

export function normalizeConversationPair(userAId: string, userBId: string) {
  return userAId.localeCompare(userBId) <= 0
    ? { userOneId: userAId, userTwoId: userBId }
    : { userOneId: userBId, userTwoId: userAId };
}

export function getOtherConversationUserId(
  userOneId: string,
  userTwoId: string,
  currentUserId: string,
) {
  return userOneId === currentUserId ? userTwoId : userOneId;
}

export function isUserOnline(lastSeenAt: Date | null | undefined) {
  if (!lastSeenAt) {
    return false;
  }

  const delta = Date.now() - lastSeenAt.getTime();
  return delta <= ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) {
    return "Last seen: unknown";
  }

  const dateValue = new Date(lastSeenAt);
  if (Number.isNaN(dateValue.getTime())) {
    return "Last seen: unknown";
  }

  const now = Date.now();
  const diffMs = now - dateValue.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) {
    return "Last seen: just now";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Last seen: ${diffMin} min ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Last seen: ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Last seen: ${diffDays}d ago`;
}
