import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminUser } from "@/lib/admin-access";
import {
  loadActivityToday,
  loadAdminStats,
  loadModuleHealth,
  loadRecentSessions,
  loadRupturesCalendar,
} from "@/lib/admin-monitoring-queries";
import { createAdminClient } from "@/lib/supabase-admin";

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
        // Route lecture seule.
      },
    },
  });
}

async function assertAdmin(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Connexion requise.");
  }

  const profileQuery = await supabase
    .from("profiles")
    .select("email,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileQuery.error) {
    throw profileQuery.error;
  }

  const email = String(profileQuery.data?.email ?? user.email ?? "").trim().toLowerCase();
  const role = String(profileQuery.data?.role ?? "").trim();

  if (!isAdminUser(email, role)) {
    throw new Error("Accès réservé à l'administrateur.");
  }
}

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);

    const supabaseAdmin = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = todayStart.toISOString();
    const fourteenDaysAgo = new Date(todayStart);
    fourteenDaysAgo.setDate(todayStart.getDate() - 14);

    const [stats, moduleHealthRows, recentSessionRows, importRows, activityRows] = await Promise.all([
      loadAdminStats(supabaseAdmin, todayIso),
      loadModuleHealth(supabaseAdmin),
      loadRecentSessions(supabaseAdmin),
      loadRupturesCalendar(supabaseAdmin, fourteenDaysAgo.toISOString()),
      loadActivityToday(supabaseAdmin, todayIso),
    ]);

    return NextResponse.json({
      stats,
      moduleHealthRows,
      recentSessionRows,
      importRows,
      activityRows,
      refreshedAt: new Date().toISOString(),
      rupturesAlert: "ERR · employee_id = NULL dans ruptures_synthese depuis le 20/04 · ruptures_detail vide depuis le 22/04",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger le monitoring admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
