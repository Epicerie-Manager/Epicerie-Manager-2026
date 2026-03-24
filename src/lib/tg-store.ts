import {
  tgDefaultAssignments,
  tgRayons,
  tgWeeks,
  tgWeekPlans,
  type TgDefaultAssignment,
  type TgFamily,
  type TgRayon,
  type TgWeekPlanRow,
} from "@/lib/tg-data";
import { createClient } from "@/lib/supabase";

const TG_WEEK_PLANS_KEY = "epicerie-manager-tg-week-plans-v1";
const TG_RAYONS_KEY = "epicerie-manager-tg-rayons-v1";
const TG_DEFAULT_ASSIGNMENTS_KEY = "epicerie-manager-tg-default-assignments-v1";
const TG_CUSTOM_MECHANICS_KEY = "epicerie-manager-tg-custom-mechanics-v1";
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
  const nextRaw = JSON.stringify(rayons);
  const prevRaw = window.localStorage.getItem(TG_RAYONS_KEY);
  if (prevRaw === nextRaw) return;
  window.localStorage.setItem(TG_RAYONS_KEY, nextRaw);
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
  const nextRaw = JSON.stringify(assignments);
  const prevRaw = window.localStorage.getItem(TG_DEFAULT_ASSIGNMENTS_KEY);
  if (prevRaw === nextRaw) return;
  window.localStorage.setItem(TG_DEFAULT_ASSIGNMENTS_KEY, nextRaw);
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
  const nextRaw = JSON.stringify(plans);
  const prevRaw = window.localStorage.getItem(TG_WEEK_PLANS_KEY);
  if (prevRaw === nextRaw) return;
  window.localStorage.setItem(TG_WEEK_PLANS_KEY, nextRaw);
  emitTgUpdated();
}

export function loadTgCustomMechanics(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(TG_CUSTOM_MECHANICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveTgCustomMechanics(mechanics: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TG_CUSTOM_MECHANICS_KEY, JSON.stringify(mechanics));
}

function normalizeFamilyFromDb(value: string): TgFamily {
  const upper = String(value || "").toUpperCase();
  return upper.includes("SUCR") ? "Sucre" : "Sale";
}

function parseWeekNumber(value: string) {
  const match = String(value || "").toUpperCase().match(/S\s*([0-9]{1,2})|^([0-9]{1,2})\b/);
  if (!match) return null;
  const raw = match[1] ?? match[2];
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function getWeekIdFromDbLabel(label: string, semaineDe: string | null) {
  const weekNumber = parseWeekNumber(semaineDe || label);
  if (!weekNumber) return null;
  const prefix = String(weekNumber).padStart(2, "0");
  const match = tgWeeks.find((week) => week.id.startsWith(`${prefix} `));
  return match?.id ?? null;
}

export async function syncTgFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();

    const { data: plansRows, error: plansError } = await supabase
      .from("plans_tg")
      .select("id,label,semaine_de")
      .limit(2000);
    if (plansError) throw plansError;
    if (!plansRows || plansRows.length === 0) return false;

    const planMeta = new Map<
      string,
      { weekId: string; label: string }
    >();
    plansRows.forEach((row) => {
      const weekId = getWeekIdFromDbLabel(String(row.label ?? ""), row.semaine_de ?? null);
      if (!weekId) return;
      planMeta.set(String(row.id), { weekId, label: String(row.label ?? "") });
    });
    if (planMeta.size === 0) return false;

    const { data: entriesRows, error: entriesError } = await supabase
      .from("plans_tg_entries")
      .select("plan_id,rayon,famille,gb_produits,tg_responsable,tg_produit,tg_quantite,tg_mecanique")
      .limit(20000);
    if (entriesError) throw entriesError;
    if (!entriesRows || entriesRows.length === 0) return false;

    const base = clonePlans(tgWeekPlans);
    const byKey = new Map(base.map((row) => [`${row.weekId}__${row.rayon}`, row]));

    const assignmentMap = new Map<string, string>();

    entriesRows.forEach((row) => {
      const meta = planMeta.get(String(row.plan_id));
      if (!meta) return;
      const rayon = String(row.rayon ?? "").trim();
      if (!rayon) return;
      const key = `${meta.weekId}__${rayon}`;
      const family = normalizeFamilyFromDb(String(row.famille ?? ""));
      const tgResponsible = String(row.tg_responsable ?? "").trim();

      const mapped: TgWeekPlanRow = {
        weekId: meta.weekId,
        rayon,
        family,
        defaultResponsible: tgResponsible,
        gbProduct: String(row.gb_produits ?? "").trim(),
        tgResponsible,
        tgProduct: String(row.tg_produit ?? "").trim(),
        tgQuantity: String(row.tg_quantite ?? "").trim(),
        tgMechanic: String(row.tg_mecanique ?? "").trim(),
        hasOperation: Boolean(row.gb_produits || row.tg_produit || row.tg_quantite || row.tg_mecanique),
      };

      if (tgResponsible && !assignmentMap.has(rayon)) {
        assignmentMap.set(rayon, tgResponsible);
      }

      byKey.set(key, mapped);
    });

    const nextPlans = Array.from(byKey.values());
    const nextAssignments = cloneAssignments(tgDefaultAssignments).map((assignment) => ({
      ...assignment,
      employee: assignmentMap.get(assignment.rayon) ?? assignment.employee,
    }));

    window.localStorage.setItem(TG_WEEK_PLANS_KEY, JSON.stringify(nextPlans));
    window.localStorage.setItem(TG_DEFAULT_ASSIGNMENTS_KEY, JSON.stringify(nextAssignments));
    emitTgUpdated();
    return true;
  } catch {
    return false;
  }
}
