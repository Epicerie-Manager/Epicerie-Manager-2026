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
import { hasBrowserWindow } from "@/lib/browser-cache";
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

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

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

function writeLocalStorage(key: string, serialized: string) {
  if (!canUseBrowserStorage()) return;
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // Ignore local storage quota/security failures and keep in-memory snapshot.
  }
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persistTgRayonsSnapshot() {
  writeLocalStorage(TG_RAYONS_KEY, tgRayonsSerialized);
}

function persistTgAssignmentsSnapshot() {
  writeLocalStorage(TG_DEFAULT_ASSIGNMENTS_KEY, tgAssignmentsSerialized);
}

function persistTgWeekPlansSnapshot() {
  writeLocalStorage(TG_WEEK_PLANS_KEY, tgWeekPlansSerialized);
}

function persistTgCustomMechanicsSnapshot() {
  writeLocalStorage(TG_CUSTOM_MECHANICS_KEY, tgCustomMechanicsSerialized);
}

function parseWeekNumber(value: string) {
  const match = String(value || "").toUpperCase().match(/S\s*([0-9]{1,2})|^([0-9]{1,2})\b/);
  if (!match) return null;
  const raw = match[1] ?? match[2];
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function getIsoWeekStartDate(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 4));
  const day = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - day + 1 + (week - 1) * 7);
  return simple;
}

function formatIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRecord(weekId: string) {
  return tgWeeks.find((week) => week.id === weekId) ?? null;
}

function buildPlanPayload(weekId: string) {
  const weekRecord = getWeekRecord(weekId);
  const weekNumber = parseWeekNumber(weekId);
  const yearSuffix = weekId.match(/(\d{2})$/)?.[1];
  const year = yearSuffix ? 2000 + Number(yearSuffix) : new Date().getFullYear();
  const startDate = weekNumber ? getIsoWeekStartDate(year, weekNumber) : null;
  const endDate = startDate ? new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000) : null;

  return {
    label: weekRecord?.label ?? weekId,
    semaine_de: weekNumber ? `S${String(weekNumber).padStart(2, "0")}` : null,
    semaine_a: weekNumber ? `S${String(weekNumber).padStart(2, "0")}` : null,
    date_de: startDate ? formatIsoDate(startDate) : null,
    date_a: endDate ? formatIsoDate(endDate) : null,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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
    replaceTgRayonsSnapshot(readLocalStorage(TG_RAYONS_KEY, tgRayonsSnapshot));
    return cloneRayons(tgRayonsSnapshot);
  } catch {
    return cloneRayons(tgRayons);
  }
}

export function saveTgRayons(rayons: TgRayon[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgRayonsSnapshot(rayons);
  if (changed) {
    persistTgRayonsSnapshot();
    emitTgUpdated();
  }
}

export function loadTgDefaultAssignments(): TgDefaultAssignment[] {
  if (!canUseStorage()) return cloneAssignments(tgDefaultAssignments);
  try {
    replaceTgAssignmentsSnapshot(readLocalStorage(TG_DEFAULT_ASSIGNMENTS_KEY, tgAssignmentsSnapshot));
    return cloneAssignments(loadCanonicalTgDefaultAssignments());
  } catch {
    return cloneAssignments(tgDefaultAssignments);
  }
}

export function saveTgDefaultAssignments(assignments: TgDefaultAssignment[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgAssignmentsSnapshot(assignments);
  if (changed) {
    persistTgAssignmentsSnapshot();
    emitTgUpdated();
  }
}

export function loadTgWeekPlans(): TgWeekPlanRow[] {
  if (!canUseStorage()) return clonePlans(tgWeekPlans);
  try {
    replaceTgWeekPlansSnapshot(readLocalStorage(TG_WEEK_PLANS_KEY, tgWeekPlansSnapshot));
    return clonePlans(tgWeekPlansSnapshot);
  } catch {
    return clonePlans(tgWeekPlans);
  }
}

export function saveTgWeekPlans(plans: TgWeekPlanRow[]) {
  if (!canUseStorage()) return;
  const changed = replaceTgWeekPlansSnapshot(plans);
  if (changed) {
    persistTgWeekPlansSnapshot();
    emitTgUpdated();
  }
}

export function loadTgCustomMechanics(): string[] {
  if (!canUseStorage()) return [];
  try {
    replaceTgCustomMechanicsSnapshot(readLocalStorage(TG_CUSTOM_MECHANICS_KEY, tgCustomMechanicsSnapshot));
    return [...tgCustomMechanicsSnapshot];
  } catch {
    return [];
  }
}

export function saveTgCustomMechanics(mechanics: string[]) {
  if (!canUseStorage()) return;
  if (replaceTgCustomMechanicsSnapshot(mechanics)) {
    persistTgCustomMechanicsSnapshot();
  }
}

function normalizeFamilyFromDb(value: string): TgFamily {
  const upper = String(value || "").toUpperCase();
  return upper.includes("SUCR") ? "Sucre" : "Sale";
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

async function deleteEntriesByPlanIds(supabase: ReturnType<typeof createClient>, planIds: string[]) {
  const uniquePlanIds = uniqueStrings(planIds);
  for (let index = 0; index < uniquePlanIds.length; index += 100) {
    const chunk = uniquePlanIds.slice(index, index + 100);
    const { error } = await supabase.from("plans_tg_entries").delete().in("plan_id", chunk);
    if (error) throw error;
  }
}

async function insertPlanEntries(
  supabase: ReturnType<typeof createClient>,
  rows: Array<Record<string, unknown>>,
) {
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    if (!chunk.length) continue;
    const { error } = await supabase.from("plans_tg_entries").insert(chunk);
    if (error) throw error;
  }
}

export async function saveTgWeekPlansToSupabase(plans: TgWeekPlanRow[]) {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const normalizedPlans = clonePlans(plans);
    const weekIds = uniqueStrings(normalizedPlans.map((row) => String(row.weekId ?? "").trim()));
    if (!weekIds.length) return false;

    const { data: existingPlans, error: existingPlansError } = await supabase
      .from("plans_tg")
      .select("id,label,semaine_de,date_de,date_a")
      .limit(5000);
    if (existingPlansError) throw existingPlansError;

    const existingByWeekId = new Map<string, Record<string, unknown>>();
    (existingPlans ?? []).forEach((row) => {
      const weekId = getWeekIdFromDbLabel(String(row.label ?? ""), String(row.semaine_de ?? ""));
      if (!weekId) return;
      existingByWeekId.set(weekId, row as Record<string, unknown>);
    });

    const planIdByWeekId = new Map<string, string>();
    for (const weekId of weekIds) {
      const payload = buildPlanPayload(weekId);
      const existing = existingByWeekId.get(weekId);

      if (existing) {
        const planId = String(existing.id ?? "").trim();
        if (!planId) continue;

        const shouldUpdate =
          String(existing.label ?? "") !== payload.label ||
          String(existing.semaine_de ?? "") !== String(payload.semaine_de ?? "") ||
          String(existing.date_de ?? "") !== String(payload.date_de ?? "") ||
          String(existing.date_a ?? "") !== String(payload.date_a ?? "");

        if (shouldUpdate) {
          const { error: updateError } = await supabase.from("plans_tg").update(payload).eq("id", planId);
          if (updateError) throw updateError;
        }

        planIdByWeekId.set(weekId, planId);
        continue;
      }

      const { data: insertedPlan, error: insertError } = await supabase
        .from("plans_tg")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;

      const planId = String((insertedPlan as Record<string, unknown> | null)?.id ?? "").trim();
      if (!planId) throw new Error("Impossible de créer le plan TG.");
      planIdByWeekId.set(weekId, planId);
    }

    await deleteEntriesByPlanIds(supabase, Array.from(planIdByWeekId.values()));

    const entryPayload = normalizedPlans
      .filter((row) => planIdByWeekId.has(row.weekId))
      .map((row) => ({
        plan_id: planIdByWeekId.get(row.weekId),
        rayon: row.rayon.trim(),
        famille: row.family === "Sucre" ? "SUCRE" : "SALE",
        gb_produits: row.gbProduct.trim() || null,
        tg_responsable: (row.tgResponsible || row.defaultResponsible || "").trim() || null,
        tg_produit: row.tgProduct.trim() || null,
        tg_quantite: row.tgQuantity.trim() || null,
        tg_mecanique: row.tgMechanic.trim() || null,
      }));

    await insertPlanEntries(supabase, entryPayload);
    return true;
  } catch {
    return false;
  }
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
      .select("id,plan_id,rayon,famille,gb_produits,tg_responsable,tg_produit,tg_quantite,tg_mecanique")
      .order("id", { ascending: true })
      .limit(20000);
    if (entriesError) throw entriesError;
    if (!entriesRows || entriesRows.length === 0) return false;

    const canonicalAssignments = loadCanonicalTgDefaultAssignments();
    const assignmentMap = new Map(canonicalAssignments.map((assignment) => [assignment.rayon, assignment.employee]));
    const extraAssignments = new Map<string, string>();
    const customMechanics = new Set<string>();
    const seenRayons = new Map<
      string,
      { family: TgFamily; firstWeekId: string; firstEntryId: number; orderHint: number }
    >();
    const nextPlans: TgWeekPlanRow[] = [];
    const weekOrderMap = new Map(tgWeeks.map((week, index) => [week.id, index]));

    entriesRows.forEach((row) => {
      const meta = planMeta.get(String(row.plan_id));
      if (!meta) return;
      const rayon = String(row.rayon ?? "").trim();
      if (!rayon) return;
      const family = normalizeFamilyFromDb(String(row.famille ?? ""));
      const tgResponsible = String(row.tg_responsable ?? "").trim();
      const entryId = Number(row.id ?? 0);

      if (tgResponsible && !assignmentMap.has(rayon) && !extraAssignments.has(rayon)) {
        extraAssignments.set(rayon, tgResponsible);
      }

      const mechanic = String(row.tg_mecanique ?? "").trim();
      if (mechanic) customMechanics.add(mechanic);

      const previousRayon = seenRayons.get(rayon);
      const currentWeekOrder = weekOrderMap.get(meta.weekId) ?? Number.MAX_SAFE_INTEGER;
      const previousWeekOrder = previousRayon ? weekOrderMap.get(previousRayon.firstWeekId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      if (
        !previousRayon ||
        currentWeekOrder < previousWeekOrder ||
        (currentWeekOrder === previousWeekOrder && entryId < previousRayon.firstEntryId)
      ) {
        seenRayons.set(rayon, {
          family,
          firstWeekId: meta.weekId,
          firstEntryId: entryId,
          orderHint: entryId || seenRayons.size + 1,
        });
      }

      const mapped: TgWeekPlanRow = {
        weekId: meta.weekId,
        rayon,
        family,
        defaultResponsible: assignmentMap.get(rayon) ?? tgResponsible,
        gbProduct: String(row.gb_produits ?? "").trim(),
        tgResponsible,
        tgProduct: String(row.tg_produit ?? "").trim(),
        tgQuantity: String(row.tg_quantite ?? "").trim(),
        tgMechanic: mechanic,
        hasOperation: Boolean(row.gb_produits || row.tg_produit || row.tg_quantite || row.tg_mecanique),
      };

      nextPlans.push(mapped);
    });

    const nextRayons = Array.from(seenRayons.entries())
      .map(([rayon, value], index) => ({
        rayon,
        family: value.family,
        order: String((index + 1) * 10),
        active: true,
        startWeekId: value.firstWeekId,
        orderHint: value.orderHint,
      }))
      .sort((left, right) => {
        const leftWeek = weekOrderMap.get(left.startWeekId ?? "") ?? Number.MAX_SAFE_INTEGER;
        const rightWeek = weekOrderMap.get(right.startWeekId ?? "") ?? Number.MAX_SAFE_INTEGER;
        if (leftWeek !== rightWeek) return leftWeek - rightWeek;
        if (left.orderHint !== right.orderHint) return left.orderHint - right.orderHint;
        return left.rayon.localeCompare(right.rayon, "fr");
      })
      .map(({ orderHint: _orderHint, ...row }, index) => ({ ...row, order: String((index + 1) * 10) }));

    const nextAssignments = [
      ...canonicalAssignments,
      ...Array.from(extraAssignments.entries()).map(([rayon, employee]) => ({ rayon, employee })),
    ];
    const nextMechanics = Array.from(customMechanics).sort((left, right) => left.localeCompare(right, "fr"));

    const plansChanged = replaceTgWeekPlansSnapshot(nextPlans);
    const rayonsChanged = replaceTgRayonsSnapshot(nextRayons);
    const assignmentsChanged = replaceTgAssignmentsSnapshot(nextAssignments);
    const mechanicsChanged = replaceTgCustomMechanicsSnapshot(nextMechanics);
    if (plansChanged) persistTgWeekPlansSnapshot();
    if (rayonsChanged) persistTgRayonsSnapshot();
    if (assignmentsChanged) persistTgAssignmentsSnapshot();
    if (mechanicsChanged) persistTgCustomMechanicsSnapshot();
    if (plansChanged || rayonsChanged || assignmentsChanged || mechanicsChanged) {
      emitTgUpdated();
    }
    return plansChanged || rayonsChanged || assignmentsChanged || mechanicsChanged;
  } catch {
    return false;
  }
}
