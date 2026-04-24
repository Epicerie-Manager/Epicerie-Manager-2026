"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MassElement, MassPlan, RayonLibItem } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { encodeTextModule, parseTextModule } from "@/lib/mass-plan-text";

const STORE_KEY = "villebon-2";
const FACING_BUCKET = "rayon-facings";

type ProfileRow = { id: string; full_name: string | null };

async function loadProfileNames(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabase.from("profiles").select("id,full_name").in("id", ids);
  if (error) throw error;
  return new Map<string, string>(((data ?? []) as ProfileRow[]).map((row) => [String(row.id), String(row.full_name ?? "").trim()]));
}

export async function loadMassPlans(supabase: SupabaseClient): Promise<MassPlan[]> {
  const { data, error } = await supabase
    .from("mass_plans")
    .select("id,store_key,name,canvas_w,canvas_h,position,updated_at,updated_by")
    .eq("store_key", STORE_KEY)
    .order("position", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    id: String(row.id),
    store_key: String(row.store_key ?? STORE_KEY),
    name: String(row.name ?? ""),
    canvas_w: Number(row.canvas_w ?? 1200),
    canvas_h: Number(row.canvas_h ?? 700),
    position: Number(row.position ?? 0),
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by ? String(row.updated_by) : null,
  })) satisfies MassPlan[];

  const profileIds = Array.from(new Set(rows.map((row) => row.updated_by).filter(Boolean) as string[]));
  const profileNames = await loadProfileNames(supabase, profileIds);

  return rows.map((row) => ({
    ...row,
    updater_name: row.updated_by ? profileNames.get(row.updated_by) ?? null : null,
  }));
}

export async function loadMassPlanElements(supabase: SupabaseClient, planId: string): Promise<MassElement[]> {
  const { data: elementRows, error } = await supabase
    .from("mass_plan_elements")
    .select("id,plan_id,rayon_plan_id,element_type,label,x,y,w,h,color,rotated,z_index")
    .eq("plan_id", planId)
    .order("z_index", { ascending: true });
  if (error) throw error;

  const rayonIds = Array.from(
    new Set(
      (elementRows ?? [])
        .map((row) => (row.rayon_plan_id ? String(row.rayon_plan_id) : null))
        .filter(Boolean) as string[],
    ),
  );

  let rayonMap = new Map<string, { name: string; color: string | null; elem_count: number; facing_image_url: string | null }>();
  if (rayonIds.length) {
    const { data: rayonRows, error: rayonError } = await supabase
      .from("rayon_plans")
      .select("id,name,color,elem_count,facing_image_url")
      .in("id", rayonIds);
    if (rayonError) throw rayonError;
    rayonMap = new Map(
      (rayonRows ?? []).map((row) => [
        String(row.id),
        {
          name: String(row.name ?? ""),
          color: row.color ? String(row.color) : null,
          elem_count: Number(row.elem_count ?? 0),
          facing_image_url: row.facing_image_url ? String(row.facing_image_url) : null,
        },
      ]),
    );
  }

  return (elementRows ?? []).map((row) => {
    const rayon = row.rayon_plan_id ? rayonMap.get(String(row.rayon_plan_id)) : null;
    const isText = row.element_type === "text";
    const textModule = isText ? parseTextModule(row.label ? String(row.label) : null, row.color ? String(row.color) : null) : null;
    return {
      id: String(row.id),
      plan_id: String(row.plan_id),
      rayon_plan_id: row.rayon_plan_id ? String(row.rayon_plan_id) : null,
      element_type: row.element_type as MassElement["element_type"],
      label: isText ? textModule?.content ?? "Texte" : row.label ? String(row.label) : rayon?.name ?? null,
      x: Number(row.x ?? 0),
      y: Number(row.y ?? 0),
      w: Number(row.w ?? 120),
      h: Number(row.h ?? 80),
      color: isText
        ? (textModule?.style.textColor ?? (row.color ? String(row.color) : null))
        : row.color ? String(row.color) : rayon?.color ?? null,
      rotated: Boolean(row.rotated),
      z_index: Number(row.z_index ?? 1),
      rayon_name: rayon?.name,
      rayon_color: rayon?.color ?? undefined,
      rayon_elem_count: rayon?.elem_count,
      rayon_facing_url: rayon?.facing_image_url ?? null,
      text_style: textModule?.style ?? null,
    } satisfies MassElement;
  });
}

export async function saveMassPlanElements(
  supabase: SupabaseClient,
  planId: string,
  elements: MassElement[],
  canvas: { width: number; height: number },
  userId: string,
): Promise<void> {
  const { error: deleteError } = await supabase.from("mass_plan_elements").delete().eq("plan_id", planId);
  if (deleteError) throw deleteError;

  if (elements.length) {
    const payload = elements.map((element, index) => ({
      plan_id: planId,
      rayon_plan_id: element.rayon_plan_id,
      element_type: element.element_type,
      label: element.element_type === "text" ? encodeTextModule(element.label, element.text_style) : element.label,
      x: Math.round(element.x),
      y: Math.round(element.y),
      w: Math.round(element.w),
      h: Math.round(element.h),
      color: element.element_type === "text" ? element.text_style?.textColor ?? element.color : element.color,
      rotated: element.rotated,
      z_index: index + 1,
    }));
    const { error: insertError } = await supabase.from("mass_plan_elements").insert(payload);
    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from("mass_plans")
    .update({
      canvas_w: Math.round(canvas.width),
      canvas_h: Math.round(canvas.height),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", planId)
    .select("id,canvas_w,canvas_h")
    .single();
  if (updateError) throw updateError;
}

export async function updateMassPlanDimensions(
  supabase: SupabaseClient,
  planId: string,
  canvasW: number,
  canvasH: number,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("mass_plans")
    .update({
      canvas_w: Math.round(canvasW),
      canvas_h: Math.round(canvasH),
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("[mass-plan] updateMassPlanDimensions error:", error);
  }
}

export async function createMassPlan(
  supabase: SupabaseClient,
  name: string,
  canvasW: number,
  canvasH: number,
  userId: string,
  position: number,
): Promise<MassPlan> {
  const { data, error } = await supabase
    .from("mass_plans")
    .insert({
      store_key: STORE_KEY,
      name,
      canvas_w: canvasW,
      canvas_h: canvasH,
      position,
      created_by: userId,
      updated_by: userId,
    })
    .select("id,store_key,name,canvas_w,canvas_h,position,updated_at,updated_by")
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    store_key: String(data.store_key ?? STORE_KEY),
    name: String(data.name ?? ""),
    canvas_w: Number(data.canvas_w ?? canvasW),
    canvas_h: Number(data.canvas_h ?? canvasH),
    position: Number(data.position ?? position),
    updated_at: String(data.updated_at ?? ""),
    updated_by: data.updated_by ? String(data.updated_by) : null,
    updater_name: null,
  };
}

export async function deleteMassPlan(supabase: SupabaseClient, planId: string): Promise<void> {
  const { error } = await supabase.from("mass_plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function loadRayonLibrary(supabase: SupabaseClient): Promise<RayonLibItem[]> {
  const { data: universes, error: universeError } = await supabase
    .from("rayon_universes")
    .select("id,name,icon,color,position")
    .eq("store_key", STORE_KEY)
    .order("position", { ascending: true });
  if (universeError) throw universeError;

  const universeMap = new Map(
    (universes ?? []).map((row) => [
      String(row.id),
      {
        name: String(row.name ?? ""),
        icon: String(row.icon ?? "🧩"),
        color: String(row.color ?? "#0a4f98"),
      },
    ]),
  );

  const { data: rayons, error: rayonError } = await supabase
    .from("rayon_plans")
    .select("id,universe_id,name,color,elem_count,facing_image_url,position")
    .order("position", { ascending: true });
  if (rayonError) throw rayonError;

  return (rayons ?? [])
    .filter((row) => row.universe_id && universeMap.has(String(row.universe_id)))
    .map((row) => {
      const universe = universeMap.get(String(row.universe_id))!;
      return {
        id: String(row.id),
        universe_id: String(row.universe_id),
        universe_name: universe.name,
        universe_icon: universe.icon,
        universe_color: universe.color,
        name: String(row.name ?? ""),
        color: String(row.color ?? universe.color),
        elem_count: Number(row.elem_count ?? 0),
        facing_image_url: row.facing_image_url ? String(row.facing_image_url) : null,
      } satisfies RayonLibItem;
    });
}

export async function createFacingSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage.from(FACING_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
