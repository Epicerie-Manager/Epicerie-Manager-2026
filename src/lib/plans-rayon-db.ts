"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RayonPlanItem = {
  id: string;
  universe_id: string;
  name: string;
  color: string;
  elem_count: number;
  facing_image_url: string | null;
  position: number;
  updated_at: string;
  updated_by: string | null;
  updater_name?: string | null;
};

export type RayonUniverse = {
  id: string;
  store_key: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  updated_at: string;
  updated_by: string | null;
  updater_name?: string | null;
  rayons: RayonPlanItem[];
};

export const PLANS_RAYON_STORE_KEY = "villebon-2";

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

function compareByPosition<T extends { position: number }>(left: T, right: T) {
  return (left.position ?? 0) - (right.position ?? 0);
}

async function loadProfileNames(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name")
    .in("id", ids);

  if (error) throw error;

  return new Map<string, string>(
    ((data ?? []) as ProfileNameRow[]).map((profile) => [String(profile.id), String(profile.full_name ?? "").trim()]),
  );
}

export async function loadUniverses(supabase: SupabaseClient): Promise<RayonUniverse[]> {
  const { data: universeRows, error: universeError } = await supabase
    .from("rayon_universes")
    .select("id,store_key,name,icon,color,position,updated_at,updated_by")
    .eq("store_key", PLANS_RAYON_STORE_KEY)
    .order("position", { ascending: true });

  if (universeError) throw universeError;

  const universes = (universeRows ?? []).map((row) => ({
    id: String(row.id),
    store_key: String(row.store_key ?? PLANS_RAYON_STORE_KEY),
    name: String(row.name ?? "").trim(),
    icon: String(row.icon ?? "🛒"),
    color: String(row.color ?? "#0a4f98"),
    position: Number(row.position ?? 0),
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by ? String(row.updated_by) : null,
    rayons: [],
  })) satisfies RayonUniverse[];

  if (!universes.length) return [];

  const universeIds = universes.map((universe) => universe.id);
  const { data: rayonRows, error: rayonError } = await supabase
    .from("rayon_plans")
    .select("id,universe_id,name,color,elem_count,facing_image_url,position,updated_at,updated_by")
    .in("universe_id", universeIds)
    .order("position", { ascending: true });

  if (rayonError) throw rayonError;

  const rayons = (rayonRows ?? []).map((row) => ({
    id: String(row.id),
    universe_id: String(row.universe_id),
    name: String(row.name ?? "").trim(),
    color: String(row.color ?? "#0a4f98"),
    elem_count: Number(row.elem_count ?? 0),
    facing_image_url: row.facing_image_url ? String(row.facing_image_url) : null,
    position: Number(row.position ?? 0),
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by ? String(row.updated_by) : null,
  })) satisfies RayonPlanItem[];

  const profileIds = Array.from(
    new Set(
      [
        ...universes.map((universe) => universe.updated_by).filter(Boolean),
        ...rayons.map((rayon) => rayon.updated_by).filter(Boolean),
      ] as string[],
    ),
  );
  const profileNames = await loadProfileNames(supabase, profileIds);

  const byUniverse = new Map<string, RayonPlanItem[]>();
  rayons.sort(compareByPosition).forEach((rayon) => {
    const next = byUniverse.get(rayon.universe_id) ?? [];
    next.push({
      ...rayon,
      updater_name: rayon.updated_by ? profileNames.get(rayon.updated_by) ?? null : null,
    });
    byUniverse.set(rayon.universe_id, next);
  });

  return universes.sort(compareByPosition).map((universe) => ({
    ...universe,
    updater_name: universe.updated_by ? profileNames.get(universe.updated_by) ?? null : null,
    rayons: byUniverse.get(universe.id) ?? [],
  }));
}

export async function createUniverse(
  supabase: SupabaseClient,
  payload: { name: string; icon: string; color: string; position: number; userId: string },
) {
  const { data, error } = await supabase
    .from("rayon_universes")
    .insert({
      store_key: PLANS_RAYON_STORE_KEY,
      name: payload.name,
      icon: payload.icon,
      color: payload.color,
      position: payload.position,
      created_by: payload.userId,
      updated_by: payload.userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function updateUniverseName(supabase: SupabaseClient, universeId: string, name: string, userId: string) {
  const { error } = await supabase
    .from("rayon_universes")
    .update({ name, updated_by: userId })
    .eq("id", universeId);

  if (error) throw error;
}

export async function deleteUniverse(supabase: SupabaseClient, universe: RayonUniverse) {
  const paths = universe.rayons.map((rayon) => rayon.facing_image_url).filter(Boolean) as string[];
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("rayon-facings").remove(paths);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("rayon_universes").delete().eq("id", universe.id);
  if (error) throw error;
}

export async function createRayon(
  supabase: SupabaseClient,
  payload: { universeId: string; name: string; color: string; elemCount: number; position: number; userId: string },
) {
  const { data, error } = await supabase
    .from("rayon_plans")
    .insert({
      universe_id: payload.universeId,
      name: payload.name,
      color: payload.color,
      elem_count: payload.elemCount,
      position: payload.position,
      created_by: payload.userId,
      updated_by: payload.userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function deleteRayon(supabase: SupabaseClient, rayon: RayonPlanItem) {
  if (rayon.facing_image_url) {
    const { error: storageError } = await supabase.storage.from("rayon-facings").remove([rayon.facing_image_url]);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("rayon_plans").delete().eq("id", rayon.id);
  if (error) throw error;
}

export async function saveRayonFacing(
  supabase: SupabaseClient,
  payload: { rayon: RayonPlanItem; file: File; userId: string },
) {
  const extension = payload.file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${payload.rayon.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("rayon-facings")
    .upload(filePath, payload.file, { upsert: true });
  if (uploadError) throw uploadError;

  if (payload.rayon.facing_image_url && payload.rayon.facing_image_url !== filePath) {
    const { error: removeError } = await supabase.storage.from("rayon-facings").remove([payload.rayon.facing_image_url]);
    if (removeError) throw removeError;
  }

  const { error: updateError } = await supabase
    .from("rayon_plans")
    .update({
      facing_image_url: filePath,
      updated_by: payload.userId,
    })
    .eq("id", payload.rayon.id);

  if (updateError) throw updateError;

  return filePath;
}

export async function createFacingSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage.from("rayon-facings").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
