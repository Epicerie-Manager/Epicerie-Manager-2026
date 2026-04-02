import {
  infoAnnouncements,
  infoCategories,
  type InfoAnnouncement,
  type InfoAnnouncementPriority,
  type InfoCategory,
  type InfoCategoryId,
  type InfoItem,
} from "@/lib/infos-data";
import { hasBrowserWindow, purgeLegacyCacheKeys } from "@/lib/browser-cache";
import { createClient } from "@/lib/supabase";

const INFO_CATEGORIES_STORAGE_KEY = "epicerie-manager-info-categories-v1";
const INFO_ANNOUNCEMENTS_STORAGE_KEY = "epicerie-manager-info-announcements-v1";
const INFO_UPDATED_EVENT = "epicerie-manager:infos-updated";
const INFO_STORAGE_BUCKET = "infos-documents";
const INFO_CATEGORY_TO_DB: Record<InfoCategoryId, string> = {
  proc: "procedures",
  secu: "securite",
  rh: "rh",
  outils: "outils",
  contacts: "contacts",
};
const INFO_CATEGORY_FROM_DB: Record<string, InfoCategoryId> = {
  procedures: "proc",
  procedure: "proc",
  proc: "proc",
  securite: "secu",
  secu: "secu",
  rh: "rh",
  outils: "outils",
  contacts: "contacts",
};

type DbRow = Record<string, unknown>;

let infoCategoriesSnapshot = cloneCategories(infoCategories);
let infoCategoriesSerialized = JSON.stringify(infoCategoriesSnapshot);
let infoAnnouncementsSnapshot = cloneAnnouncements(infoAnnouncements);
let infoAnnouncementsSerialized = JSON.stringify(infoAnnouncementsSnapshot);

function canUseStorage() {
  return hasBrowserWindow();
}

function emitUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INFO_UPDATED_EVENT));
}

function cloneCategories(categories: InfoCategory[]) {
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
      ...item,
      attachment: item.attachment ? { ...item.attachment } : undefined,
    })),
  }));
}

function cloneAnnouncements(announcements: InfoAnnouncement[]) {
  return announcements.map((announcement) => ({ ...announcement }));
}

function replaceInfoCategoriesSnapshot(categories: InfoCategory[]) {
  const nextCategories = cloneCategories(categories);
  const serialized = JSON.stringify(nextCategories);
  if (serialized === infoCategoriesSerialized) return false;
  infoCategoriesSnapshot = nextCategories;
  infoCategoriesSerialized = serialized;
  return true;
}

function replaceInfoAnnouncementsSnapshot(announcements: InfoAnnouncement[]) {
  const nextAnnouncements = cloneAnnouncements(announcements);
  const serialized = JSON.stringify(nextAnnouncements);
  if (serialized === infoAnnouncementsSerialized) return false;
  infoAnnouncementsSnapshot = nextAnnouncements;
  infoAnnouncementsSerialized = serialized;
  return true;
}

export function loadInfoCategories(): InfoCategory[] {
  if (!canUseStorage()) return infoCategories;
  purgeLegacyCacheKeys([INFO_CATEGORIES_STORAGE_KEY]);
  try {
    return cloneCategories(infoCategoriesSnapshot);
  } catch {
    return infoCategories;
  }
}

export function saveInfoCategories(categories: InfoCategory[]) {
  if (!canUseStorage()) return;
  if (replaceInfoCategoriesSnapshot(categories)) emitUpdated();
}

export function loadInfoAnnouncements(): InfoAnnouncement[] {
  if (!canUseStorage()) return infoAnnouncements;
  purgeLegacyCacheKeys([INFO_ANNOUNCEMENTS_STORAGE_KEY]);
  try {
    return cloneAnnouncements(infoAnnouncementsSnapshot);
  } catch {
    return infoAnnouncements;
  }
}

export function saveInfoAnnouncements(announcements: InfoAnnouncement[]) {
  if (!canUseStorage()) return;
  if (replaceInfoAnnouncementsSnapshot(announcements)) emitUpdated();
}

export function getInfosUpdatedEventName() {
  return INFO_UPDATED_EVENT;
}

function toPriority(value: unknown): InfoAnnouncementPriority {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "urgent") return "urgent";
  if (normalized === "important") return "important";
  if (normalized === "info") return "normal";
  return "normal";
}

function categoryExists(id: string, categories: InfoCategory[]) {
  return categories.some((category) => category.id === id);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
  if (message.includes("annonces_niveau_check")) {
    return new Error("La base Supabase n'autorise pas encore le niveau Urgent. Appliquez le patch SQL annonces pour ajouter 'urgent' dans la contrainte de la table.");
  }
  if (message.includes("jwt") || message.includes("auth session missing") || message.includes("not authenticated")) {
    return new Error("Veuillez vous reconnecter.");
  }
  if (rawMessage.trim()) {
    return new Error(rawMessage);
  }
  return error instanceof Error ? error : new Error("Erreur Supabase inconnue.");
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extractStoragePath(row: DbRow) {
  const rawUrl = String(row.url ?? "").trim();
  if (!rawUrl) return "";
  const marker = `/storage/v1/object/public/${INFO_STORAGE_BUCKET}/`;
  const idx = rawUrl.indexOf(marker);
  if (idx < 0) return "";
  return decodeURIComponent(rawUrl.slice(idx + marker.length));
}

function mapDocumentRowToItem(row: DbRow): InfoItem {
  const rawUrl = String(row.url ?? "").trim();
  const fileName = rawUrl ? decodeURIComponent(rawUrl.split("/").pop() || "document") : "document";
  const attachment = rawUrl
    ? {
        name: fileName,
        mimeType: String(row.type ?? "application/octet-stream"),
        size: 0,
        dataUrl: rawUrl,
        uploadedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      }
    : undefined;

  return {
    id: String(row.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(row.title ?? row.titre ?? row.nom ?? "Document"),
    description: String(row.description ?? row.resume ?? ""),
    attachment,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

function mapAnnouncementRowToItem(row: DbRow): InfoAnnouncement {
  const rawDate = String(row.date ?? row.created_at ?? "");
  const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? new Date(`${rawDate}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : rawDate;
  return {
    id: String(row.id ?? ""),
    date: displayDate,
    title: String(row.title ?? row.titre ?? "Annonce"),
    content: String(row.content ?? row.contenu ?? row.message ?? ""),
    priority: toPriority(row.priority ?? row.niveau),
  };
}

function toDbAnnouncementLevel(priority: InfoAnnouncementPriority) {
  if (priority === "urgent") return "urgent";
  if (priority === "important") return "important";
  return "info";
}

function toDbDocumentType(file?: File) {
  if (file && file.type.toLowerCase().includes("pdf")) return "pdf";
  return "doc";
}

export async function addDocumentToSupabase(
  categoryId: InfoCategoryId,
  title: string,
  description: string,
  file?: File,
): Promise<InfoItem> {
  try {
    const supabase = createClient();
    let url: string | null = null;
    const type = toDbDocumentType(file);

    if (file) {
      const filePath = `${INFO_CATEGORY_TO_DB[categoryId]}/${Date.now()}_${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(INFO_STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(INFO_STORAGE_BUCKET).getPublicUrl(filePath);
      url = data.publicUrl;
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        categorie: INFO_CATEGORY_TO_DB[categoryId],
        titre: title,
        description,
        type,
        url,
      })
      .select("*")
      .single();
    if (error) throw error;

    const nextCategories = loadInfoCategories().map((category) =>
      category.id === categoryId
        ? { ...category, items: [mapDocumentRowToItem(data as DbRow), ...category.items] }
        : category,
    );
    replaceInfoCategoriesSnapshot(nextCategories);
    emitUpdated();
    return mapDocumentRowToItem(data as DbRow);
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function removeDocumentFromSupabase(itemId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id,url")
      .eq("id", itemId)
      .maybeSingle();
    if (error) throw error;

    const row = data as DbRow | null;
    const storagePath = row ? extractStoragePath(row) : "";
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(INFO_STORAGE_BUCKET)
        .remove([storagePath]);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", itemId);
    if (deleteError) throw deleteError;

    const nextCategories = loadInfoCategories().map((category) => ({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    }));
    replaceInfoCategoriesSnapshot(nextCategories);
    emitUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function addAnnouncementToSupabase(
  title: string,
  content: string,
  priority: InfoAnnouncementPriority,
): Promise<InfoAnnouncement> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("annonces")
      .insert({
        date: todayIsoDate(),
        titre: title,
        contenu: content,
        niveau: toDbAnnouncementLevel(priority),
      })
      .select("*")
      .single();
    if (error) throw error;

    replaceInfoAnnouncementsSnapshot([mapAnnouncementRowToItem(data as DbRow), ...loadInfoAnnouncements()]);
    emitUpdated();
    return mapAnnouncementRowToItem(data as DbRow);
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function removeAnnouncementFromSupabase(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("annonces")
      .delete()
      .eq("id", id);
    if (error) throw error;

    replaceInfoAnnouncementsSnapshot(loadInfoAnnouncements().filter((announcement) => announcement.id !== id));
    emitUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function syncInfosFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const { data: documentsRows, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .limit(5000);
    if (documentsError) throw documentsError;

    const { data: annoncesRows, error: annoncesError } = await supabase
      .from("annonces")
      .select("*")
      .limit(5000);
    if (annoncesError) throw annoncesError;

    let hasData = false;

    if (Array.isArray(documentsRows)) {
      const nextCategories: InfoCategory[] = infoCategories.map((category) => ({ ...category, items: [] }));

      documentsRows.forEach((row: Record<string, unknown>) => {
        const categoryId = INFO_CATEGORY_FROM_DB[String(row.category_id ?? row.category ?? row.categorie ?? "proc").toLowerCase()] ?? "proc";
        if (!categoryExists(categoryId, nextCategories)) return;

        const item = mapDocumentRowToItem(row);
        const category = nextCategories.find((entry) => entry.id === categoryId);
        if (category) category.items.push(item);
      });

      hasData = replaceInfoCategoriesSnapshot(nextCategories) || hasData;
    }

    if (Array.isArray(annoncesRows)) {
      const nextAnnouncements: InfoAnnouncement[] = annoncesRows.map((row: Record<string, unknown>) => (
        mapAnnouncementRowToItem(row)
      ));
      hasData = replaceInfoAnnouncementsSnapshot(nextAnnouncements) || hasData;
    }

    if (hasData) emitUpdated();
    return hasData;
  } catch {
    return false;
  }
}
