import { createClient } from "@/lib/supabase";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";

export type CollabPlanningEntry = Record<string, unknown>;
export type CollabAbsenceRequest = Record<string, unknown>;
export type CollabDocument = Record<string, unknown>;
export type CollabAnnonce = Record<string, unknown>;

function normalizeCollabAbsenceStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("ref")) return "refuse";
  if (value.includes("appr")) return "approuve";
  return "en_attente";
}

function listIsoDates(dateDebut: string, dateFin: string) {
  const dates: string[] = [];
  const current = new Date(`${dateDebut}T00:00:00`);
  const end = new Date(`${dateFin}T00:00:00`);
  while (current <= end) {
    dates.push(formatLocalIsoDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCollabEmployeeType(value: unknown) {
  const upper = String(value ?? "").toUpperCase();
  if (upper.includes("APRES")) return "S";
  if (upper.includes("ETUD")) return "E";
  return "M";
}

function getIsoWeek(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const weekOne = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - weekOne.getTime()) / 86400000 - 3 + ((weekOne.getDay() + 6) % 7)) / 7,
    )
  );
}

function getDayCode(day: number) {
  return ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"][day];
}

function getDefaultStatusForDate(profile: CollabProfile, date: Date, cycleDays: string[]) {
  const employee = profile.employees;
  const dayOfWeek = date.getDay();
  const employeeType = normalizeCollabEmployeeType(employee?.type);

  if (dayOfWeek === 0) return "X";
  if (employeeType === "E") return dayOfWeek === 6 ? "PRESENT" : "X";
  if (employee?.actif === false) return "CONGE_MAT";

  if (cycleDays.length) {
    const cycleWeek = (getIsoWeek(date) - 1) % 5;
    if (cycleDays[cycleWeek] === getDayCode(dayOfWeek)) return "RH";
  }

  return "PRESENT";
}

function getDefaultHoursForDate(profile: CollabProfile, date: Date) {
  const employee = profile.employees;
  const employeeType = normalizeCollabEmployeeType(employee?.type);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 2) return employee?.horaire_mardi ?? employee?.horaire_standard ?? null;
  if (dayOfWeek === 6 && employeeType === "E") return employee?.horaire_samedi ?? "14h-21h30";
  return employee?.horaire_standard ?? null;
}

function buildBasePlanningEntries(profile: CollabProfile, startDate: string, endDate: string, cycleDays: string[]) {
  const rows: Array<Record<string, unknown>> = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    const date = formatLocalIsoDate(current);
    rows.push({
      date,
      employee_id: profile.employee_id,
      statut: getDefaultStatusForDate(profile, current, cycleDays),
      horaire_custom: getDefaultHoursForDate(profile, current),
    });
    current.setDate(current.getDate() + 1);
  }

  return rows;
}

function getPlanningStatusFromAbsenceType(type: unknown) {
  const upper = String(type ?? "").toUpperCase();
  if (upper === "CP") return "CP";
  if (upper === "MAL") return "MAL";
  if (upper === "CONGE_MAT") return "CONGE_MAT";
  if (upper === "FORM") return "FORM";
  if (upper === "FERIE") return "FERIE";
  if (upper === "RTT" || upper === "DEPLACEMENT_RH") return "RH";
  return "X";
}

async function getApprovedCollabAbsenceRows(
  employeeId: string,
  startDate: string,
  endDate: string,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("absences")
    .select("employee_id,type,date_debut,date_fin,statut,note,created_at,updated_at,source")
    .or(`employee_id.eq.${employeeId},note.ilike.%EMPLOYEE:TOUS%`)
    .lte("date_debut", endDate)
    .gte("date_fin", startDate);

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).filter(
    (row) => normalizeCollabAbsenceStatus(row.statut) === "approuve",
  );
}

export async function getMyWeekPlanning(startDate: string, endDate: string) {
  const supabase = createClient();
  const profile = await getCollabProfile();
  if (!profile?.employee_id || !profile.employees) return [];
  const [planningResult, cycleResult] = await Promise.allSettled([
    supabase
      .from("planning_entries")
      .select("*")
      .eq("employee_id", profile.employee_id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date"),
    supabase
      .from("cycle_repos")
      .select("semaine_cycle,jour_repos")
      .eq("employee_id", profile.employee_id),
  ]);
  if (planningResult.status === "rejected") throw planningResult.reason;
  if (planningResult.value.error) throw planningResult.value.error;

  const cycleDays = Array.from({ length: 5 }, () => "LUN");
  const cycleRows =
    cycleResult.status === "fulfilled" && !cycleResult.value.error
      ? cycleResult.value.data ?? []
      : [];

  cycleRows.forEach((row) => {
    const index = Number(row.semaine_cycle ?? 0) - 1;
    if (index >= 0 && index < 5) {
      cycleDays[index] = String(row.jour_repos ?? "LUN").toUpperCase();
    }
  });

  const byDate = new Map(
    buildBasePlanningEntries(profile, startDate, endDate, cycleDays).map((row) => [String(row.date ?? ""), row]),
  );
  (planningResult.value.data ?? []).forEach((row) => {
    const date = String(row.date ?? "");
    if (!date) return;
    const existing = byDate.get(date) ?? { date, employee_id: profile.employee_id };
    byDate.set(date, { ...existing, ...row });
  });
  const approvedAbsences = await getApprovedCollabAbsenceRows(profile.employee_id, startDate, endDate);

  approvedAbsences.forEach((row) => {
    const dates = listIsoDates(String(row.date_debut ?? ""), String(row.date_fin ?? row.date_debut ?? ""));
    const planningStatus = getPlanningStatusFromAbsenceType(row.type);
    dates
      .filter((date) => date >= startDate && date <= endDate)
      .forEach((date) => {
        const existing = byDate.get(date) ?? { date, employee_id: profile.employee_id };
        byDate.set(date, {
          ...existing,
          date,
          employee_id: profile.employee_id,
          statut: planningStatus,
          horaire_custom: null,
        });
      });
  });

  return Array.from(byDate.values()).sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
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
    .from("absences")
    .select("*")
    .eq("source", "collaborateur")
    .eq("employee_id", profile.employee_id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).sort((a, b) => {
    const left = b as Record<string, unknown>;
    const right = a as Record<string, unknown>;
    return String(left.created_at ?? left.updated_at ?? "").localeCompare(
      String(right.created_at ?? right.updated_at ?? ""),
    );
  });
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
  console.log("employee_id utilisé:", profile.employee_id);
  const { data, error } = await supabase
    .from("absences")
    .insert({
      ...payload,
      employee_id: profile.employee_id,
      source: "collaborateur",
      requested_by: profile.id,
      statut: "en_attente",
    })
    .select()
    .single();
  if (error) {
    console.log("erreur insert:", error);
    throw error;
  }
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
  return formatLocalIsoDate(date);
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
