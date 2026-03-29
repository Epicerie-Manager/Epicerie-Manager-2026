import { createClient } from "@/lib/supabase";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";

export type CollabPlanningEntry = Record<string, unknown>;
export type CollabAbsenceRequest = Record<string, unknown>;
export type CollabDocument = Record<string, unknown>;
export type CollabAnnonce = Record<string, unknown>;

export async function getMyWeekPlanning(startDate: string, endDate: string) {
  const supabase = createClient();
  const profile = await getCollabProfile();
  if (!profile?.employee_id) return [];
  const { data, error } = await supabase
    .from("planning_entries")
    .select("*")
    .eq("employee_id", profile.employee_id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  if (error) throw error;
  return data ?? [];
}

export async function getMyMonthPlanning(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return getMyWeekPlanning(startDate, endDate);
}

export async function getTeamWeekPlanning(startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("planning_entries")
    .select("*, employees(id, name, type)")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  if (error) throw error;
  return data ?? [];
}

export async function getMyAbsences() {
  const supabase = createClient();
  const profile = await getCollabProfile();
  if (!profile?.employee_id) return [];
  const { data, error } = await supabase
    .from("absence_requests")
    .select("*")
    .eq("employee_id", profile.employee_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAbsenceRequest(payload: {
  type: string;
  date_debut: string;
  date_fin: string;
  nb_jours: number;
  nb_jours_ouvres: number;
  note?: string;
}) {
  const supabase = createClient();
  const profile = await getCollabProfile();
  if (!profile?.employee_id) throw new Error("Profil non trouvé");
  const { data, error } = await supabase
    .from("absence_requests")
    .insert({
      ...payload,
      employee_id: profile.employee_id,
      statut: "en_attente",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCurrentTGPlan() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("plans_tg")
    .select("*, plans_tg_entries(*)")
    .lte("date_de", today)
    .gte("date_a", today)
    .order("date_de", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentAnnonces(limit = 5) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("annonces")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getDocuments(categorie?: string) {
  const supabase = createClient();
  let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (categorie) query = query.eq("categorie", categorie);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function calcJoursOuvres(dateDebut: string, dateFin: string) {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function calcJoursTotal(dateDebut: string, dateFin: string) {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function startOfWeek(input = new Date()) {
  const date = new Date(input);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(input = new Date()) {
  const date = startOfWeek(input);
  date.setDate(date.getDate() + 6);
  return date;
}

export function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatFrenchLongDate(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getTodayAndTomorrowIso() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    today: formatIsoDate(today),
    tomorrow: formatIsoDate(tomorrow),
  };
}

export function getEntryDate(entry: CollabPlanningEntry) {
  return String(entry.date ?? "");
}

export function getEntryStatus(entry: CollabPlanningEntry) {
  return String(entry.statut ?? "").toUpperCase();
}

export function getEntryCustomHours(entry: CollabPlanningEntry) {
  return String(entry.horaire_custom ?? entry.horaires ?? "").trim();
}

export function getShiftCategory(entry: CollabPlanningEntry, profile?: CollabProfile | null) {
  const status = getEntryStatus(entry);
  const customHours = getEntryCustomHours(entry);
  if (status.includes("CP") || status.includes("CONGE")) return "conge";
  if (status.includes("REPOS") || status === "X") return "repos";
  if (status && !["PRESENT", "P", ""].includes(status)) return "absence";

  const employeeType = profile?.employees?.type ?? null;
  const hours = customHours || profile?.employees?.horaire_standard || "";
  const normalizedHours = hours.toLowerCase();
  if (normalizedHours.includes("14h") || normalizedHours.includes("12h") || employeeType === "S" || employeeType === "Apres-midi") {
    return "apresmidi";
  }
  if (/(\d{1,2})h/.test(normalizedHours)) {
    const startHour = Number(normalizedHours.match(/(\d{1,2})h/)?.[1] ?? "0");
    if (startHour >= 12) return "apresmidi";
    if (normalizedHours.includes("21h") || normalizedHours.includes("19h30")) return "journee";
    return "matin";
  }
  if (employeeType === "M" || employeeType === "Matin") return "matin";
  return "journee";
}

export function getShiftBadgeLabel(entry: CollabPlanningEntry, profile?: CollabProfile | null) {
  const category = getShiftCategory(entry, profile);
  if (category === "matin") return "M";
  if (category === "apresmidi") return "AM";
  if (category === "journee") return "J";
  if (category === "conge") return "CP";
  if (category === "repos") return "Repos";
  return "Abs";
}

export function getShiftTone(entry: CollabPlanningEntry, profile?: CollabProfile | null) {
  const category = getShiftCategory(entry, profile);
  if (category === "matin") return "#D40511";
  if (category === "apresmidi") return "#d97706";
  if (category === "journee") return "#64748b";
  if (category === "conge") return "#16a34a";
  if (category === "repos") return "#c7b9a3";
  return "#991b1b";
}

export function getShiftDisplayText(entry: CollabPlanningEntry, profile?: CollabProfile | null) {
  const status = getEntryStatus(entry);
  if (status.includes("CP") || status.includes("CONGE")) return "Congé";
  if (status.includes("REPOS") || status === "X") return "Repos";
  if (status && !["PRESENT", "P", ""].includes(status)) return status;
  const hours = getEntryCustomHours(entry) || profile?.employees?.horaire_standard || "";
  return hours || getShiftBadgeLabel(entry, profile);
}

export function getAbsenceStatusLabel(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("appr")) return "Approuvé";
  if (normalized.includes("ref")) return "Refusé";
  return "En attente";
}

export function getAbsenceStatusTone(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("appr")) return { bg: "#ecfdf5", color: "#166534" };
  if (normalized.includes("ref")) return { bg: "#fef2f2", color: "#991b1b" };
  return { bg: "#fffbeb", color: "#92400e" };
}
