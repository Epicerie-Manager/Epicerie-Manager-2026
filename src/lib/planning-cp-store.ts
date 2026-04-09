"use client";

import { hasBrowserWindow } from "@/lib/browser-cache";
import { createClient } from "@/lib/supabase";

export type PlanningCpManualAbsenceType = "CP" | "CONGE_SANS_SOLDE";

export type PlanningCpManualAbsence = {
  id?: string;
  exportId?: string;
  employeeName: string;
  absenceType: PlanningCpManualAbsenceType;
  startDate: string;
  endDate: string;
  createdAt?: string;
};

export type PlanningCpExportRecord = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  site: string | null;
  notes: string | null;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  manualAbsences: PlanningCpManualAbsence[];
};

const UPDATED_EVENT = "epicerie-manager:planning-cp-updated";

let planningCpSnapshot: PlanningCpExportRecord[] = [];
let planningCpSerialized = JSON.stringify(planningCpSnapshot);

function canUseBrowserWindow() {
  return hasBrowserWindow();
}

function cloneManualAbsence(item: PlanningCpManualAbsence): PlanningCpManualAbsence {
  return { ...item };
}

function cloneExportRecord(item: PlanningCpExportRecord): PlanningCpExportRecord {
  return {
    ...item,
    manualAbsences: item.manualAbsences.map(cloneManualAbsence),
  };
}

function cloneExportRecords(items: PlanningCpExportRecord[]) {
  return items.map(cloneExportRecord);
}

function replacePlanningCpSnapshot(items: PlanningCpExportRecord[]) {
  const next = cloneExportRecords(items);
  const serialized = JSON.stringify(next);
  if (serialized === planningCpSerialized) return false;
  planningCpSnapshot = next;
  planningCpSerialized = serialized;
  return true;
}

function emitPlanningCpUpdated() {
  if (!canUseBrowserWindow()) return;
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

export function getPlanningCpUpdatedEventName() {
  return UPDATED_EVENT;
}

export function loadPlanningCpExports() {
  return cloneExportRecords(planningCpSnapshot);
}

function normalizeActionError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "Erreur Supabase.";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("42501")
  ) {
    return "Action reservee aux managers.";
  }
  if (normalized.includes("jwt") || normalized.includes("not authenticated")) {
    return "Connexion requise.";
  }
  return message || "Erreur Supabase.";
}

function mapManualAbsenceRow(row: Record<string, unknown>): PlanningCpManualAbsence | null {
  const exportId = String(row.export_id ?? "").trim();
  const employeeName = String(row.employee_name ?? "").trim().toUpperCase();
  const startDate = String(row.start_date ?? "").trim();
  const endDate = String(row.end_date ?? "").trim();
  const absenceType = String(row.absence_type ?? "").trim().toUpperCase();
  if (!employeeName || !startDate || !endDate) return null;
  if (absenceType !== "CP" && absenceType !== "CONGE_SANS_SOLDE") return null;

  return {
    id: String(row.id ?? "").trim() || undefined,
    exportId: exportId || undefined,
    employeeName,
    absenceType,
    startDate,
    endDate,
    createdAt: String(row.created_at ?? "").trim() || undefined,
  };
}

function mapExportRow(
  row: Record<string, unknown>,
  manualAbsences: PlanningCpManualAbsence[],
): PlanningCpExportRecord | null {
  const id = String(row.id ?? "").trim();
  const title = String(row.title ?? "").trim();
  const startDate = String(row.start_date ?? "").trim();
  const endDate = String(row.end_date ?? "").trim();
  const createdAt = String(row.created_at ?? "").trim();
  const updatedAt = String(row.updated_at ?? "").trim();
  if (!id || !title || !startDate || !endDate) return null;

  return {
    id,
    title,
    startDate,
    endDate,
    site: row.site == null ? null : String(row.site),
    notes: row.notes == null ? null : String(row.notes),
    isArchived: Boolean(row.is_archived),
    createdBy: row.created_by == null ? null : String(row.created_by),
    createdAt: createdAt || updatedAt || new Date().toISOString(),
    updatedAt: updatedAt || createdAt || new Date().toISOString(),
    manualAbsences,
  };
}

export async function syncPlanningCpExportsFromSupabase() {
  if (!canUseBrowserWindow()) return false;

  try {
    const supabase = createClient();
    const { data: exportRows, error: exportError } = await supabase
      .from("planning_cp_exports")
      .select("id,title,start_date,end_date,site,notes,is_archived,created_by,created_at,updated_at")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (exportError) throw exportError;

    const exportIds = (exportRows ?? [])
      .map((row) => String((row as Record<string, unknown>).id ?? "").trim())
      .filter(Boolean);

    let manualRows: Record<string, unknown>[] = [];
    if (exportIds.length) {
      const { data, error } = await supabase
        .from("planning_cp_manual_absences")
        .select("id,export_id,employee_name,absence_type,start_date,end_date,created_at")
        .in("export_id", exportIds)
        .order("start_date", { ascending: true });
      if (error) throw error;
      manualRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    }

    const manualByExportId = new Map<string, PlanningCpManualAbsence[]>();
    manualRows.forEach((row) => {
      const mapped = mapManualAbsenceRow(row);
      if (!mapped || !mapped.exportId) return;
      const current = manualByExportId.get(mapped.exportId) ?? [];
      current.push(mapped);
      manualByExportId.set(mapped.exportId, current);
    });

    const mappedExports = (exportRows ?? [])
      .map((row) =>
        mapExportRow(
          row as Record<string, unknown>,
          manualByExportId.get(String((row as Record<string, unknown>).id ?? "").trim()) ?? [],
        ),
      )
      .filter((item): item is PlanningCpExportRecord => item !== null);

    if (replacePlanningCpSnapshot(mappedExports)) emitPlanningCpUpdated();
    return true;
  } catch {
    return false;
  }
}

export async function savePlanningCpExportToSupabase(input: {
  id?: string | null;
  title: string;
  startDate: string;
  endDate: string;
  site?: string | null;
  notes?: string | null;
  manualAbsences: PlanningCpManualAbsence[];
}) {
  try {
    const supabase = createClient();
    const payload = {
      title: input.title.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      site: input.site?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    let exportId = input.id?.trim() || "";

    if (exportId) {
      const { data, error } = await supabase
        .from("planning_cp_exports")
        .update(payload)
        .eq("id", exportId)
        .select("id")
        .single();
      if (error) throw error;
      exportId = String((data as Record<string, unknown> | null)?.id ?? exportId);
    } else {
      const { data, error } = await supabase
        .from("planning_cp_exports")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      exportId = String((data as Record<string, unknown> | null)?.id ?? "").trim();
      if (!exportId) throw new Error("Impossible de créer le planning CP.");
    }

    const { error: deleteError } = await supabase
      .from("planning_cp_manual_absences")
      .delete()
      .eq("export_id", exportId);
    if (deleteError) throw deleteError;

    const manualPayload = input.manualAbsences
      .filter((item) => item.employeeName && item.startDate && item.endDate)
      .map((item) => ({
        export_id: exportId,
        employee_name: item.employeeName.trim().toUpperCase(),
        absence_type: item.absenceType,
        start_date: item.startDate,
        end_date: item.endDate,
      }));

    if (manualPayload.length) {
      const { error: insertError } = await supabase
        .from("planning_cp_manual_absences")
        .insert(manualPayload);
      if (insertError) throw insertError;
    }

    await syncPlanningCpExportsFromSupabase();
    const saved = loadPlanningCpExports().find((item) => item.id === exportId);
    if (!saved) throw new Error("Impossible de recharger le planning CP enregistré.");
    return saved;
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}
