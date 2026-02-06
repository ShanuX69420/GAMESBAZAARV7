"use client";

import { getMessagesSocket } from "@/lib/messages-socket-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type HeaderMessagesButtonProps = {
  currentUserId: string;
  href: string;
  className: string;
  iconClassName: string;
  ariaLabel: string;
  title?: string;
};

export function HeaderMessagesButton({
  currentUserId,
  href,
  className,
  iconClassName,
  ariaLabel,
  title,
}: HeaderMessagesButtonProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const requestIdRef = useRef(0);
  const notifiedConversationIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      if (context.state === "suspended") {
        void context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.065, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.23);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    } catch {
      // ignore unsupported audio APIs / autoplay restrictions
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const response = await fetch("/api/messages/unread", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { unreadCount?: number };
      if (requestId !== requestIdRef.current) {
        return;
      }
      setUnreadCount(typeof payload.unreadCount === "number" ? payload.unreadCount : 0);
    } catch {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === "suspended") {
          void audioContextRef.current.resume();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    const clearIfOnMessagesAndVisible = () => {
      if (pathname === "/messages" && document.visibilityState === "visible") {
        notifiedConversationIdsRef.current.clear();
      }
    };

    clearIfOnMessagesAndVisible();
    document.addEventListener("visibilitychange", clearIfOnMessagesAndVisible);
    window.addEventListener("focus", clearIfOnMessagesAndVisible);

    return () => {
      document.removeEventListener("visibilitychange", clearIfOnMessagesAndVisible);
      window.removeEventListener("focus", clearIfOnMessagesAndVisible);
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    let cleanupSocketListeners: (() => void) | null = null;

    const initialRefreshTimer = window.setTimeout(() => {
      refreshUnread().catch(() => undefined);
    }, 0);

    const pollInterval = window.setInterval(() => {
      refreshUnread().catch(() => undefined);
    }, 20000);

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

        const handleRealtimeUnreadUpdate = () => {
          refreshUnread().catch(() => undefined);
        };

        const handleMessageCreated = (payload: {
          conversationId: string;
          message: {
            senderId: string;
          };
        }) => {
          handleRealtimeUnreadUpdate();

          if (payload.message.senderId === currentUserId) {
            return;
          }

          const shouldNotify =
            document.visibilityState !== "visible" || pathname !== "/messages";

          if (!shouldNotify) {
            return;
          }

          if (notifiedConversationIdsRef.current.has(payload.conversationId)) {
            return;
          }

          notifiedConversationIdsRef.current.add(payload.conversationId);
          playNotificationSound();
        };

        const handleConversationRead = (payload: { conversationId: string; userId: string }) => {
          handleRealtimeUnreadUpdate();
          if (payload.userId === currentUserId) {
            notifiedConversationIdsRef.current.delete(payload.conversationId);
          }
        };

        socket.on("message:created", handleMessageCreated);
        socket.on("conversation:read", handleConversationRead);
        socket.on("conversation:upsert", handleRealtimeUnreadUpdate);

        cleanupSocketListeners = () => {
          socket.off("message:created", handleMessageCreated);
          socket.off("conversation:read", handleConversationRead);
          socket.off("conversation:upsert", handleRealtimeUnreadUpdate);
        };
      } catch {
        // keep polling fallback
      }
    })();

    return () => {
      isMounted = false;
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(pollInterval);
      if (cleanupSocketListeners) {
        cleanupSocketListeners();
      }
    };
  }, [currentUserId, pathname, playNotificationSound, refreshUnread]);

  const handleClick = useCallback(() => {
    if (pathname === "/messages") {
      window.dispatchEvent(new CustomEvent("messages:open-list"));
      refreshUnread().catch(() => undefined);
    }
  }, [pathname, refreshUnread]);

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${className} relative`}
      aria-label={ariaLabel}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M4 6.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
      </svg>

      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
