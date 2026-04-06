import {
  infoAnnouncements,
  infoCategories,
  type InfoAnnouncement,
  type InfoAnnouncementAudience,
  type InfoAnnouncementAudienceDashboardUser,
  type InfoAnnouncementPriority,
  type InfoAnnouncementRecipient,
  type InfoAnnouncementTargeting,
  type InfoCategory,
  type InfoCategoryId,
  type InfoItem,
} from "@/lib/infos-data";
import { isAdminUser } from "@/lib/admin-access";
import { hasBrowserWindow, purgeLegacyCacheKeys } from "@/lib/browser-cache";
import { createClient } from "@/lib/supabase";
import { tgRayons } from "@/lib/tg-data";

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

type AnnouncementRecipientRow = {
  id: string;
  annonce_id: string;
  employee_id: string;
  seen_at: string | null;
  confirmed_at: string | null;
};

type AnnouncementAudienceEmployeeRow = {
  id: string;
  name: string | null;
  actif: boolean | null;
  tg_rayons?: string[] | null;
};

type DashboardAudienceProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export type CreateInfoAnnouncementInput = {
  title: string;
  content: string;
  priority: InfoAnnouncementPriority;
  publishAt: string | null;
  expiresAt: string | null;
  targeting: InfoAnnouncementTargeting;
  targetEmployeeIds: string[];
  targetRayons: string[];
  confirmationRequired: boolean;
};

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
  return announcements.map((announcement) => ({
    ...announcement,
    targetEmployeeIds: [...announcement.targetEmployeeIds],
    targetRayons: [...announcement.targetRayons],
    recipients: announcement.recipients.map((recipient) => ({ ...recipient })),
    selfReceipt: announcement.selfReceipt ? { ...announcement.selfReceipt } : announcement.selfReceipt ?? null,
  }));
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
  if (!canUseStorage()) return cloneCategories(infoCategories);
  purgeLegacyCacheKeys([INFO_CATEGORIES_STORAGE_KEY]);
  try {
    return cloneCategories(infoCategoriesSnapshot);
  } catch {
    return cloneCategories(infoCategories);
  }
}

export function saveInfoCategories(categories: InfoCategory[]) {
  if (!canUseStorage()) return;
  if (replaceInfoCategoriesSnapshot(categories)) emitUpdated();
}

export function loadInfoAnnouncements(): InfoAnnouncement[] {
  if (!canUseStorage()) return cloneAnnouncements(infoAnnouncements);
  purgeLegacyCacheKeys([INFO_ANNOUNCEMENTS_STORAGE_KEY]);
  try {
    return cloneAnnouncements(infoAnnouncementsSnapshot);
  } catch {
    return cloneAnnouncements(infoAnnouncements);
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
  if (normalized === "info" || normalized === "normal") return "normal";
  return "normal";
}

function toTargeting(value: unknown): InfoAnnouncementTargeting {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "employees") return "employees";
  if (normalized === "rayons") return "rayons";
  return "all";
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
    (message.includes("annonce_recipients") && message.includes("permission denied")) ||
    (message.includes("annonce_recipients") && message.includes("row-level security")) ||
    (message.includes("annonce_recipients") && message.includes("42501"))
  ) {
    return new Error("La table annonce_recipients existe, mais ses droits Supabase ne permettent pas encore l'écriture/lecture via l'application. Appliquez le patch SQL des policies annonce_recipients.");
  }
  if (
    message.includes("could not find the 'publie_a_partir_de' column") ||
    message.includes("could not find the 'expire_le' column") ||
    message.includes("could not find the 'ciblage' column") ||
    message.includes("could not find the 'target_employee_ids' column") ||
    message.includes("could not find the 'target_rayons' column") ||
    message.includes("could not find the 'confirmation_requise' column") ||
    message.includes("relation \"annonce_recipients\" does not exist") ||
    message.includes("relation 'annonce_recipients' does not exist") ||
    message.includes("annonce_recipients")
  ) {
    return new Error("Le module d'annonces ciblées nécessite le patch SQL Infos (colonnes annonces + table annonce_recipients).");
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function formatAnnouncementDate(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapRecipientRows(
  recipients: AnnouncementRecipientRow[],
  employeeNames: Map<string, string>,
): InfoAnnouncementRecipient[] {
  return recipients
    .map((recipient) => ({
      id: String(recipient.id ?? `${recipient.annonce_id}-${recipient.employee_id}`),
      employeeId: String(recipient.employee_id ?? ""),
      employeeName: employeeNames.get(String(recipient.employee_id ?? "")) ?? "Collaborateur",
      seenAt: recipient.seen_at ? String(recipient.seen_at) : null,
      confirmedAt: recipient.confirmed_at ? String(recipient.confirmed_at) : null,
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName, "fr"));
}

function mapAnnouncementRowToItem(
  row: DbRow,
  recipients: InfoAnnouncementRecipient[] = [],
  selfReceipt: { seenAt: string | null; confirmedAt: string | null } | null = null,
): InfoAnnouncement {
  const publishAt = row.publie_a_partir_de == null ? null : String(row.publie_a_partir_de);
  const createdAt = String(row.created_at ?? row.date_publication ?? new Date().toISOString());
  const displayDate = formatAnnouncementDate(publishAt ?? createdAt);

  return {
    id: String(row.id ?? ""),
    date: displayDate,
    createdAt,
    title: String(row.title ?? row.titre ?? "Annonce"),
    content: String(row.content ?? row.contenu ?? row.message ?? ""),
    priority: toPriority(row.priority ?? row.niveau),
    publishAt,
    expiresAt: row.expire_le == null ? null : String(row.expire_le),
    targeting: toTargeting(row.ciblage),
    targetEmployeeIds: normalizeStringArray(row.target_employee_ids),
    targetRayons: normalizeStringArray(row.target_rayons).map((rayon) => rayon.toUpperCase()),
    confirmationRequired: row.confirmation_requise == null ? false : Boolean(row.confirmation_requise),
    recipients,
    selfReceipt,
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

function getAnnouncementNowIso() {
  return new Date().toISOString();
}

export function isInfoAnnouncementActiveNow(announcement: InfoAnnouncement, nowIso = getAnnouncementNowIso()) {
  if (!announcement.publishAt && !announcement.expiresAt) return true;
  const now = new Date(nowIso).getTime();
  const startsAt = announcement.publishAt ? new Date(announcement.publishAt).getTime() : null;
  const endsAt = announcement.expiresAt ? new Date(announcement.expiresAt).getTime() : null;
  if (startsAt != null && now < startsAt) return false;
  if (endsAt != null && now > endsAt) return false;
  return true;
}

async function fetchAnnouncementAudienceEmployees() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,actif,tg_rayons")
    .eq("actif", true)
    .order("name");
  if (error) throw error;
  return ((data ?? []) as AnnouncementAudienceEmployeeRow[]).map((employee) => ({
    id: String(employee.id ?? ""),
    name: String(employee.name ?? "").trim().toUpperCase(),
    tgRayons: normalizeStringArray(employee.tg_rayons).map((rayon) => rayon.toUpperCase()),
  }));
}

async function fetchDashboardAudienceProfiles(): Promise<InfoAnnouncementAudienceDashboardUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role")
    .eq("role", "manager")
    .order("full_name");
  if (error) throw error;

  return ((data ?? []) as DashboardAudienceProfileRow[])
    .filter((profile) => !isAdminUser(profile.email, profile.role))
    .map((profile) => ({
      id: String(profile.id ?? ""),
      name: String(profile.full_name ?? profile.email ?? "Compte bureau").trim(),
      email: String(profile.email ?? "").trim(),
    }))
    .filter((profile) => profile.id);
}

export async function getInfoAnnouncementAudience(): Promise<InfoAnnouncementAudience> {
  try {
    const [employees, dashboardUsers] = await Promise.all([
      fetchAnnouncementAudienceEmployees(),
      fetchDashboardAudienceProfiles().catch(() => []),
    ]);
    const rayonSet = new Set(
      tgRayons
        .filter((row) => row.active)
        .map((row) => row.rayon.trim().toUpperCase()),
    );
    employees.forEach((employee) => {
      employee.tgRayons.forEach((rayon) => rayonSet.add(rayon));
    });
    return {
      employees,
      dashboardUsers,
      rayons: Array.from(rayonSet).sort((left, right) => left.localeCompare(right, "fr")),
    };
  } catch (error) {
    throw normalizeActionError(error);
  }
}

async function buildAnnouncementRecipients(
  targeting: InfoAnnouncementTargeting,
  targetEmployeeIds: string[],
  targetRayons: string[],
) {
  const audience = await getInfoAnnouncementAudience();
  if (targeting === "employees") {
    return audience.employees.filter((employee) => targetEmployeeIds.includes(employee.id));
  }
  if (targeting === "rayons") {
    const targetRayonSet = new Set(targetRayons.map((rayon) => rayon.toUpperCase()));
    return audience.employees.filter((employee) =>
      employee.tgRayons.some((rayon) => targetRayonSet.has(rayon)),
    );
  }
  return audience.employees;
}

async function fetchDocumentsCategoriesFromSupabase() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .limit(5000);
  if (error) throw error;

  const nextCategories: InfoCategory[] = infoCategories.map((category) => ({ ...category, items: [] }));
  ((data ?? []) as DbRow[]).forEach((row) => {
    const categoryId =
      INFO_CATEGORY_FROM_DB[String(row.category_id ?? row.category ?? row.categorie ?? "proc").toLowerCase()] ?? "proc";
    if (!categoryExists(categoryId, nextCategories)) return;
    const item = mapDocumentRowToItem(row);
    const category = nextCategories.find((entry) => entry.id === categoryId);
    if (category) category.items.push(item);
  });
  return nextCategories;
}

async function fetchManagerAnnouncementsFromSupabase() {
  const supabase = createClient();
  const { data: announcementRows, error: announcementError } = await supabase
    .from("annonces")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (announcementError) throw announcementError;

  let recipientRows: AnnouncementRecipientRow[] = [];
  try {
    const { data, error } = await supabase
      .from("annonce_recipients")
      .select("id,annonce_id,employee_id,seen_at,confirmed_at")
      .limit(20000);
    if (error) throw error;
    recipientRows = (data ?? []) as AnnouncementRecipientRow[];
  } catch {
    recipientRows = [];
  }

  const employees = await fetchAnnouncementAudienceEmployees().catch(() => []);
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));
  const recipientsByAnnouncement = new Map<string, AnnouncementRecipientRow[]>();
  recipientRows.forEach((row) => {
    const key = String(row.annonce_id ?? "");
    if (!recipientsByAnnouncement.has(key)) recipientsByAnnouncement.set(key, []);
    recipientsByAnnouncement.get(key)?.push(row);
  });

  return ((announcementRows ?? []) as DbRow[]).map((row) => {
    const announcementId = String(row.id ?? "");
    const recipients = mapRecipientRows(recipientsByAnnouncement.get(announcementId) ?? [], employeeNames);
    return mapAnnouncementRowToItem(row, recipients, null);
  });
}

async function refreshManagerSnapshots() {
  const [categories, announcements] = await Promise.all([
    fetchDocumentsCategoriesFromSupabase(),
    fetchManagerAnnouncementsFromSupabase(),
  ]);
  const categoriesChanged = replaceInfoCategoriesSnapshot(categories);
  const announcementsChanged = replaceInfoAnnouncementsSnapshot(announcements);
  if (categoriesChanged || announcementsChanged) emitUpdated();
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

export async function addAnnouncementToSupabase(input: CreateInfoAnnouncementInput): Promise<InfoAnnouncement> {
  let createdAnnouncementId = "";
  try {
    const supabase = createClient();
    const targetEmployeeIds = Array.from(new Set(input.targetEmployeeIds.filter(Boolean)));
    const targetRayons = Array.from(
      new Set(input.targetRayons.map((rayon) => rayon.trim().toUpperCase()).filter(Boolean)),
    );
    const audience = await getInfoAnnouncementAudience();
    const recipients = await buildAnnouncementRecipients(input.targeting, targetEmployeeIds, targetRayons);
    const dashboardRecipients = audience.dashboardUsers.filter((profile) => targetEmployeeIds.includes(profile.id));

    if (input.targeting !== "all" && recipients.length === 0 && dashboardRecipients.length === 0) {
      throw new Error("Sélectionnez au moins un destinataire pour cette annonce.");
    }

    const { data, error } = await supabase
      .from("annonces")
      .insert({
        date: todayIsoDate(),
        titre: input.title.trim(),
        contenu: input.content.trim(),
        niveau: toDbAnnouncementLevel(input.priority),
        publie_a_partir_de: input.publishAt,
        expire_le: input.expiresAt,
        ciblage: input.targeting,
        target_employee_ids: input.targeting === "employees" ? targetEmployeeIds : [],
        target_rayons: input.targeting === "rayons" ? targetRayons : [],
        confirmation_requise: input.confirmationRequired,
      })
      .select("*")
      .single();
    if (error) throw error;
    createdAnnouncementId = String((data as DbRow).id ?? "");

    if (recipients.length) {
      const { error: recipientError } = await supabase
        .from("annonce_recipients")
        .insert(
          recipients.map((recipient) => ({
            annonce_id: createdAnnouncementId,
            employee_id: recipient.id,
          })),
        );
      if (recipientError) throw recipientError;
    }

    await refreshManagerSnapshots();
    const created = loadInfoAnnouncements().find((announcement) => announcement.id === createdAnnouncementId);
    return created ?? mapAnnouncementRowToItem(data as DbRow);
  } catch (error) {
    if (createdAnnouncementId) {
      try {
        const supabase = createClient();
        await supabase.from("annonces").delete().eq("id", createdAnnouncementId);
      } catch {
        // Keep original error if rollback fails.
      }
    }
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
    await refreshManagerSnapshots();
    return true;
  } catch {
    return false;
  }
}

function mergeCollabAnnouncementRows(
  announcementRows: DbRow[],
  recipientRows: AnnouncementRecipientRow[],
  employeeId: string,
) {
  const recipientsByAnnouncement = new Map<string, AnnouncementRecipientRow[]>();
  recipientRows.forEach((row) => {
    const key = String(row.annonce_id ?? "");
    if (!recipientsByAnnouncement.has(key)) recipientsByAnnouncement.set(key, []);
    recipientsByAnnouncement.get(key)?.push(row);
  });

  return announcementRows
    .map((row) => {
      const announcementId = String(row.id ?? "");
      const ownRecipient = (recipientsByAnnouncement.get(announcementId) ?? []).find(
        (recipient) => String(recipient.employee_id ?? "") === employeeId,
      );
      const announcement = mapAnnouncementRowToItem(row, [], ownRecipient
        ? { seenAt: ownRecipient.seen_at ? String(ownRecipient.seen_at) : null, confirmedAt: ownRecipient.confirmed_at ? String(ownRecipient.confirmed_at) : null }
        : null);
      return announcement;
    })
    .filter((announcement) => {
      if (!isInfoAnnouncementActiveNow(announcement)) return false;
      if (announcement.targeting === "all") {
        return true;
      }
      return Boolean(announcement.selfReceipt);
    });
}

export async function getCollabInfosFromSupabase(employeeId: string) {
  try {
    const supabase = createClient();
    const [categories, announcementResult, recipientResult] = await Promise.all([
      fetchDocumentsCategoriesFromSupabase(),
      supabase.from("annonces").select("*").order("created_at", { ascending: false }).limit(5000),
      supabase
        .from("annonce_recipients")
        .select("id,annonce_id,employee_id,seen_at,confirmed_at")
        .eq("employee_id", employeeId)
        .limit(5000),
    ]);

    const announcementRows = announcementResult.error ? [] : ((announcementResult.data ?? []) as DbRow[]);
    const recipientRows = recipientResult.error ? [] : ((recipientResult.data ?? []) as AnnouncementRecipientRow[]);

    return {
      categories,
      announcements: mergeCollabAnnouncementRows(announcementRows, recipientRows, employeeId),
    };
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function markAnnouncementsSeenInSupabase(employeeId: string, announcementIds: string[]) {
  const dedupedIds = Array.from(new Set(announcementIds.filter(Boolean)));
  if (!dedupedIds.length) return;

  try {
    const nowIso = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from("annonce_recipients")
      .upsert(
        dedupedIds.map((announcementId) => ({
          annonce_id: announcementId,
          employee_id: employeeId,
          seen_at: nowIso,
        })),
        { onConflict: "annonce_id,employee_id" },
      );
    if (error) throw error;
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function confirmAnnouncementReadingInSupabase(employeeId: string, announcementId: string) {
  try {
    const nowIso = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from("annonce_recipients")
      .upsert(
        {
          annonce_id: announcementId,
          employee_id: employeeId,
          seen_at: nowIso,
          confirmed_at: nowIso,
        },
        { onConflict: "annonce_id,employee_id" },
      );
    if (error) throw error;
  } catch (error) {
    throw normalizeActionError(error);
  }
}
