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
import { hasBrowserWindow, purgeLegacyCacheKeys } from "@/lib/browser-cache";
import { loadRhEmployees, type RhEmployee } from "@/lib/rh-store";
import { createClient } from "@/lib/supabase";

const TG_WEEK_PLANS_KEY = "epicerie-manager-tg-week-plans-v1";
const TG_RAYONS_KEY = "epicerie-manager-tg-rayons-v1";
const TG_DEFAULT_ASSIGNMENTS_KEY = "epicerie-manager-tg-default-assignments-v1";
const TG_CUSTOM_MECHANICS_KEY = "epicerie-manager-tg-custom-mechanics-v1";
const TG_UPDATED_EVENT = "epicerie-manager:tg-updated";

let tgRayonsSnapshot = cloneRayons(tgRayons);
let tgRayonsSerialized = JSON.stringify(tgRayonsSnapshot);
let tgAssignmentsSnapshot = cloneAssignments(tgDefaultAssignments);
let tgAssignmentsSerialized = JSON.stringify(tgAssignmentsSnapshot);
let tgWeekPlansSnapshot = clonePlans(tgWeekPlans);
let tgWeekPlansSerialized = JSON.stringify(tgWeekPlansSnapshot);
let tgCustomMechanicsSnapshot: string[] = [];
let tgCustomMechanicsSerialized = JSON.stringify(tgCustomMechanicsSnapshot);

function canUseStorage() {
  return hasBrowserWindow();
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

function buildAssignmentsFromRhEmployees(employees: RhEmployee[]) {
  const flattened = employees.flatMap((employee) =>
    (employee.rayons ?? []).map((rayon) => ({
      employee: employee.n,
      rayon,
    })),
  );
  const byRayon = new Map<string, string>();
  flattened.forEach((assignment) => {
    if (!assignment.rayon || byRayon.has(assignment.rayon)) return;
    byRayon.set(assignment.rayon, assignment.employee);
  });
  return Array.from(byRayon.entries()).map(([rayon, employee]) => ({ rayon, employee }));
}

function loadCanonicalTgDefaultAssignments() {
  const rhAssignments = buildAssignmentsFromRhEmployees(loadRhEmployees());
  if (!rhAssignments.length) return cloneAssignments(tgAssignmentsSnapshot);

  const rhRayons = new Set(rhAssignments.map((assignment) => assignment.rayon));
  const fallbackAssignments = cloneAssignments(tgAssignmentsSnapshot).filter(
    (assignment) => !rhRayons.has(assignment.rayon),
  );
  return [...rhAssignments, ...fallbackAssignments];
}

function replaceTgRayonsSnapshot(rayons: TgRayon[]) {
  const nextRayons = cloneRayons(rayons);
  const serialized = JSON.stringify(nextRayons);
  if (serialized === tgRayonsSerialized) return false;
  tgRayonsSnapshot = nextRayons;
  tgRayonsSerialized = serialized;
  return true;
}

function replaceTgAssignmentsSnapshot(assignments: TgDefaultAssignment[]) {
  const nextAssignments = cloneAssignments(assignments);
  const serialized = JSON.stringify(nextAssignments);
  if (serialized === tgAssignmentsSerialized) return false;
  tgAssignmentsSnapshot = nextAssignments;
  tgAssignmentsSerialized = serialized;
  return true;
}

function replaceTgWeekPlansSnapshot(plans: TgWeekPlanRow[]) {
  const nextPlans = clonePlans(plans);
  const serialized = JSON.stringify(nextPlans);
  if (serialized === tgWeekPlansSerialized) return false;
  tgWeekPlansSnapshot = nextPlans;
  tgWeekPlansSerialized = serialized;
  return true;
}

function replaceTgCustomMechanicsSnapshot(mechanics: string[]) {
  const nextMechanics = [...mechanics];
  const serialized = JSON.stringify(nextMechanics);
  if (serialized === tgCustomMechanicsSerialized) return false;
  tgCustomMechanicsSnapshot = nextMechanics;
  tgCustomMechanicsSerialized = serialized;
  return true;
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
    purgeLegacyCacheKeys([TG_RAYONS_KEY]);
    return cloneRayons(tgRayonsSnapshot);
  } catch {
    return cloneRayons(tgRayons);
  }
}

export function saveTgRayons(rayons: TgRayon[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgRayonsSnapshot(rayons);
  if (changed) emitTgUpdated();
}

export function loadTgDefaultAssignments(): TgDefaultAssignment[] {
  if (!canUseStorage()) return cloneAssignments(tgDefaultAssignments);
  try {
    purgeLegacyCacheKeys([TG_DEFAULT_ASSIGNMENTS_KEY]);
    return cloneAssignments(loadCanonicalTgDefaultAssignments());
  } catch {
    return cloneAssignments(tgDefaultAssignments);
  }
}

export function saveTgDefaultAssignments(assignments: TgDefaultAssignment[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgAssignmentsSnapshot(assignments);
  if (changed) emitTgUpdated();
}

export function loadTgWeekPlans(): TgWeekPlanRow[] {
  if (!canUseStorage()) return clonePlans(tgWeekPlans);
  try {
    purgeLegacyCacheKeys([TG_WEEK_PLANS_KEY]);
    return clonePlans(tgWeekPlansSnapshot);
  } catch {
    return clonePlans(tgWeekPlans);
  }
}

export function saveTgWeekPlans(plans: TgWeekPlanRow[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgWeekPlansSnapshot(plans);
  if (changed) emitTgUpdated();
}

export function loadTgCustomMechanics(): string[] {
  if (!canUseStorage()) return [];
  try {
    purgeLegacyCacheKeys([TG_CUSTOM_MECHANICS_KEY]);
    return [...tgCustomMechanicsSnapshot];
  } catch {
    return [];
  }
}

export function saveTgCustomMechanics(mechanics: string[]) {
  if (!canUseStorage()) return;
  replaceTgCustomMechanicsSnapshot(mechanics);
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

function normalizeWeekKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getWeekIdFromDbLabel(label: string, semaineDe: string | null) {
  const normalizedLabel = normalizeWeekKey(label);
  const exact = tgWeeks.find((week) => normalizeWeekKey(week.id) === normalizedLabel);
  if (exact) return exact.id;

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

    const canonicalAssignments = loadCanonicalTgDefaultAssignments();
    const assignmentMap = new Map(canonicalAssignments.map((assignment) => [assignment.rayon, assignment.employee]));

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
        defaultResponsible: assignmentMap.get(rayon) ?? "",
        gbProduct: String(row.gb_produits ?? "").trim(),
        tgResponsible,
        tgProduct: String(row.tg_produit ?? "").trim(),
        tgQuantity: String(row.tg_quantite ?? "").trim(),
        tgMechanic: String(row.tg_mecanique ?? "").trim(),
        hasOperation: Boolean(row.gb_produits || row.tg_produit || row.tg_quantite || row.tg_mecanique),
      };

      byKey.set(key, mapped);
    });

    const nextPlans = Array.from(byKey.values());
    const nextAssignments = canonicalAssignments;

    const plansChanged = replaceTgWeekPlansSnapshot(nextPlans);
    const assignmentsChanged = replaceTgAssignmentsSnapshot(nextAssignments);
    if (plansChanged || assignmentsChanged) {
      emitTgUpdated();
    }
    return plansChanged || assignmentsChanged;
  } catch {
    return false;
  }
}
