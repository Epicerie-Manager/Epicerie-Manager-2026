"use client";

type SessionLogAction = "start" | "heartbeat" | "end";
export type SessionLogAppType = "bureau" | "collab" | "terrain";

type SessionLogPayload = {
  action: SessionLogAction;
  appType: SessionLogAppType;
  moduleName: string;
  sessionId?: string | null;
};

const STORAGE_PREFIX = "epicerie-manager-session-log";

function canUseBrowserApis() {
  return typeof window !== "undefined";
}

function getStorageKey(appType: SessionLogAppType) {
  return `${STORAGE_PREFIX}:${appType}`;
}

function readStoredSessionId(appType: SessionLogAppType) {
  if (!canUseBrowserApis()) return null;
  return window.sessionStorage.getItem(getStorageKey(appType));
}

function writeStoredSessionId(appType: SessionLogAppType, value: string | null) {
  if (!canUseBrowserApis()) return;
  const key = getStorageKey(appType);
  if (value) {
    window.sessionStorage.setItem(key, value);
    return;
  }
  window.sessionStorage.removeItem(key);
}

async function postSessionLog(payload: SessionLogPayload, keepalive = false) {
  const response = await fetch("/api/session-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    keepalive,
  });

  if (!response.ok) {
    throw new Error("Impossible de synchroniser la session.");
  }

  return (await response.json()) as { sessionId?: string | null };
}

export async function ensureSessionLog(appType: SessionLogAppType, moduleName: string) {
  const sessionId = readStoredSessionId(appType);
  const data = await postSessionLog({
    action: "start",
    appType,
    moduleName,
    sessionId,
  });

  const resolvedSessionId = data.sessionId ?? sessionId ?? null;
  writeStoredSessionId(appType, resolvedSessionId);
  return resolvedSessionId;
}

export async function heartbeatSessionLog(appType: SessionLogAppType, moduleName: string) {
  const sessionId = readStoredSessionId(appType);
  const data = await postSessionLog({
    action: "heartbeat",
    appType,
    moduleName,
    sessionId,
  });

  const resolvedSessionId = data.sessionId ?? sessionId ?? null;
  writeStoredSessionId(appType, resolvedSessionId);
  return resolvedSessionId;
}

export async function endSessionLog(appType: SessionLogAppType, moduleName: string, keepalive = false) {
  const sessionId = readStoredSessionId(appType);
  if (!sessionId) return;

  try {
    await postSessionLog(
      {
        action: "end",
        appType,
        moduleName,
        sessionId,
      },
      keepalive,
    );
  } finally {
    writeStoredSessionId(appType, null);
  }
}

export function clearStoredSessionLog(appType: SessionLogAppType) {
  writeStoredSessionId(appType, null);
}
