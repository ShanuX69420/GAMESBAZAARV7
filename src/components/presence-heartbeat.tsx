"use client";

import { useEffect } from "react";

type PresenceHeartbeatProps = {
  enabled: boolean;
};

async function sendPresenceHeartbeat() {
  try {
    await fetch("/api/messages/presence", {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Ignore transient network errors.
  }
}

export function PresenceHeartbeat({ enabled }: PresenceHeartbeatProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void sendPresenceHeartbeat();

    const heartbeatInterval = window.setInterval(() => {
      void sendPresenceHeartbeat();
    }, 25000);

    const handleFocus = () => {
      void sendPresenceHeartbeat();
    };

    const handleVisibilityChange = () => {
      void sendPresenceHeartbeat();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  return null;
}
