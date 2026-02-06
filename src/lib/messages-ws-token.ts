import crypto from "node:crypto";

function getWsAuthSecret() {
  return process.env.WS_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-ws-auth-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createMessagesWsToken(userId: string, ttlSeconds = 24 * 60 * 60) {
  const secret = getWsAuthSecret();
  if (!secret || secret.length < 8) {
    throw new Error("WebSocket auth secret is not configured.");
  }

  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + ttlSeconds * 1000,
  });
  const payloadEncoded = base64UrlEncode(payload);
  const signature = crypto.createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
  return `${payloadEncoded}.${signature}`;
}

export function getMessagesWsUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (process.env.WS_URL) {
    return process.env.WS_URL;
  }

  const requestUrl = new URL(request.url);
  const wsProtocol = requestUrl.protocol === "https:" ? "https:" : "http:";
  const wsHost = process.env.WS_HOST_PUBLIC ?? requestUrl.hostname;
  const wsPort = process.env.WS_PORT ?? "3011";
  return `${wsProtocol}//${wsHost}:${wsPort}`;
}
