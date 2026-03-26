import { absenceRequests, type AbsenceRequest } from "@/lib/absences-data";
import { loadPlanningOverrides, savePlanningOverridesToSupabase, type PlanningOverrides } from "@/lib/planning-store";
import { loadRhEmployees } from "@/lib/rh-store";
import { createClient } from "@/lib/supabase";

const ABSENCES_STORAGE_KEY = "epicerie-manager-absences-requests-v3";
const ABSENCES_UPDATED_EVENT = "epicerie-manager:absences-updated";

function isValidRequest(value: unknown): value is AbsenceRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    (candidate.dbId === undefined || typeof candidate.dbId === "string") &&
    typeof candidate.employee === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.startDate === "string" &&
    typeof candidate.endDate === "string" &&
    typeof candidate.status === "string"
  );
}

export function loadAbsenceRequests(): AbsenceRequest[] {
  if (typeof window === "undefined") {
    return absenceRequests;
  }

  const raw = window.localStorage.getItem(ABSENCES_STORAGE_KEY);
  if (!raw) {
    return absenceRequests;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return absenceRequests;
    }
    const sanitized = parsed.filter(isValidRequest);
    return sanitized.length || parsed.length === 0 ? sanitized : absenceRequests;
  } catch {
    return absenceRequests;
  }
}

export function saveAbsenceRequests(requests: AbsenceRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABSENCES_STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(ABSENCES_UPDATED_EVENT));
}

export function getAbsencesUpdatedEventName() {
  return ABSENCES_UPDATED_EVENT;
}

function emitAbsencesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ABSENCES_UPDATED_EVENT));
}

function normalizeAbsenceStatus(value: unknown): AbsenceRequest["status"] {
  const status = String(value ?? "").toUpperCase();
  if (status.includes("REFUS")) return "REFUSE";
  if (status.includes("ATTENTE")) return "EN_ATTENTE";
  return "APPROUVE";
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
  return new Error(rawMessage || "Erreur Supabase inconnue.");
}

function employeeFromNote(note: unknown) {
  const txt = String(note ?? "");
  const match = txt.match(/^EMPLOYEE:([^|]+)(\||$)/i);
  if (!match) return null;
  return match[1].trim().toUpperCase();
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function listAbsenceDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (current <= end) {
    if (current.getDay() !== 0) {
      dates.push(formatIsoDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getPlanningStatusFromAbsenceType(type: AbsenceRequest["type"]) {
  if (type === "CP") return "CP";
  if (type === "MAL") return "MAL";
  if (type === "CONGE_MAT") return "CONGE_MAT";
  if (type === "FORM") return "FORM";
  if (type === "FERIE") return "FERIE";
  return "X";
}

function getTargetEmployees(absence: AbsenceRequest) {
  if (absence.employee !== "TOUS") return [absence.employee.trim().toUpperCase()];
  return loadRhEmployees()
    .filter((employee) => employee.actif)
    .map((employee) => employee.n.trim().toUpperCase());
}

async function getEmployeeIdByName() {
  const supabase = createClient();
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id,name")
    .limit(5000);
  if (error) throw error;

  return new Map(
    (employees ?? []).map((employee) => [
      String((employee as Record<string, unknown>).name ?? "").toUpperCase(),
      String((employee as Record<string, unknown>).id),
    ]),
  );
}

function mapRowToAbsenceRequest(
  row: Record<string, unknown>,
  index: number,
  employeeNameById: Map<string, string>,
): AbsenceRequest | null {
  const startDate = String(row.date_debut ?? row.start_date ?? row.date_from ?? row.startDate ?? "");
  const endDate = String(row.date_fin ?? row.end_date ?? row.date_to ?? row.endDate ?? startDate);
  if (!startDate || !endDate) return null;
  const employeeId = row.employee_id ? String(row.employee_id) : "";
  const fallbackEmployee = employeeFromNote(row.note);
  const employee =
    employeeNameById.get(employeeId) ??
    String(row.employee_name ?? row.employee ?? row.name ?? fallbackEmployee ?? "").toUpperCase();
  if (!employee) return null;
  const next: AbsenceRequest = {
    id: index + 1,
    dbId: row.id ? String(row.id) : undefined,
    employee,
    type: String(row.type ?? row.absence_type ?? "AUTRE") as AbsenceRequest["type"],
    startDate,
    endDate,
    status: normalizeAbsenceStatus(row.statut ?? row.status),
  };
  if (row.note) next.note = String(row.note);
  return next;
}

export async function createAbsenceRequestInSupabase(
  input: Omit<AbsenceRequest, "id" | "dbId" | "status"> & { status?: AbsenceRequest["status"] },
) {
  try {
    const supabase = createClient();
    const employeeIdByName = await getEmployeeIdByName();
    const normalizedEmployee = input.employee.trim().toUpperCase();
    const employeeId = employeeIdByName.get(normalizedEmployee) ?? null;
    const note = employeeId
      ? (input.note?.trim() || null)
      : `EMPLOYEE:${normalizedEmployee}${input.note?.trim() ? ` | ${input.note.trim()}` : ""}`;

    const { data, error } = await supabase
      .from("absences")
      .insert({
        employee_id: employeeId,
        type: input.type,
        date_debut: input.startDate,
        date_fin: input.endDate,
        statut: input.status ?? "EN_ATTENTE",
        note,
      })
      .select("*")
      .single();
    if (error) throw error;

    const employeeNameById = new Map<string, string>();
    for (const [name, id] of employeeIdByName.entries()) {
      employeeNameById.set(id, name);
    }
    const mapped = mapRowToAbsenceRequest(data as Record<string, unknown>, 0, employeeNameById);
    if (!mapped) throw new Error("Impossible de relire la demande créée.");
    emitAbsencesUpdated();
    return mapped;
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function updateAbsenceStatusInSupabase(dbId: string, status: AbsenceRequest["status"]) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("absences")
      .update({ statut: status })
      .eq("id", dbId);
    if (error) throw error;
    emitAbsencesUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function applyApprovedAbsenceToPlanning(absence: AbsenceRequest) {
  if (typeof window === "undefined") return;

  const targetEmployees = getTargetEmployees(absence);
  const targetDates = listAbsenceDates(absence.startDate, absence.endDate);
  if (!targetEmployees.length || !targetDates.length) return;

  try {
    const supabase = createClient();
    const employeeIdByName = await getEmployeeIdByName();
    const employeeIds = targetEmployees
      .map((employeeName) => employeeIdByName.get(employeeName))
      .filter((value): value is string => Boolean(value));
    if (!employeeIds.length) return;

    const planningStatus = getPlanningStatusFromAbsenceType(absence.type);
    const nextOverrides: PlanningOverrides = { ...loadPlanningOverrides() };
    const mutations: {
      employeeName: string;
      date: string;
      status: string;
      horaire: string | null;
    }[] = [];

    const { data: existingRows, error: existingError } = await supabase
      .from("planning_entries")
      .select("employee_id,date")
      .in("employee_id", employeeIds)
      .gte("date", targetDates[0])
      .lte("date", targetDates[targetDates.length - 1])
      .limit(5000);
    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existingRows ?? []).map((row) => `${String(row.employee_id)}_${String(row.date)}`),
    );

    targetEmployees.forEach((employeeName) => {
      const employeeId = employeeIdByName.get(employeeName);
      if (!employeeId) return;
      targetDates.forEach((date) => {
        const existingKey = `${employeeId}_${date}`;
        if (existingKeys.has(existingKey)) return;
        const key = `${employeeName}_${date}`;
        nextOverrides[key] = { s: planningStatus, h: null };
        mutations.push({
          employeeName,
          date,
          status: planningStatus,
          horaire: null,
        });
      });
    });

    if (!mutations.length) return;
    await savePlanningOverridesToSupabase(mutations, nextOverrides);
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function deleteAbsenceRequestInSupabase(dbId: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("absences")
      .delete()
      .eq("id", dbId);
    if (error) throw error;
    emitAbsencesUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function syncAbsencesFromSupabase() {
  if (typeof window === "undefined") return false;

  try {
    const supabase = createClient();
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id,name")
      .limit(5000);
    if (employeesError) throw employeesError;
    const employeeNameById = new Map(
      (employees ?? []).map((employee) => [
        String((employee as Record<string, unknown>).id),
        String((employee as Record<string, unknown>).name ?? "").toUpperCase(),
      ]),
    );

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .limit(5000);
    if (error) throw error;
    if (!Array.isArray(data)) return false;

    const mapped = data
      .map((row: Record<string, unknown>, index) => mapRowToAbsenceRequest(row, index, employeeNameById))
      .filter((row): row is AbsenceRequest => row !== null);

    window.localStorage.setItem(ABSENCES_STORAGE_KEY, JSON.stringify(mapped));
    emitAbsencesUpdated();
    return Array.isArray(data);
  } catch {
    return false;
  }
}
