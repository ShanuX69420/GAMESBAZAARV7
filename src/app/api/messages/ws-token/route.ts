import { getCurrentUser } from "@/lib/current-user";
import { createMessagesWsToken, getMessagesWsUrl } from "@/lib/messages-ws-token";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let token: string;
  try {
    token = createMessagesWsToken(currentUser.id);
  } catch {
    return NextResponse.json({ message: "WebSocket auth is not configured." }, { status: 500 });
  }

  return NextResponse.json({
    token,
    wsUrl: getMessagesWsUrl(request),
  });
}
