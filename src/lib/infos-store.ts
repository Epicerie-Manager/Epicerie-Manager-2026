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
