import {
  infoAnnouncements,
  infoCategories,
  type InfoAnnouncement,
  type InfoAnnouncementPriority,
  type InfoCategory,
  type InfoCategoryId,
  type InfoDocumentAttachment,
  type InfoItem,
} from "@/lib/infos-data";
import { createClient } from "@/lib/supabase";

const INFO_CATEGORIES_STORAGE_KEY = "epicerie-manager-info-categories-v1";
const INFO_ANNOUNCEMENTS_STORAGE_KEY = "epicerie-manager-info-announcements-v1";
const INFO_UPDATED_EVENT = "epicerie-manager:infos-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INFO_UPDATED_EVENT));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnnouncementPriority(value: unknown): value is InfoAnnouncementPriority {
  return value === "urgent" || value === "important" || value === "normal";
}

function isAttachment(value: unknown): value is InfoDocumentAttachment {
  if (!isObject(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.size === "number" &&
    typeof value.dataUrl === "string" &&
    typeof value.uploadedAt === "string"
  );
}

function isItem(value: unknown): value is InfoItem {
  if (!isObject(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }
  if (value.attachment === undefined) return true;
  return isAttachment(value.attachment);
}

function isCategoryId(value: unknown): value is InfoCategoryId {
  return value === "proc" || value === "secu" || value === "rh" || value === "outils" || value === "contacts";
}

function isCategory(value: unknown): value is InfoCategory {
  if (!isObject(value)) return false;
  if (!isCategoryId(value.id) || typeof value.label !== "string" || !Array.isArray(value.items)) return false;
  return value.items.every(isItem);
}

function isAnnouncement(value: unknown): value is InfoAnnouncement {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    isAnnouncementPriority(value.priority)
  );
}

export function loadInfoCategories(): InfoCategory[] {
  if (!canUseStorage()) return infoCategories;
  const raw = window.localStorage.getItem(INFO_CATEGORIES_STORAGE_KEY);
  if (!raw) return infoCategories;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return infoCategories;
    const valid = parsed.filter(isCategory);
    return valid.length ? valid : infoCategories;
  } catch {
    return infoCategories;
  }
}

export function saveInfoCategories(categories: InfoCategory[]) {
  if (!canUseStorage()) return;
  const nextRaw = JSON.stringify(categories);
  const prevRaw = window.localStorage.getItem(INFO_CATEGORIES_STORAGE_KEY);
  if (prevRaw === nextRaw) return;
  window.localStorage.setItem(INFO_CATEGORIES_STORAGE_KEY, nextRaw);
  emitUpdated();
}

export function loadInfoAnnouncements(): InfoAnnouncement[] {
  if (!canUseStorage()) return infoAnnouncements;
  const raw = window.localStorage.getItem(INFO_ANNOUNCEMENTS_STORAGE_KEY);
  if (!raw) return infoAnnouncements;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return infoAnnouncements;
    const valid = parsed.filter(isAnnouncement);
    return valid.length ? valid : infoAnnouncements;
  } catch {
    return infoAnnouncements;
  }
}

export function saveInfoAnnouncements(announcements: InfoAnnouncement[]) {
  if (!canUseStorage()) return;
  const nextRaw = JSON.stringify(announcements);
  const prevRaw = window.localStorage.getItem(INFO_ANNOUNCEMENTS_STORAGE_KEY);
  if (prevRaw === nextRaw) return;
  window.localStorage.setItem(INFO_ANNOUNCEMENTS_STORAGE_KEY, nextRaw);
  emitUpdated();
}

export function getInfosUpdatedEventName() {
  return INFO_UPDATED_EVENT;
}

function toPriority(value: unknown): InfoAnnouncementPriority {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "urgent") return "urgent";
  if (normalized === "important") return "important";
  return "normal";
}

function categoryExists(id: string, categories: InfoCategory[]) {
  return categories.some((category) => category.id === id);
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

    if (Array.isArray(documentsRows) && documentsRows.length > 0) {
      const nextCategories: InfoCategory[] = infoCategories.map((category) => ({ ...category, items: [] }));

      documentsRows.forEach((row: Record<string, unknown>) => {
        const categoryId = String(row.category_id ?? row.category ?? "proc");
        if (!categoryExists(categoryId, nextCategories)) return;

        const attachmentObj = row.attachment && typeof row.attachment === "object"
          ? (row.attachment as Record<string, unknown>)
          : null;
        const attachment =
          attachmentObj || row.attachment_data_url || row.attachment_name
            ? {
                name: String(attachmentObj?.name ?? row.attachment_name ?? "document"),
                mimeType: String(attachmentObj?.mimeType ?? row.attachment_mime_type ?? "application/octet-stream"),
                size: Number(attachmentObj?.size ?? row.attachment_size ?? 0),
                dataUrl: String(attachmentObj?.dataUrl ?? row.attachment_data_url ?? ""),
                uploadedAt: String(attachmentObj?.uploadedAt ?? row.updated_at ?? row.created_at ?? new Date().toISOString()),
              }
            : undefined;

        const item: InfoItem = {
          id: String(row.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          title: String(row.title ?? row.nom ?? "Document"),
          description: String(row.description ?? row.resume ?? ""),
          attachment,
          createdAt: String(row.created_at ?? new Date().toISOString()),
          updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
        };
        const category = nextCategories.find((entry) => entry.id === categoryId);
        if (category) category.items.push(item);
      });

      window.localStorage.setItem(INFO_CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
      hasData = true;
    }

    if (Array.isArray(annoncesRows) && annoncesRows.length > 0) {
      const nextAnnouncements: InfoAnnouncement[] = annoncesRows.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ""),
        date: String(row.date ?? row.created_at ?? ""),
        title: String(row.title ?? row.titre ?? "Annonce"),
        content: String(row.content ?? row.message ?? ""),
        priority: toPriority(row.priority),
      }));
      window.localStorage.setItem(INFO_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(nextAnnouncements));
      hasData = true;
    }

    if (hasData) emitUpdated();
    return hasData;
  } catch {
    return false;
  }
}
