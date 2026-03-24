import { absenceRequests, type AbsenceRequest } from "@/lib/absences-data";
import { createClient } from "@/lib/supabase";

const ABSENCES_STORAGE_KEY = "epicerie-manager-absences-requests-v3";
const ABSENCES_UPDATED_EVENT = "epicerie-manager:absences-updated";

function isValidRequest(value: unknown): value is AbsenceRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
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
    return sanitized.length ? sanitized : absenceRequests;
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

function normalizeAbsenceStatus(value: unknown): AbsenceRequest["status"] {
  const status = String(value ?? "").toUpperCase();
  if (status.includes("REFUS")) return "REFUSE";
  if (status.includes("ATTENTE")) return "EN_ATTENTE";
  return "APPROUVE";
}

function employeeFromNote(note: unknown) {
  const txt = String(note ?? "");
  const match = txt.match(/^EMPLOYEE:([^|]+)(\||$)/i);
  if (!match) return null;
  return match[1].trim().toUpperCase();
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
    if (!Array.isArray(data) || data.length === 0) return false;

    const mapped = data
      .map((row: Record<string, unknown>, index) => {
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
          employee,
          type: String(row.type ?? row.absence_type ?? "AUTRE") as AbsenceRequest["type"],
          startDate,
          endDate,
          status: normalizeAbsenceStatus(row.statut ?? row.status),
        };
        if (row.note) next.note = String(row.note);
        return next;
      })
      .filter((row): row is AbsenceRequest => row !== null);

    if (mapped.length === 0) return false;
    window.localStorage.setItem(ABSENCES_STORAGE_KEY, JSON.stringify(mapped));
    window.dispatchEvent(new Event(ABSENCES_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
