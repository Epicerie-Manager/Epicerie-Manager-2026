import { createClient } from "@/lib/supabase";
import { assertOfficeModuleWriteAccess } from "@/lib/office-module-access";
import {
  defaultPresenceThresholds,
  normalizePresenceThresholds,
  type PresenceThresholds,
} from "@/lib/presence-thresholds";

const PRESENCE_THRESHOLDS_UPDATED_EVENT = "epicerie-manager:presence-thresholds-updated";
const PRESENCE_THRESHOLDS_ROW_ID = "global";

let presenceThresholdsSnapshot: PresenceThresholds = { ...defaultPresenceThresholds };

function canUseBrowserWindow() {
  return typeof window !== "undefined";
}

function clonePresenceThresholds(thresholds: PresenceThresholds) {
  return {
    warningMorning: thresholds.warningMorning,
    criticalMorning: thresholds.criticalMorning,
    warningAfternoon: thresholds.warningAfternoon,
    criticalAfternoon: thresholds.criticalAfternoon,
  };
}

function replacePresenceThresholdsSnapshot(thresholds: PresenceThresholds) {
  presenceThresholdsSnapshot = clonePresenceThresholds(normalizePresenceThresholds(thresholds));
}

function emitPresenceThresholdsUpdated() {
  if (!canUseBrowserWindow()) return;
  window.dispatchEvent(new Event(PRESENCE_THRESHOLDS_UPDATED_EVENT));
}

function mapRowToPresenceThresholds(row: Record<string, unknown> | null | undefined): PresenceThresholds {
  return normalizePresenceThresholds({
    warningMorning: Number(row?.warning_morning ?? defaultPresenceThresholds.warningMorning),
    criticalMorning: Number(row?.critical_morning ?? defaultPresenceThresholds.criticalMorning),
    warningAfternoon: Number(row?.warning_afternoon ?? defaultPresenceThresholds.warningAfternoon),
    criticalAfternoon: Number(row?.critical_afternoon ?? defaultPresenceThresholds.criticalAfternoon),
  });
}

function normalizeActionError(error: unknown) {
  const rawMessage = String(
    (error as { message?: string; error_description?: string })?.message ??
    (error as { error_description?: string })?.error_description ??
    error ??
    "",
  );
  const message = rawMessage.toLowerCase();

  if (
    (message.includes("presence_thresholds") && message.includes("does not exist")) ||
    message.includes("could not find the table") ||
    message.includes("relation \"public.presence_thresholds\" does not exist")
  ) {
    return new Error("La table Supabase des seuils de présence est absente. Appliquez `supabase/patch_presence_thresholds.sql`.");
  }
  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("new row violates") ||
    message.includes("not allowed") ||
    message.includes("forbidden")
  ) {
    return new Error("Action réservée aux managers.");
  }
  if (message.includes("jwt") || message.includes("auth session missing") || message.includes("not authenticated")) {
    return new Error("Veuillez vous reconnecter.");
  }
  return new Error(rawMessage || "Erreur Supabase inconnue.");
}

export function loadPresenceThresholds() {
  return clonePresenceThresholds(presenceThresholdsSnapshot);
}

export function getPresenceThresholdsUpdatedEventName() {
  return PRESENCE_THRESHOLDS_UPDATED_EVENT;
}

export async function syncPresenceThresholdsFromSupabase() {
  if (!canUseBrowserWindow()) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("presence_thresholds")
      .select("*")
      .eq("id", PRESENCE_THRESHOLDS_ROW_ID)
      .maybeSingle();

    if (error) throw error;

    replacePresenceThresholdsSnapshot(
      data
        ? mapRowToPresenceThresholds(data as Record<string, unknown>)
        : defaultPresenceThresholds,
    );
    emitPresenceThresholdsUpdated();
    return Boolean(data);
  } catch {
    replacePresenceThresholdsSnapshot(defaultPresenceThresholds);
    emitPresenceThresholdsUpdated();
    return false;
  }
}

export async function savePresenceThresholdsToSupabase(input: PresenceThresholds) {
  const normalized = normalizePresenceThresholds(input);

  try {
    await assertOfficeModuleWriteAccess("planning", "Action reservee aux profils pouvant modifier les seuils de presence.");
    const supabase = createClient();
    const { error } = await supabase
      .from("presence_thresholds")
      .upsert(
        {
          id: PRESENCE_THRESHOLDS_ROW_ID,
          warning_morning: normalized.warningMorning,
          critical_morning: normalized.criticalMorning,
          warning_afternoon: normalized.warningAfternoon,
          critical_afternoon: normalized.criticalAfternoon,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (error) throw error;

    replacePresenceThresholdsSnapshot(normalized);
    emitPresenceThresholdsUpdated();
    return loadPresenceThresholds();
  } catch (error) {
    throw normalizeActionError(error);
  }
}
