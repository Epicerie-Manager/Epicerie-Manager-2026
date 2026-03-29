import type { AbsenceRequest } from "@/lib/absences-data";
import { getPlanningMonthKey, syncPlanningFromSupabase } from "@/lib/planning-store";
import { createClient } from "@/lib/supabase";

const ABSENCES_STORAGE_KEY = "epicerie-manager-absences-requests-v3";
const ABSENCES_UPDATED_EVENT = "epicerie-manager:absences-updated";
const PLANNING_SOURCE_MARKER = "SOURCE:PLANNING";
let absenceRequestsSnapshot: AbsenceRequest[] = [];
let didPurgeLegacyAbsencesStorage = false;
const ABSENCE_SOURCE_ABSENCES = "absences";
const ABSENCE_SOURCE_REQUESTS = "absence_requests";

function canUseBrowserWindow() {
  return typeof window !== "undefined";
}

function cloneRequests(requests: AbsenceRequest[]) {
  return requests.map((request) => ({ ...request }));
}

function purgeLegacyAbsencesStorageKey() {
  if (!canUseBrowserWindow() || didPurgeLegacyAbsencesStorage) return;
  if (typeof window.localStorage !== "undefined") {
    window.localStorage.removeItem(ABSENCES_STORAGE_KEY);
  }
  didPurgeLegacyAbsencesStorage = true;
}

function replaceAbsenceRequestsSnapshot(requests: AbsenceRequest[]) {
  absenceRequestsSnapshot = cloneRequests(requests);
}

function upsertAbsenceRequestSnapshot(request: AbsenceRequest) {
  const nextRequests = cloneRequests(absenceRequestsSnapshot);
  const requestKey = request.dbId ? `db:${request.dbId}` : `local:${request.employee}:${request.startDate}:${request.endDate}:${request.type}`;
  const index = nextRequests.findIndex((item) => {
    const itemKey = item.dbId ? `db:${item.dbId}` : `local:${item.employee}:${item.startDate}:${item.endDate}:${item.type}`;
    return itemKey === requestKey;
  });
  if (index === -1) {
    nextRequests.push({ ...request });
  } else {
    nextRequests[index] = { ...request };
  }
  replaceAbsenceRequestsSnapshot(nextRequests);
}

function removeAbsenceRequestSnapshot(dbId: string) {
  replaceAbsenceRequestsSnapshot(
    absenceRequestsSnapshot.filter((request) => String(request.dbId ?? "") !== dbId),
  );
}

export function loadAbsenceRequests(): AbsenceRequest[] {
  purgeLegacyAbsencesStorageKey();
  return cloneRequests(absenceRequestsSnapshot);
}

export function getAbsencesUpdatedEventName() {
  return ABSENCES_UPDATED_EVENT;
}

function emitAbsencesUpdated() {
  if (!canUseBrowserWindow()) return;
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

function getPlanningMonthKeyForDate(date: string) {
  return getPlanningMonthKey(new Date(`${date}T00:00:00`));
}

function getAbsenceTypeFromPlanningStatus(status: string): AbsenceRequest["type"] | null {
  const upper = String(status ?? "").toUpperCase().trim();
  if (upper === "CP") return "CP";
  if (upper === "MAL") return "MAL";
  if (upper === "CONGE_MAT") return "CONGE_MAT";
  if (upper === "FORM") return "FORM";
  if (upper === "FERIE") return "FERIE";
  if (upper === "ABS" || upper === "X") return "AUTRE";
  return null;
}

function buildPlanningSourceNote(employeeName: string) {
  return `EMPLOYEE:${employeeName.trim().toUpperCase()} | ${PLANNING_SOURCE_MARKER}`;
}

function getSyncedPlanningNote(employeeName: string, existingNote: unknown) {
  const note = String(existingNote ?? "").trim();
  if (note && !note.startsWith("EMPLOYEE:") && !note.toUpperCase().includes(PLANNING_SOURCE_MARKER)) {
    return note;
  }
  return buildPlanningSourceNote(employeeName);
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
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
  sourceTable: typeof ABSENCE_SOURCE_ABSENCES | typeof ABSENCE_SOURCE_REQUESTS = ABSENCE_SOURCE_ABSENCES,
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
    dbId: row.id ? `${sourceTable}:${String(row.id)}` : undefined,
    employee,
    type: String(row.type ?? row.absence_type ?? "AUTRE") as AbsenceRequest["type"],
    startDate,
    endDate,
    status: normalizeAbsenceStatus(row.statut ?? row.status),
  };
  if (row.note) next.note = String(row.note);
  return next;
}

function parseAbsenceDbId(dbId: string) {
  const [table, ...rest] = String(dbId ?? "").split(":");
  if ((table === ABSENCE_SOURCE_ABSENCES || table === ABSENCE_SOURCE_REQUESTS) && rest.length > 0) {
    return { table: table as typeof ABSENCE_SOURCE_ABSENCES | typeof ABSENCE_SOURCE_REQUESTS, id: rest.join(":") };
  }
  return { table: ABSENCE_SOURCE_ABSENCES as typeof ABSENCE_SOURCE_ABSENCES | typeof ABSENCE_SOURCE_REQUESTS, id: String(dbId ?? "") };
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
    const mapped = mapRowToAbsenceRequest(data as Record<string, unknown>, 0, employeeNameById, ABSENCE_SOURCE_ABSENCES);
    if (!mapped) throw new Error("Impossible de relire la demande créée.");
    upsertAbsenceRequestSnapshot(mapped);
    emitAbsencesUpdated();
    return mapped;
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function updateAbsenceStatusInSupabase(dbId: string, status: AbsenceRequest["status"]) {
  try {
    const supabase = createClient();
    const { table, id } = parseAbsenceDbId(dbId);
    const employeeIdByName = await getEmployeeIdByName();
    const employeeNameById = new Map<string, string>();
    for (const [name, id] of employeeIdByName.entries()) {
      employeeNameById.set(id, name);
    }

    const { data, error } = await supabase
      .from(table)
      .update({ statut: status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const mapped = mapRowToAbsenceRequest(data as Record<string, unknown>, 0, employeeNameById, table);
    if (!mapped) throw new Error("Impossible de relire la demande mise à jour.");
    upsertAbsenceRequestSnapshot(mapped);
    emitAbsencesUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function syncPlanningFromAbsenceRequest(absence: Pick<AbsenceRequest, "startDate">) {
  if (!canUseBrowserWindow()) return false;
  return syncPlanningFromSupabase(getPlanningMonthKeyForDate(absence.startDate));
}

export async function applyApprovedAbsenceToPlanning(absence: AbsenceRequest) {
  return syncPlanningFromAbsenceRequest(absence);
}

export async function syncPlanningStatusToAbsenceInSupabase(input: {
  employeeName: string;
  date: string;
  status: string;
}) {
  try {
    const supabase = createClient();
    const employeeIdByName = await getEmployeeIdByName();
    const normalizedEmployee = input.employeeName.trim().toUpperCase();
    const employeeId = employeeIdByName.get(normalizedEmployee) ?? null;
    const absenceType = getAbsenceTypeFromPlanningStatus(input.status);

    let existingRowsQuery = supabase
      .from("absences")
      .select("id,note")
      .eq("date_debut", input.date)
      .eq("date_fin", input.date)
      .eq("statut", "APPROUVE");

    if (employeeId) {
      existingRowsQuery = existingRowsQuery.eq("employee_id", employeeId);
    } else {
      existingRowsQuery = existingRowsQuery
        .is("employee_id", null)
        .ilike("note", `EMPLOYEE:${normalizedEmployee}%`);
    }

    const { data: existingRows, error: existingError } = await existingRowsQuery.limit(50);
    if (existingError) throw existingError;
    let didChangeAbsence = false;

    if (absenceType) {
      const primaryRow = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
      const payload = {
        employee_id: employeeId,
        type: absenceType,
        date_debut: input.date,
        date_fin: input.date,
        statut: "APPROUVE",
        note: getSyncedPlanningNote(normalizedEmployee, primaryRow?.note),
      };

      if (primaryRow?.id) {
        const { error: updateError } = await supabase
          .from("absences")
          .update(payload)
          .eq("id", primaryRow.id);
        if (updateError) throw updateError;
        didChangeAbsence = true;

        const duplicateIds = (existingRows ?? [])
          .slice(1)
          .map((row) => String((row as { id?: unknown }).id ?? ""))
          .filter(Boolean);
        if (duplicateIds.length) {
          const { error: deleteDuplicatesError } = await supabase
            .from("absences")
            .delete()
            .in("id", duplicateIds);
          if (deleteDuplicatesError) throw deleteDuplicatesError;
          didChangeAbsence = true;
        }
      } else {
        const { error: insertError } = await supabase.from("absences").insert(payload);
        if (insertError) throw insertError;
        didChangeAbsence = true;
      }
    } else {
      const idsToDelete = (existingRows ?? [])
        .map((row) => String((row as { id?: unknown }).id ?? ""))
        .filter(Boolean);
      if (idsToDelete.length) {
        const { error: deleteError } = await supabase
          .from("absences")
          .delete()
          .in("id", idsToDelete);
        if (deleteError) throw deleteError;
        didChangeAbsence = true;
      }
    }

    if (!didChangeAbsence) return;
    await syncAbsencesFromSupabase();
    await syncPlanningFromSupabase(getPlanningMonthKeyForDate(input.date));
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function deleteAbsenceRequestInSupabase(dbId: string) {
  try {
    const supabase = createClient();
    const { table, id } = parseAbsenceDbId(dbId);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);
    if (error) throw error;
    removeAbsenceRequestSnapshot(dbId);
    emitAbsencesUpdated();
  } catch (error) {
    throw normalizeActionError(error);
  }
}

export async function syncAbsencesFromSupabase() {
  if (!canUseBrowserWindow()) return false;
  purgeLegacyAbsencesStorageKey();

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

    const absencesRows = await fetchAllRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("absences")
        .select("*")
        .range(from, to),
    );
    const requestRows = await fetchAllRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("absence_requests")
        .select("*")
        .range(from, to),
    );
    if (!Array.isArray(absencesRows) || !Array.isArray(requestRows)) return false;

    const mapped = [
      ...absencesRows.map((row: Record<string, unknown>, index) =>
        mapRowToAbsenceRequest(row, index, employeeNameById, ABSENCE_SOURCE_ABSENCES),
      ),
      ...requestRows.map((row: Record<string, unknown>, index) =>
        mapRowToAbsenceRequest(row, absencesRows.length + index, employeeNameById, ABSENCE_SOURCE_REQUESTS),
      ),
    ]
      .filter((row): row is AbsenceRequest => row !== null);

    replaceAbsenceRequestsSnapshot(mapped);
    emitAbsencesUpdated();
    return true;
  } catch {
    return false;
  }
}
