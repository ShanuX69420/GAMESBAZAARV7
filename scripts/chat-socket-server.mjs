import crypto from "node:crypto";
import http from "node:http";
import { Server } from "socket.io";

const WS_PORT = Number(process.env.WS_PORT ?? 3011);
const WS_HOST = process.env.WS_HOST ?? "127.0.0.1";
const WS_AUTH_SECRET = process.env.WS_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-ws-auth-secret";
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET ?? WS_AUTH_SECRET;
const WS_CORS_ORIGIN = process.env.WS_CORS_ORIGIN ?? "*";

if (!WS_AUTH_SECRET || WS_AUTH_SECRET.length < 8) {
  throw new Error("WS auth secret is not configured.");
}

const activeConnectionCountByUserId = new Map();

function emitPresenceSnapshot(target) {
  target.emit("presence:snapshot", {
    onlineUserIds: Array.from(activeConnectionCountByUserId.keys()),
    emittedAt: new Date().toISOString(),
  });
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + "=".repeat(padding);
  return Buffer.from(padded, "base64").toString("utf8");
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyWsToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadEncoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", WS_AUTH_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (typeof payload.uid !== "string" || payload.uid.length === 0) {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeParticipantIds(participantUserIds) {
  if (!Array.isArray(participantUserIds)) {
    return [];
  }

  return participantUserIds
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function sanitizeMessagePayload(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const typed = message;
  if (!isNonEmptyString(typed.id)) {
    return null;
  }
  if (!isNonEmptyString(typed.body)) {
    return null;
  }
  if (!isNonEmptyString(typed.createdAt)) {
    return null;
  }
  if (!isNonEmptyString(typed.senderId)) {
    return null;
  }

  return {
    id: typed.id.trim(),
    body: typed.body,
    createdAt: typed.createdAt,
    senderId: typed.senderId.trim(),
    sender:
      typed.sender && typeof typed.sender === "object"
        ? {
            id: isNonEmptyString(typed.sender.id) ? typed.sender.id.trim() : "",
            name: isNonEmptyString(typed.sender.name) ? typed.sender.name : "User",
            image:
              typeof typed.sender.image === "string" && typed.sender.image.trim().length > 0
                ? typed.sender.image
                : null,
          }
        : undefined,
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/internal/publish") {
    const requestSecret = req.headers["x-ws-internal-secret"];
    const normalizedRequestSecret =
      typeof requestSecret === "string"
        ? requestSecret
        : Array.isArray(requestSecret)
          ? requestSecret[0]
          : "";

    if (!safeEqual(normalizedRequestSecret || "", WS_INTERNAL_SECRET)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Unauthorized." }));
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      let payload;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "Invalid body." }));
        return;
      }

      const type = typeof payload?.type === "string" ? payload.type : "";
      const participantUserIds = sanitizeParticipantIds(payload?.participantUserIds);

      if (type === "message-created") {
        const conversationId = isNonEmptyString(payload?.conversationId)
          ? payload.conversationId.trim()
          : "";
        const message = sanitizeMessagePayload(payload?.message);
        if (!conversationId || !message || participantUserIds.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, message: "Invalid message-created payload." }));
          return;
        }

        for (const userId of participantUserIds) {
          io.to(`user:${userId}`).emit("message:created", {
            conversationId,
            message,
          });
          io.to(`user:${userId}`).emit("conversation:upsert", {
            conversationId,
          });
        }
      } else if (type === "conversation-upsert") {
        const conversationId = isNonEmptyString(payload?.conversationId)
          ? payload.conversationId.trim()
          : "";
        if (!conversationId || participantUserIds.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, message: "Invalid conversation-upsert payload." }));
          return;
        }

        for (const userId of participantUserIds) {
          io.to(`user:${userId}`).emit("conversation:upsert", {
            conversationId,
          });
        }
      } else if (type === "conversation-read") {
        const conversationId = isNonEmptyString(payload?.conversationId)
          ? payload.conversationId.trim()
          : "";
        const readUserId = isNonEmptyString(payload?.userId) ? payload.userId.trim() : "";
        const readAt = isNonEmptyString(payload?.readAt) ? payload.readAt : new Date().toISOString();

        if (!conversationId || !readUserId || participantUserIds.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, message: "Invalid conversation-read payload." }));
          return;
        }

        for (const userId of participantUserIds) {
          io.to(`user:${userId}`).emit("conversation:read", {
            conversationId,
            userId: readUserId,
            readAt,
          });
        }
      } else if (type === "presence-changed") {
        const userId = isNonEmptyString(payload?.userId) ? payload.userId.trim() : "";
        if (!userId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, message: "Invalid presence-changed payload." }));
          return;
        }

        io.emit("presence:changed", {
          userId,
          isOnline: Boolean(payload?.isOnline),
          lastSeenAt: isNonEmptyString(payload?.lastSeenAt)
            ? payload.lastSeenAt
            : new Date().toISOString(),
        });
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "Unknown event type." }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });

    req.on("error", () => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Request error." }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, message: "Not found." }));
});

const io = new Server(server, {
  cors: {
    origin: WS_CORS_ORIGIN,
    credentials: false,
  },
  transports: ["websocket", "polling"],
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const payload = verifyWsToken(typeof token === "string" ? token : "");
  if (!payload) {
    next(new Error("Unauthorized"));
    return;
  }

  socket.data.userId = payload.uid;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  if (!isNonEmptyString(userId)) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);

  const currentCount = activeConnectionCountByUserId.get(userId) ?? 0;
  activeConnectionCountByUserId.set(userId, currentCount + 1);

  if (currentCount === 0) {
    io.emit("presence:changed", {
      userId,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
    });
  }

  emitPresenceSnapshot(socket);

  socket.on("presence:snapshot:request", () => {
    emitPresenceSnapshot(socket);
  });

  socket.on("disconnect", () => {
    const previousCount = activeConnectionCountByUserId.get(userId) ?? 0;
    if (previousCount <= 1) {
      activeConnectionCountByUserId.delete(userId);
      io.emit("presence:changed", {
        userId,
        isOnline: false,
        lastSeenAt: new Date().toISOString(),
      });
      return;
    }

    activeConnectionCountByUserId.set(userId, previousCount - 1);
  });
});

server.listen(WS_PORT, WS_HOST, () => {
  console.log(`[chat-ws] listening on http://${WS_HOST}:${WS_PORT}`);
});
