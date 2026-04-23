import { hasBrowserWindow } from "@/lib/browser-cache";
import { assertOfficeModuleWriteAccess } from "@/lib/office-module-access";
import { createClient } from "@/lib/supabase";
import { plateauTimelineOperations } from "@/lib/plateau-data";

const PLATEAU_UPDATED_EVENT = "epicerie-manager:plateau-assets-updated";
const PLATEAU_STORAGE_BUCKET = "plateau-plans";

export type PlateauAssetKey = "A" | "B" | "C" | "WEEK";

export type PlateauAsset = {
  id: string;
  weekNumber: number;
  plateauKey: PlateauAssetKey;
  filePath: string;
  publicUrl: string;
  sourcePdfName: string;
  sourceType: "pdf" | "excel";
  pageNumber: number | null;
  implantationDate: string | null;
  desimplantationDate: string | null;
  uploadedBy: string | null;
  importedAt: string;
  updatedAt: string;
};

export type PlateauAssetUpload = {
  weekNumber: number;
  plateauKey: PlateauAssetKey;
  file: Blob;
  contentType?: string;
  pageNumber?: number | null;
  sourcePdfName?: string;
  implantationDate?: string | null;
  desimplantationDate?: string | null;
};

export type PlateauExcelSource = {
  id: string;
  weekNumber: number;
  implantationDate: string;
  desimplantationDate: string;
  filePath: string;
  publicUrl: string;
  sourceName: string;
  importedAt: string;
  updatedAt: string;
};

export type PlateauExcelUpload = {
  weekNumber: number;
  implantationDate: string;
  desimplantationDate: string;
  file: Blob;
  sourceName: string;
};

type DbRow = Record<string, unknown>;

let plateauAssetsSnapshot: PlateauAsset[] = [];
let plateauAssetsSerialized = "[]";
let plateauExcelSourcesSnapshot: PlateauExcelSource[] = [];
let plateauExcelSourcesSerialized = "[]";
let plateauNotesSnapshot: Record<string, string> = {};
let plateauNotesSerialized = JSON.stringify(plateauNotesSnapshot);

function canUseStorage() {
  return hasBrowserWindow();
}

function emitUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLATEAU_UPDATED_EVENT));
}

function cloneAssets(assets: PlateauAsset[]) {
  return assets.map((asset) => ({ ...asset }));
}

function cloneExcelSources(sources: PlateauExcelSource[]) {
  return sources.map((source) => ({ ...source }));
}

function replacePlateauAssetsSnapshot(assets: PlateauAsset[]) {
  const nextAssets = cloneAssets(assets);
  const serialized = JSON.stringify(nextAssets);
  if (serialized === plateauAssetsSerialized) return false;
  plateauAssetsSnapshot = nextAssets;
  plateauAssetsSerialized = serialized;
  return true;
}

function replacePlateauExcelSourcesSnapshot(sources: PlateauExcelSource[]) {
  const nextSources = cloneExcelSources(sources);
  const serialized = JSON.stringify(nextSources);
  if (serialized === plateauExcelSourcesSerialized) return false;
  plateauExcelSourcesSnapshot = nextSources;
  plateauExcelSourcesSerialized = serialized;
  return true;
}

function clonePlateauNotes(notes: Record<string, string>) {
  return { ...notes };
}

function replacePlateauNotesSnapshot(notes: Record<string, string>) {
  const nextNotes = clonePlateauNotes(notes);
  const serialized = JSON.stringify(nextNotes);
  if (serialized === plateauNotesSerialized) return false;
  plateauNotesSnapshot = nextNotes;
  plateauNotesSerialized = serialized;
  return true;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
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
  if (message.includes("plateau_assets")) {
    return new Error("La table Supabase des plans plateau est absente ou inaccessible.");
  }
  if (message.includes("plateau_operation_notes")) {
    return new Error("La table Supabase des annotations plateau est absente. Appliquez `supabase/patch_plateau_operation_notes.sql`.");
  }
  if (message.includes("plateau_excel_sources")) {
    return new Error("La table Supabase des sources Excel plateau est absente. Appliquez `docs/sql/2026-04-11-plateau-assets-excel.sql`.");
  }
  if (rawMessage.trim()) {
    return new Error(rawMessage);
  }
  return error instanceof Error ? error : new Error("Erreur Supabase inconnue.");
}

function mapPlateauAssetRow(row: DbRow): PlateauAsset {
  return {
    id: String(row.id ?? ""),
    weekNumber: Number(row.week_number ?? 0),
    plateauKey: String(row.plateau_key ?? "WEEK").toUpperCase() as PlateauAssetKey,
    filePath: String(row.file_path ?? ""),
    publicUrl: String(row.public_url ?? ""),
    sourcePdfName: String(row.source_pdf_name ?? ""),
    sourceType: String(row.source_type ?? "pdf").toLowerCase() === "excel" ? "excel" : "pdf",
    pageNumber: row.page_number == null ? null : Number(row.page_number),
    implantationDate: row.implantation_date == null ? null : String(row.implantation_date),
    desimplantationDate: row.desimplantation_date == null ? null : String(row.desimplantation_date),
    uploadedBy: row.uploaded_by == null ? null : String(row.uploaded_by),
    importedAt: String(row.imported_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.imported_at ?? new Date().toISOString()),
  };
}

function mapPlateauExcelRow(row: DbRow): PlateauExcelSource {
  return {
    id: String(row.id ?? ""),
    weekNumber: Number(row.week_number ?? 0),
    implantationDate: String(row.implantation_date ?? ""),
    desimplantationDate: String(row.desimplantation_date ?? ""),
    filePath: String(row.file_path ?? ""),
    publicUrl: String(row.public_url ?? ""),
    sourceName: String(row.source_name ?? ""),
    importedAt: String(row.imported_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.imported_at ?? new Date().toISOString()),
  };
}

function buildStoragePath(weekNumber: number, plateauKey: PlateauAssetKey) {
  return `weeks/semaine-${String(weekNumber).padStart(2, "0")}/plateau-${plateauKey.toLowerCase()}`;
}

function buildExcelStoragePath(weekNumber: number) {
  return `weeks/semaine-${String(weekNumber).padStart(2, "0")}/source.xlsx`;
}

export async function getSignedPlateauUrl(
  filePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!filePath) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(PLATEAU_STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export function loadPlateauAssets(): PlateauAsset[] {
  if (!canUseStorage()) return [];
  return cloneAssets(plateauAssetsSnapshot);
}

export function loadPlateauExcelSources(): PlateauExcelSource[] {
  if (!canUseStorage()) return [];
  return cloneExcelSources(plateauExcelSourcesSnapshot);
}

export function loadPlateauNotes() {
  if (!canUseStorage()) return {};
  return clonePlateauNotes(plateauNotesSnapshot);
}

export function buildPlateauNoteKey(weekNumber: number, plateauKey: PlateauAssetKey, opId: string) {
  return `${weekNumber}:${plateauKey}:${opId}`;
}

export function getPlateauAssetsUpdatedEventName() {
  return PLATEAU_UPDATED_EVENT;
}

export function getPlateauStorageBucketName() {
  return PLATEAU_STORAGE_BUCKET;
}

export async function syncPlateauAssetsFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plateau_assets")
      .select("*")
      .order("week_number", { ascending: true })
      .order("plateau_key", { ascending: true })
      .limit(5000);
    if (error) throw error;

    const nextAssets = Array.isArray(data) ? data.map((row) => mapPlateauAssetRow(row as DbRow)) : [];
    const changed = replacePlateauAssetsSnapshot(nextAssets);
    if (changed) emitUpdated();
    return changed;
  } catch {
    return false;
  }
}

export async function syncPlateauExcelSourcesFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plateau_excel_sources")
      .select("*")
      .order("implantation_date", { ascending: true })
      .limit(5000);
    if (error) throw error;

    const nextSources = Array.isArray(data) ? data.map((row) => mapPlateauExcelRow(row as DbRow)) : [];
    const changed = replacePlateauExcelSourcesSnapshot(nextSources);
    if (changed) emitUpdated();
    return changed;
  } catch {
    return false;
  }
}

export async function syncPlateauNotesFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plateau_operation_notes")
      .select("*")
      .limit(5000);
    if (error) throw error;

    const nextNotes: Record<string, string> = {};
    if (Array.isArray(data)) {
      data.forEach((row) => {
        const opId = String((row as DbRow).op_id ?? "").trim();
        const plateauKey = String((row as DbRow).plateau_key ?? "").trim().toUpperCase() as PlateauAssetKey;
        const weekNumber = Number((row as DbRow).week_number ?? 0);
        if (!opId) return;
        if (!plateauKey || !Number.isFinite(weekNumber) || weekNumber <= 0) return;
        nextNotes[buildPlateauNoteKey(weekNumber, plateauKey, opId)] = String((row as DbRow).note ?? "");
      });
    }
    const changed = replacePlateauNotesSnapshot(nextNotes);
    if (changed) emitUpdated();
    return changed;
  } catch {
    return false;
  }
}

export async function savePlateauAssetsToSupabase(
  uploads: PlateauAssetUpload[],
  options?: { replaceTouchedWeeks?: boolean },
  onProgress?: (completed: number, total: number) => void,
) {
  if (!uploads.length) return [];

  try {
    await assertOfficeModuleWriteAccess("plateau", "Action reservee aux profils pouvant modifier le module Plateau.");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const deduped = new Map<string, PlateauAssetUpload>();
    uploads.forEach((upload) => {
      deduped.set(`${upload.weekNumber}:${upload.plateauKey}`, upload);
    });

    const entries = Array.from(deduped.values());
    const touchedWeeks = Array.from(new Set(entries.map((entry) => entry.weekNumber)));
    const uploadedRows: Array<Record<string, unknown>> = [];

    const { data: existingRows, error: existingError } = await supabase
      .from("plateau_assets")
      .select("id,week_number,plateau_key,file_path")
      .in("week_number", touchedWeeks);
    if (existingError) throw existingError;

    let completed = 0;
    for (const entry of entries) {
      const filePath = buildStoragePath(entry.weekNumber, entry.plateauKey);
      const { error: uploadError } = await supabase.storage
        .from(PLATEAU_STORAGE_BUCKET)
        .upload(filePath, entry.file, {
          cacheControl: "3600",
          upsert: true,
          contentType: entry.contentType || "image/png",
        });
      if (uploadError) throw uploadError;

      uploadedRows.push({
        week_number: entry.weekNumber,
        plateau_key: entry.plateauKey,
        file_path: filePath,
        public_url: "",
        source_pdf_name: sanitizeFileName(entry.sourcePdfName || "plateau"),
        source_type: "pdf",
        page_number: entry.pageNumber ?? null,
        implantation_date: entry.implantationDate ?? null,
        desimplantation_date: entry.desimplantationDate ?? null,
        uploaded_by: user?.id ?? null,
      });

      completed += 1;
      onProgress?.(completed, entries.length);
    }

    const incomingKeys = new Set(entries.map((entry) => `${entry.weekNumber}:${entry.plateauKey}`));
    const rowsToDelete = options?.replaceTouchedWeeks && Array.isArray(existingRows)
      ? existingRows.filter((row) => !incomingKeys.has(`${row.week_number}:${String(row.plateau_key).toUpperCase()}`))
      : [];

    if (rowsToDelete.length) {
      const storagePaths = rowsToDelete
        .map((row) => String(row.file_path ?? ""))
        .filter(Boolean);
      if (storagePaths.length) {
        const { error: storageRemoveError } = await supabase.storage
          .from(PLATEAU_STORAGE_BUCKET)
          .remove(storagePaths);
        if (storageRemoveError) throw storageRemoveError;
      }

      const idsToDelete = rowsToDelete
        .map((row) => String(row.id ?? ""))
        .filter(Boolean);
      if (idsToDelete.length) {
        const { error: deleteError } = await supabase
          .from("plateau_assets")
          .delete()
          .in("id", idsToDelete);
        if (deleteError) throw deleteError;
      }
    }

    const { data: savedRows, error: upsertError } = await supabase
      .from("plateau_assets")
      .upsert(uploadedRows, { onConflict: "week_number,plateau_key" })
      .select("*");
    if (upsertError) throw upsertError;

    await syncPlateauAssetsFromSupabase();
    emitUpdated();
    return Array.isArray(savedRows) ? savedRows.map((row) => mapPlateauAssetRow(row as DbRow)) : [];
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function savePlateauExcelToSupabase(upload: PlateauExcelUpload): Promise<PlateauExcelSource> {
  try {
    await assertOfficeModuleWriteAccess("plateau", "Action reservee aux profils pouvant modifier le module Plateau.");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const filePath = buildExcelStoragePath(upload.weekNumber);
    const { error: uploadError } = await supabase.storage
      .from(PLATEAU_STORAGE_BUCKET)
      .upload(filePath, upload.file, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    if (uploadError) throw uploadError;

    const row = {
      week_number: upload.weekNumber,
      implantation_date: upload.implantationDate,
      desimplantation_date: upload.desimplantationDate,
      file_path: filePath,
      public_url: "",
      source_name: sanitizeFileName(upload.sourceName || "source.xlsx"),
      uploaded_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("plateau_excel_sources")
      .upsert(row, { onConflict: "week_number" })
      .select("*")
      .single();
    if (error) throw error;

    await syncPlateauExcelSourcesFromSupabase();
    emitUpdated();
    return mapPlateauExcelRow(data as DbRow);
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function removePlateauExcelFromSupabase(weekNumber: number) {
  try {
    await assertOfficeModuleWriteAccess("plateau", "Action reservee aux profils pouvant modifier le module Plateau.");
    const supabase = createClient();
    const filePath = buildExcelStoragePath(weekNumber);

    const { error: storageError } = await supabase.storage.from(PLATEAU_STORAGE_BUCKET).remove([filePath]);
    if (storageError) throw storageError;

    const { error } = await supabase
      .from("plateau_excel_sources")
      .delete()
      .eq("week_number", weekNumber);
    if (error) throw error;

    await syncPlateauExcelSourcesFromSupabase();
    emitUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function removePlateauAssetFromSupabase(weekNumber: number, plateauKey: PlateauAssetKey) {
  try {
    await assertOfficeModuleWriteAccess("plateau", "Action reservee aux profils pouvant modifier le module Plateau.");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plateau_assets")
      .select("id,file_path")
      .eq("week_number", weekNumber)
      .eq("plateau_key", plateauKey)
      .maybeSingle();
    if (error) throw error;

    const row = data as DbRow | null;
    const filePath = String(row?.file_path ?? "");
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from(PLATEAU_STORAGE_BUCKET)
        .remove([filePath]);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabase
      .from("plateau_assets")
      .delete()
      .eq("week_number", weekNumber)
      .eq("plateau_key", plateauKey);
    if (deleteError) throw deleteError;

    await syncPlateauAssetsFromSupabase();
    emitUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function savePlateauNoteToSupabase(
  weekNumber: number,
  plateauKey: PlateauAssetKey,
  opId: string,
  note: string,
) {
  try {
    await assertOfficeModuleWriteAccess("plateau", "Action reservee aux profils pouvant modifier le module Plateau.");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const normalizedNote = note.trim();

    if (!normalizedNote) {
      const { error: deleteError } = await supabase
        .from("plateau_operation_notes")
        .delete()
        .eq("week_number", weekNumber)
        .eq("plateau_key", plateauKey)
        .eq("op_id", opId);
      if (deleteError) throw deleteError;

      const nextNotes = loadPlateauNotes();
      delete nextNotes[buildPlateauNoteKey(weekNumber, plateauKey, opId)];
      replacePlateauNotesSnapshot(nextNotes);
      emitUpdated();
      return loadPlateauNotes();
    }

    const { error } = await supabase
      .from("plateau_operation_notes")
      .upsert(
        {
          week_number: weekNumber,
          plateau_key: plateauKey,
          op_id: opId,
          note: normalizedNote,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "week_number,plateau_key,op_id" },
      );
    if (error) throw error;

    const nextNotes = loadPlateauNotes();
    nextNotes[buildPlateauNoteKey(weekNumber, plateauKey, opId)] = normalizedNote;
    replacePlateauNotesSnapshot(nextNotes);
    emitUpdated();
    return loadPlateauNotes();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export function getPlateauAssetLookup(assets: PlateauAsset[]) {
  const lookup = new Map<string, PlateauAsset>();
  assets.forEach((asset) => {
    lookup.set(`${asset.weekNumber}:${asset.plateauKey}`, asset);
  });
  return lookup;
}

export function getBestPlateauAssetForWeek(
  assetLookup: Map<string, PlateauAsset>,
  weekNumber: number,
  preferredKey?: PlateauAssetKey,
) {
  const baseOrder: PlateauAssetKey[] = ["WEEK", "A", "B", "C"];
  const fallbackOrder: PlateauAssetKey[] = preferredKey
    ? [preferredKey, ...baseOrder.filter((key) => key !== preferredKey)]
    : baseOrder;

  for (const plateauKey of fallbackOrder) {
    const asset = assetLookup.get(`${weekNumber}:${plateauKey}`);
    if (asset) return asset;
  }

  return null;
}

export function getPlateauOperationStartWeekById() {
  const byId = new Map<string, number>();
  plateauTimelineOperations.forEach((operation) => {
    byId.set(operation.id, operation.sFrom);
  });
  return byId;
}

export function getActiveExcelSource(
  sources: PlateauExcelSource[],
  today: Date = new Date(),
) {
  const todayStr = today.toISOString().slice(0, 10);
  return sources.find(
    (source) => source.implantationDate <= todayStr && source.desimplantationDate >= todayStr,
  ) ?? null;
}

export function getExcelSourceForWeek(
  sources: PlateauExcelSource[],
  weekNumber: number,
) {
  return sources.find((source) => source.weekNumber === weekNumber) ?? null;
}
