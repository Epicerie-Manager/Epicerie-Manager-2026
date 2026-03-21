import { absenceRequests, type AbsenceRequest } from "@/lib/absences-data";

const ABSENCES_STORAGE_KEY = "epicerie-manager-absences-requests-v1";
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
