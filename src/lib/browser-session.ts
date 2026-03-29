const BROWSER_SESSION_KEY = "epicerie-manager-browser-session";
const LAST_ACTIVITY_KEY = "epicerie-manager-last-activity";
const SESSION_CHANNEL_NAME = "epicerie-manager-session";

export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
export const INACTIVITY_CHECK_INTERVAL_MS = 15 * 1000;
const SESSION_RESTORE_TIMEOUT_MS = 350;

type SessionMessage =
  | { type: "session-check" }
  | { type: "session-active" }
  | { type: "force-signout" };

function canUseBrowserApis() {
  return typeof window !== "undefined";
}

export function hasBrowserSessionMarker() {
  if (!canUseBrowserApis()) return false;
  return window.sessionStorage.getItem(BROWSER_SESSION_KEY) === "1";
}

export function markBrowserSessionActive() {
  if (!canUseBrowserApis()) return;
  window.sessionStorage.setItem(BROWSER_SESSION_KEY, "1");
}

export function clearBrowserSessionState() {
  if (!canUseBrowserApis()) return;
  window.sessionStorage.removeItem(BROWSER_SESSION_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function recordBrowserActivity() {
  if (!canUseBrowserApis()) return;
  markBrowserSessionActive();
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastBrowserActivityAt() {
  if (!canUseBrowserApis()) return 0;
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createBrowserSessionChannel() {
  if (!canUseBrowserApis() || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(SESSION_CHANNEL_NAME);
}

export async function restoreBrowserSessionMarker(timeoutMs = SESSION_RESTORE_TIMEOUT_MS) {
  if (!canUseBrowserApis()) return false;
  if (hasBrowserSessionMarker()) return true;

  const channel = createBrowserSessionChannel();
  if (!channel) return false;

  try {
    const restored = await new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const handleMessage = (event: MessageEvent<SessionMessage>) => {
        if (event.data?.type !== "session-active") return;
        cleanup();
        markBrowserSessionActive();
        recordBrowserActivity();
        resolve(true);
      };

      const cleanup = () => {
        window.clearTimeout(timer);
        channel.removeEventListener("message", handleMessage as EventListener);
      };

      channel.addEventListener("message", handleMessage as EventListener);
      channel.postMessage({ type: "session-check" } satisfies SessionMessage);
    });

    return restored;
  } finally {
    channel.close();
  }
}

export function broadcastForceSignOut(channel?: BroadcastChannel | null) {
  channel?.postMessage({ type: "force-signout" } satisfies SessionMessage);
}

export function attachBrowserSessionResponder(channel: BroadcastChannel, onForceSignOut: () => void) {
  const handleMessage = (event: MessageEvent<SessionMessage>) => {
    if (event.data?.type === "session-check" && hasBrowserSessionMarker()) {
      channel.postMessage({ type: "session-active" } satisfies SessionMessage);
      return;
    }
    if (event.data?.type === "force-signout") {
      onForceSignOut();
    }
  };

  channel.addEventListener("message", handleMessage as EventListener);

  return () => {
    channel.removeEventListener("message", handleMessage as EventListener);
  };
}
