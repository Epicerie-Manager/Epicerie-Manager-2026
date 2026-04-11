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
const TG_RAYONS_CONFIG_TABLE = "tg_rayons_config";
const TG_CUSTOM_MECHANICS_TABLE = "tg_custom_mechanics";

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

function purgeLegacyTgStorage() {
  purgeLegacyCacheKeys([
    TG_RAYONS_KEY,
    TG_DEFAULT_ASSIGNMENTS_KEY,
    TG_WEEK_PLANS_KEY,
    TG_CUSTOM_MECHANICS_KEY,
  ]);
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

function getBaseRayonsForSync() {
  return tgRayonsSnapshot.length ? cloneRayons(tgRayonsSnapshot) : cloneRayons(tgRayons);
}

function getCanonicalRayonOrderMap() {
  return new Map(
    getBaseRayonsForSync().map((rayon, index) => [
      rayon.rayon,
      {
        family: rayon.family,
        order: Number(rayon.order) || (index + 1) * 10,
        active: rayon.active,
        startWeekId: rayon.startWeekId,
      },
    ]),
  );
}

export function getTgUpdatedEventName() {
  return TG_UPDATED_EVENT;
}

function emitTgUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TG_UPDATED_EVENT));
}

function buildAssignmentsFromConfigRayons(rayons: Array<{ rayon: string; defaultResponsible?: string | null }>) {
  return rayons
    .map((row) => ({
      rayon: String(row.rayon ?? "").trim(),
      employee: String(row.defaultResponsible ?? "").trim(),
    }))
    .filter((row) => row.rayon && row.employee);
}

export function loadTgRayons(): TgRayon[] {
  if (!canUseStorage()) return cloneRayons(tgRayons);
  try {
    purgeLegacyTgStorage();
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
    purgeLegacyTgStorage();
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
    purgeLegacyTgStorage();
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
    purgeLegacyTgStorage();
    return [...tgCustomMechanicsSnapshot];
  } catch {
    return [];
  }
}

export function saveTgCustomMechanics(mechanics: string[]) {
  if (!canUseStorage()) return;
  replaceTgCustomMechanicsSnapshot(mechanics);
}

async function deleteRowsByStringKey(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  values: string[],
) {
  const uniqueValues = uniqueStrings(values);
  if (!uniqueValues.length) return;
  for (let index = 0; index < uniqueValues.length; index += 100) {
    const chunk = uniqueValues.slice(index, index + 100);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw error;
  }
}

export async function saveTgConfigToSupabase(
  rayons: TgRayon[],
  assignments: TgDefaultAssignment[],
  mechanics: string[],
) {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const assignmentEntries = assignments
      .map(
        (assignment): [string, string] => [assignment.rayon.trim(), assignment.employee.trim()],
      )
      .filter(([rayon, employee]) => Boolean(rayon && employee));
    const assignmentMap = new Map<string, string>(assignmentEntries);

    const configRows = cloneRayons(rayons).map((rayon, index) => ({
      rayon: rayon.rayon.trim(),
      family: rayon.family === "Sucre" ? "SUCRE" : "SALE",
      order_index: Number(rayon.order) || (index + 1) * 10,
      active: rayon.active,
      start_week_id: rayon.startWeekId?.trim() || null,
      default_responsible: assignmentMap.get(rayon.rayon.trim()) ?? null,
    }));
    const rayonNames = configRows.map((row) => row.rayon);

    const { data: existingConfigRows, error: existingConfigError } = await supabase
      .from(TG_RAYONS_CONFIG_TABLE)
      .select("rayon")
      .limit(1000);
    if (existingConfigError) throw existingConfigError;

    if (configRows.length) {
      const { error: upsertConfigError } = await supabase
        .from(TG_RAYONS_CONFIG_TABLE)
        .upsert(configRows, { onConflict: "rayon" });
      if (upsertConfigError) throw upsertConfigError;
    }

    const staleRayons = (existingConfigRows ?? [])
      .map((row) => String((row as Record<string, unknown>).rayon ?? "").trim())
      .filter((rayon) => rayon && !rayonNames.includes(rayon));
    await deleteRowsByStringKey(supabase, TG_RAYONS_CONFIG_TABLE, "rayon", staleRayons);

    const normalizedMechanics = uniqueStrings(mechanics.map((mechanic) => mechanic.trim())).sort((a, b) =>
      a.localeCompare(b, "fr"),
    );
    const { data: existingMechanicsRows, error: existingMechanicsError } = await supabase
      .from(TG_CUSTOM_MECHANICS_TABLE)
      .select("name")
      .limit(1000);
    if (existingMechanicsError) throw existingMechanicsError;

    if (normalizedMechanics.length) {
      const { error: upsertMechanicsError } = await supabase
        .from(TG_CUSTOM_MECHANICS_TABLE)
        .upsert(normalizedMechanics.map((name, index) => ({ name, order_index: (index + 1) * 10 })), {
          onConflict: "name",
        });
      if (upsertMechanicsError) throw upsertMechanicsError;
    }

    const staleMechanics = (existingMechanicsRows ?? [])
      .map((row) => String((row as Record<string, unknown>).name ?? "").trim())
      .filter((name) => name && !normalizedMechanics.includes(name));
    await deleteRowsByStringKey(supabase, TG_CUSTOM_MECHANICS_TABLE, "name", staleMechanics);

    return true;
  } catch {
    return false;
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
    let configChanged = false;

    try {
      const { data: configRows, error: configError } = await supabase
        .from(TG_RAYONS_CONFIG_TABLE)
        .select("rayon,family,order_index,active,start_week_id,default_responsible")
        .order("order_index", { ascending: true })
        .limit(1000);
      if (configError) throw configError;
      if (configRows?.length) {
        const nextRayons = configRows.map((row, index) => {
          const record = row as Record<string, unknown>;
          return {
            rayon: String(record.rayon ?? "").trim(),
            family: normalizeFamilyFromDb(String(record.family ?? "")),
            order: String(Number(record.order_index ?? 0) || (index + 1) * 10),
            active: Boolean(record.active ?? true),
            startWeekId: String(record.start_week_id ?? "").trim() || undefined,
          };
        });
        const nextAssignments = buildAssignmentsFromConfigRayons(
          configRows.map((row) => ({
            rayon: String((row as Record<string, unknown>).rayon ?? ""),
            defaultResponsible: String((row as Record<string, unknown>).default_responsible ?? ""),
          })),
        );
        const rayonsChanged = replaceTgRayonsSnapshot(nextRayons);
        const assignmentsChanged = replaceTgAssignmentsSnapshot(nextAssignments);
        configChanged = rayonsChanged || assignmentsChanged;
      }
    } catch {
      // Ignore missing config table until migration is applied.
    }

    try {
      const { data: mechanicsRows, error: mechanicsError } = await supabase
        .from(TG_CUSTOM_MECHANICS_TABLE)
        .select("name")
        .order("order_index", { ascending: true })
        .limit(1000);
      if (mechanicsError) throw mechanicsError;
      if (mechanicsRows) {
        const mechanicsChanged = replaceTgCustomMechanicsSnapshot(
          mechanicsRows
            .map((row) => String((row as Record<string, unknown>).name ?? "").trim())
            .filter(Boolean),
        );
        configChanged = mechanicsChanged || configChanged;
      }
    } catch {
      // Ignore missing custom mechanics table until migration is applied.
    }

    const { data: plansRows, error: plansError } = await supabase
      .from("plans_tg")
      .select("id,label,semaine_de")
      .limit(2000);
    if (plansError) throw plansError;
    if (!plansRows || plansRows.length === 0) {
      if (configChanged) emitTgUpdated();
      return configChanged;
    }

    const planMeta = new Map<
      string,
      { weekId: string; label: string }
    >();
    plansRows.forEach((row) => {
      const weekId = getWeekIdFromDbLabel(String(row.label ?? ""), row.semaine_de ?? null);
      if (!weekId) return;
      planMeta.set(String(row.id), { weekId, label: String(row.label ?? "") });
    });
    if (planMeta.size === 0) {
      if (configChanged) emitTgUpdated();
      return configChanged;
    }

    const { data: entriesRows, error: entriesError } = await supabase
      .from("plans_tg_entries")
      .select("id,plan_id,rayon,famille,gb_produits,tg_responsable,tg_produit,tg_quantite,tg_mecanique")
      .order("id", { ascending: true })
      .limit(20000);
    if (entriesError) throw entriesError;
    if (!entriesRows || entriesRows.length === 0) {
      if (configChanged) emitTgUpdated();
      return configChanged;
    }

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

    const baseRayons = getBaseRayonsForSync();
    const canonicalRayons = getCanonicalRayonOrderMap();
    const nextRayons = baseRayons
      .map((baseRayon, index) => {
        const seen = seenRayons.get(baseRayon.rayon);
        return {
          rayon: baseRayon.rayon,
          family: seen?.family ?? baseRayon.family,
          order: String(Number(baseRayon.order) || (index + 1) * 10),
          active: baseRayon.active,
          startWeekId: seen?.firstWeekId ?? baseRayon.startWeekId,
        };
      })
      .concat(
        Array.from(seenRayons.entries())
          .filter(([rayon]) => !canonicalRayons.has(rayon))
          .map(([rayon, value], index) => ({
            rayon,
            family: value.family,
            order: String((baseRayons.length + index + 1) * 10),
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
          .map((row) => ({
            rayon: row.rayon,
            family: row.family,
            order: row.order,
            active: row.active,
            startWeekId: row.startWeekId,
          })),
      );

    const nextAssignments = [
      ...canonicalAssignments,
      ...Array.from(extraAssignments.entries()).map(([rayon, employee]) => ({ rayon, employee })),
    ];
    const nextMechanics = Array.from(customMechanics).sort((left, right) => left.localeCompare(right, "fr"));

    const plansChanged = replaceTgWeekPlansSnapshot(nextPlans);
    const rayonsChanged = replaceTgRayonsSnapshot(nextRayons);
    const assignmentsChanged = replaceTgAssignmentsSnapshot(nextAssignments);
    const mechanicsChanged = replaceTgCustomMechanicsSnapshot(nextMechanics);
    if (plansChanged || rayonsChanged || assignmentsChanged || mechanicsChanged) {
      emitTgUpdated();
    }
    return plansChanged || rayonsChanged || assignmentsChanged || mechanicsChanged;
  } catch {
    return false;
  }
}

/**
 * Persiste une ligne TG/GB pour un rayon donne sur une semaine donnee.
 * Pattern : cherche la ligne existante par (plan_id, rayon),
 * met a jour si elle existe, insere sinon.
 */
export async function saveTgEntryToSupabase(row: TgWeekPlanRow): Promise<void> {
  try {
    const supabase = createClient();

    const { data: plansRows, error: plansError } = await supabase
      .from("plans_tg")
      .select("id, label, semaine_de")
      .limit(200);
    if (plansError) throw plansError;

    let planId: string | null = null;
    for (const plan of plansRows ?? []) {
      const weekId = getWeekIdFromDbLabel(
        String(plan.label ?? ""),
        (plan.semaine_de as string | null | undefined) ?? null,
      );
      if (weekId === row.weekId) {
        planId = String(plan.id ?? "").trim();
        break;
      }
    }

    if (!planId) {
      const payload = buildPlanPayload(row.weekId);
      const { data: insertedPlan, error: insertPlanError } = await supabase
        .from("plans_tg")
        .insert(payload)
        .select("id")
        .single();
      if (insertPlanError) throw insertPlanError;
      planId = String((insertedPlan as Record<string, unknown> | null)?.id ?? "").trim();
    }

    if (!planId) {
      throw new Error(`Impossible de retrouver ou creer le plan TG pour ${row.weekId}.`);
    }

    const { data: existing, error: fetchError } = await supabase
      .from("plans_tg_entries")
      .select("id")
      .eq("plan_id", planId)
      .eq("rayon", row.rayon)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const famille = row.family === "Sucre" ? "SUCRE" : "SALE";
    const payload = {
      plan_id: planId,
      rayon: row.rayon,
      famille,
      gb_produits: row.gbProduct || null,
      tg_responsable: row.tgResponsible || null,
      tg_produit: row.tgProduct || null,
      tg_quantite: row.tgQuantity || null,
      tg_mecanique: row.tgMechanic || null,
    };

    if (existing && typeof existing === "object" && "id" in existing && existing.id) {
      const { error: updateError } = await supabase
        .from("plans_tg_entries")
        .update(payload)
        .eq("id", String(existing.id));
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("plans_tg_entries")
        .insert(payload);
      if (insertError) throw insertError;
    }

  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}
