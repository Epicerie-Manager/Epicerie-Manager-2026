import type { AbsenceRequest } from "@/lib/absences-data";
import {
  formatPlanningDate,
  getPlanningStatus,
  planningEmployees,
  type PlanningEmployee,
  type PlanningOverrides,
} from "@/lib/planning-store";

export type PlanningPresenceCounts = {
  morningCount: number;
  afternoonCount: number;
  absentCount: number;
  scheduledCount: number;
};

const NON_COUNTED_PRESENCE_EMPLOYEE_NAMES = new Set(["ABDOU"]);

export function isPlanningEmployeeCountedForPresence(
  employee: Pick<PlanningEmployee, "n">,
) {
  const normalizedName = String(employee.n ?? "").trim().toUpperCase();
  return !NON_COUNTED_PRESENCE_EMPLOYEE_NAMES.has(normalizedName);
}

export function getPlanningHoraireForDate(
  employee: Pick<PlanningEmployee, "n" | "t" | "hs" | "hm" | "hsa">,
  date: Date,
  overrides: PlanningOverrides,
) {
  const key = `${employee.n}_${formatPlanningDate(date)}`;
  const override = overrides[key];
  if (override?.h) return override.h;
  const dow = date.getDay();
  if (dow === 2) return employee.hm;
  if (dow === 6 && employee.t === "E") return employee.hsa ?? "14h-21h30";
  return employee.hs;
}

export function getPlanningShiftBuckets(horaire: string | null) {
  let morning = false;
  let afternoon = false;

  String(horaire ?? "")
    .split("/")
    .map((slot) => slot.trim())
    .filter(Boolean)
    .forEach((slot) => {
      const match = slot.match(/(\d{1,2})\s*h/i);
      if (!match) return;
      const startHour = Number(match[1]);
      if (Number.isNaN(startHour)) return;
      if (startHour < 12) morning = true;
      else afternoon = true;
    });

  return { morning, afternoon };
}

function isApprovedAbsenceForEmployee(
  absence: Pick<AbsenceRequest, "employee" | "startDate" | "endDate" | "status">,
  employeeName: string,
  dayIso: string,
) {
  if (absence.status !== "approuve") return false;
  if (absence.startDate > dayIso || absence.endDate < dayIso) return false;
  const normalizedEmployee = String(absence.employee ?? "").trim().toUpperCase();
  return normalizedEmployee === "TOUS" || normalizedEmployee === employeeName;
}

export function getPlanningPresenceCountsForDate(
  date: Date,
  overrides: PlanningOverrides,
  approvedAbsences: readonly Pick<AbsenceRequest, "employee" | "startDate" | "endDate" | "status">[] = [],
  employees: readonly PlanningEmployee[] = planningEmployees,
): PlanningPresenceCounts {
  const dayIso = formatPlanningDate(date);

  return employees.reduce<PlanningPresenceCounts>(
    (counts, employee) => {
      if (!isPlanningEmployeeCountedForPresence(employee)) return counts;

      const status = getPlanningStatus(employee, date, overrides);
      if (status !== "PRESENT") return counts;

      const horaire = getPlanningHoraireForDate(employee, date, overrides);
      const shifts = getPlanningShiftBuckets(horaire);
      if (!shifts.morning && !shifts.afternoon) return counts;

      counts.scheduledCount += 1;
      const absent = approvedAbsences.some((absence) =>
        isApprovedAbsenceForEmployee(absence, employee.n, dayIso),
      );
      if (absent) {
        counts.absentCount += 1;
        return counts;
      }

      if (shifts.morning) counts.morningCount += 1;
      if (shifts.afternoon) counts.afternoonCount += 1;
      return counts;
    },
    { morningCount: 0, afternoonCount: 0, absentCount: 0, scheduledCount: 0 },
  );
}
