import type { SupabaseClient } from "@supabase/supabase-js";

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

export async function countTable(
  supabase: SupabaseClient,
  table: string,
  apply?: (query: any) => any,
) {
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) query = apply(query);
  const result = (await query) as CountResult;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function loadAdminStats(supabase: SupabaseClient, todayIso: string) {
  const [
    profilesResult,
    planningCount,
    importsTodayResult,
    balisageCount,
    plansCount,
    followupsCount,
    universCount,
    rayonsCount,
  ] = await Promise.all([
    supabase.from("profiles").select("role", { count: "exact" }),
    countTable(supabase, "planning_entries"),
    supabase
      .from("ruptures_imports")
      .select("imported_at,periode")
      .gte("imported_at", todayIso)
      .order("imported_at", { ascending: false }),
    countTable(supabase, "balisage_mensuel"),
    countTable(supabase, "mass_plans"),
    countTable(supabase, "employee_followups"),
    countTable(supabase, "rayon_universes"),
    countTable(supabase, "rayon_plans"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (importsTodayResult.error) throw importsTodayResult.error;

  const profiles = (profilesResult.data ?? []) as Array<{ role: string | null }>;
  const importsToday = (importsTodayResult.data ?? []) as Array<{ imported_at: string; periode: string | null }>;

  return {
    nbCollabs: profiles.filter((row) => row.role === "collaborateur").length,
    nbCustom: profiles.filter((row) => row.role === "custom_access").length,
    nbPlanning: planningCount,
    nbImportsToday: importsToday.length,
    nbBalisage: balisageCount,
    nbPlansMasse: plansCount,
    nbSuivis: followupsCount,
    nbUnivers: universCount,
    nbRayons: rayonsCount,
    dernierImport: importsToday[0]?.imported_at ?? null,
  };
}

export async function loadRecentSessions(supabase: SupabaseClient, limit = 200) {
  const result = await supabase
    .from("recent_sessions")
    .select("*")
    .order("session_start", { ascending: false })
    .limit(limit);
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadRupturesCalendar(supabase: SupabaseClient, sinceIso: string) {
  const result = await supabase
    .from("ruptures_imports")
    .select("imported_at,periode")
    .gte("imported_at", sinceIso)
    .order("imported_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadActivityToday(supabase: SupabaseClient, todayIso: string) {
  const result = await supabase
    .from("session_logs")
    .select("id,app_type,duration_minutes,module_name,session_start")
    .gte("session_start", todayIso);
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadModuleHealth(supabase: SupabaseClient) {
  const result = await supabase.from("module_health_summary").select("*");
  if (result.error) return [];
  return result.data ?? [];
}
