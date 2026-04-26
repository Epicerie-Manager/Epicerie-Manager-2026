import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

type SessionLogPayload = {
  action?: "start" | "heartbeat" | "end";
  appType?: "bureau" | "collab" | "terrain";
  moduleName?: string;
  sessionId?: string | null;
};

function createRouteSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll() {
        // Route API côté serveur uniquement.
      },
    },
  });
}

function sanitizeModuleName(value: unknown) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "Dashboard";
  return cleaned.slice(0, 80);
}

function isSupportedAppType(value: unknown): value is "bureau" | "collab" | "terrain" {
  return value === "bureau" || value === "collab" || value === "terrain";
}

function computeDurationMinutes(startedAt: string, endedAt: Date) {
  const started = new Date(startedAt);
  const deltaMs = endedAt.getTime() - started.getTime();
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.max(0, Math.round(deltaMs / 60000));
}

async function loadActor(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Connexion requise.");
  }

  return user;
}

async function loadExistingSession(sessionId: string, userId: string) {
  const supabaseAdmin = createAdminClient();
  const result = await supabaseAdmin
    .from("session_logs")
    .select("id,user_id,session_start")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

async function createSession(userId: string, appType: "bureau" | "collab" | "terrain", moduleName: string) {
  const nowIso = new Date().toISOString();
  const supabaseAdmin = createAdminClient();
  const result = await supabaseAdmin
    .from("session_logs")
    .insert({
      user_id: userId,
      app_type: appType,
      module_name: moduleName,
      session_start: nowIso,
      duration_minutes: 0,
      session_end: null,
    })
    .select("id")
    .single();

  if (result.error) throw result.error;
  return result.data.id as string;
}

async function refreshSession(sessionId: string, moduleName: string, ended: boolean) {
  const supabaseAdmin = createAdminClient();
  const current = await supabaseAdmin
    .from("session_logs")
    .select("id,session_start")
    .eq("id", sessionId)
    .single();

  if (current.error) throw current.error;

  const now = new Date();
  const updateResult = await supabaseAdmin
    .from("session_logs")
    .update({
      module_name: moduleName,
      duration_minutes: computeDurationMinutes(String(current.data.session_start), now),
      session_end: ended ? now.toISOString() : null,
    })
    .eq("id", sessionId);

  if (updateResult.error) throw updateResult.error;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SessionLogPayload;
    const action = payload.action;
    const appType = payload.appType;
    const moduleName = sanitizeModuleName(payload.moduleName);
    const sessionId = typeof payload.sessionId === "string" && payload.sessionId.trim()
      ? payload.sessionId.trim()
      : null;

    if (action !== "start" && action !== "heartbeat" && action !== "end") {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    if (!isSupportedAppType(appType)) {
      return NextResponse.json({ error: "Application invalide." }, { status: 400 });
    }

    const user = await loadActor(request);

    if (action === "end") {
      if (!sessionId) {
        return NextResponse.json({ ok: true, sessionId: null });
      }

      const existing = await loadExistingSession(sessionId, user.id);
      if (!existing) {
        return NextResponse.json({ ok: true, sessionId: null });
      }

      await refreshSession(sessionId, moduleName, true);
      return NextResponse.json({ ok: true, sessionId: null });
    }

    if (sessionId) {
      const existing = await loadExistingSession(sessionId, user.id);
      if (existing) {
        await refreshSession(sessionId, moduleName, false);
        return NextResponse.json({ ok: true, sessionId });
      }
    }

    const createdSessionId = await createSession(user.id, appType, moduleName);
    return NextResponse.json({ ok: true, sessionId: createdSessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
