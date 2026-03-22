import {
  tgDefaultAssignments,
  tgRayons,
  tgWeekPlans,
  type TgDefaultAssignment,
  type TgRayon,
  type TgWeekPlanRow,
} from "@/lib/tg-data";

const TG_WEEK_PLANS_KEY = "epicerie-manager-tg-week-plans-v1";
const TG_RAYONS_KEY = "epicerie-manager-tg-rayons-v1";
const TG_DEFAULT_ASSIGNMENTS_KEY = "epicerie-manager-tg-default-assignments-v1";
const TG_UPDATED_EVENT = "epicerie-manager:tg-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clonePlans(plans: TgWeekPlanRow[]): TgWeekPlanRow[] {
  return plans.map((row) => ({ ...row }));
}

function cloneRayons(rayons: TgRayon[]): TgRayon[] {
  return rayons.map((row) => ({ ...row }));
}

function cloneAssignments(assignments: TgDefaultAssignment[]): TgDefaultAssignment[] {
  return assignments.map((row) => ({ ...row }));
}

function isWeekPlanRow(value: unknown): value is TgWeekPlanRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.weekId === "string" &&
    typeof row.rayon === "string" &&
    (row.family === "Sale" || row.family === "Sucre") &&
    typeof row.defaultResponsible === "string" &&
    typeof row.gbProduct === "string" &&
    typeof row.tgResponsible === "string" &&
    typeof row.tgProduct === "string" &&
    typeof row.tgQuantity === "string" &&
    typeof row.tgMechanic === "string" &&
    typeof row.hasOperation === "boolean"
  );
}

function isRayonRow(value: unknown): value is TgRayon {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.rayon === "string" &&
    (row.family === "Sale" || row.family === "Sucre") &&
    typeof row.order === "string" &&
    typeof row.active === "boolean"
  );
}

function isAssignmentRow(value: unknown): value is TgDefaultAssignment {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.employee === "string" && typeof row.rayon === "string";
}

export function getTgUpdatedEventName() {
  return TG_UPDATED_EVENT;
}

function emitTgUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TG_UPDATED_EVENT));
}

export function loadTgRayons(): TgRayon[] {
  if (!canUseStorage()) return cloneRayons(tgRayons);
  try {
    const raw = window.localStorage.getItem(TG_RAYONS_KEY);
    if (!raw) return cloneRayons(tgRayons);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneRayons(tgRayons);
    const sanitized = parsed.filter(isRayonRow);
    return sanitized.length ? sanitized : cloneRayons(tgRayons);
  } catch {
    return cloneRayons(tgRayons);
  }
}

export function saveTgRayons(rayons: TgRayon[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TG_RAYONS_KEY, JSON.stringify(rayons));
  emitTgUpdated();
}

export function loadTgDefaultAssignments(): TgDefaultAssignment[] {
  if (!canUseStorage()) return cloneAssignments(tgDefaultAssignments);
  try {
    const raw = window.localStorage.getItem(TG_DEFAULT_ASSIGNMENTS_KEY);
    if (!raw) return cloneAssignments(tgDefaultAssignments);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneAssignments(tgDefaultAssignments);
    const sanitized = parsed.filter(isAssignmentRow);
    return sanitized.length ? sanitized : cloneAssignments(tgDefaultAssignments);
  } catch {
    return cloneAssignments(tgDefaultAssignments);
  }
}

export function saveTgDefaultAssignments(assignments: TgDefaultAssignment[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TG_DEFAULT_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  emitTgUpdated();
}

export function loadTgWeekPlans(): TgWeekPlanRow[] {
  if (!canUseStorage()) return clonePlans(tgWeekPlans);
  try {
    const raw = window.localStorage.getItem(TG_WEEK_PLANS_KEY);
    if (!raw) return clonePlans(tgWeekPlans);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return clonePlans(tgWeekPlans);
    const sanitized = parsed.filter(isWeekPlanRow);
    return sanitized.length ? sanitized : clonePlans(tgWeekPlans);
  } catch {
    return clonePlans(tgWeekPlans);
  }
}

export function saveTgWeekPlans(plans: TgWeekPlanRow[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TG_WEEK_PLANS_KEY, JSON.stringify(plans));
  emitTgUpdated();
}
