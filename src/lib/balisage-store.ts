import {
  balisageData,
  balisageMonths,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";
import { hasBrowserWindow, purgeLegacyCacheKeys } from "@/lib/browser-cache";
import { isRhEmployeeCoordinatorRole } from "@/lib/rh-status";
import { createClient } from "@/lib/supabase";

const BALISAGE_STORAGE_KEY = "epicerie-manager-balisage-data-v1";
const BALISAGE_UPDATED_EVENT = "epicerie-manager:balisage-updated";

// Cache name → id pour les upserts (populé lors de la sync)
let employeeIdByName = new Map<string, string>();

type BalisageDataset = Record<string, BalisageEmployeeStat[]>;

let balisageSnapshot = cloneDefaultData();
let balisageSerialized = JSON.stringify(balisageSnapshot);

function emitBalisageUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BALISAGE_UPDATED_EVENT));
}

function cloneDefaultData(): BalisageDataset {
  return Object.fromEntries(
    Object.entries(balisageData).map(([monthId, stats]) => [
      monthId,
      stats.map((item) => ({ ...item })),
    ]),
  );
}

function cloneBalisageData(data: BalisageDataset): BalisageDataset {
  return Object.fromEntries(
    Object.entries(data).map(([monthId, stats]) => [
      monthId,
      stats.map((item) => ({ ...item })),
    ]),
  );
}

function replaceBalisageSnapshot(data: BalisageDataset) {
  const nextData = cloneBalisageData(data);
  const serialized = JSON.stringify(nextData);
  if (serialized === balisageSerialized) return false;
  balisageSnapshot = nextData;
  balisageSerialized = serialized;
  return true;
}

function normalizeEmployeeName(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function isTrackedBalisageEmployee(employee: { type?: string | null; observation?: string | null }) {
  const type = normalizeEmployeeName(employee.type);
  return type !== "ETUDIANT" && !isRhEmployeeCoordinatorRole(employee.observation, type);
}

function createEmptyBalisageDataset(employeeRows: Array<{ name?: string | null; type?: string | null; observation?: string | null }>) {
  const trackedNames = employeeRows
    .filter((employee) => isTrackedBalisageEmployee(employee))
    .map((employee) => normalizeEmployeeName(employee.name))
    .filter(Boolean);

  return Object.fromEntries(
    balisageMonths.map((month) => [
      month.id,
      trackedNames.map((name) => ({ name, total: 0, errorRate: null })),
    ]),
  ) as BalisageDataset;
}

export function loadBalisageData(): BalisageDataset {
  if (!hasBrowserWindow()) {
    return cloneDefaultData();
  }

  purgeLegacyCacheKeys([BALISAGE_STORAGE_KEY]);
  try {
    return cloneBalisageData(balisageSnapshot);
  } catch {
    return cloneDefaultData();
  }
}

export function saveBalisageData(data: BalisageDataset) {
  if (!hasBrowserWindow()) return;
  const changed = replaceBalisageSnapshot(data);
  if (changed) emitBalisageUpdated();
}

export function getBalisageUpdatedEventName() {
  return BALISAGE_UPDATED_EVENT;
}

export async function saveBalisageEntryToSupabase(
  monthId: string,
  name: string,
  total: number,
  errorRate: number | null,
): Promise<boolean> {
  if (!hasBrowserWindow()) return false;
  try {
    const supabase = createClient();

    // Si le cache est vide (page rechargée sans sync), on le recharge
    if (employeeIdByName.size === 0) {
      const { data: rows } = await supabase.from("employees").select("id,name").limit(5000);
      if (rows) {
        employeeIdByName = new Map(
          rows.map((e) => [String(e.name ?? "").trim().toUpperCase(), String(e.id)]),
        );
      }
    }

    const employeeId = employeeIdByName.get(name.trim().toUpperCase());
    if (!employeeId) return false;

    const { error } = await supabase
      .from("balisage_mensuel")
      .upsert(
        { mois: monthId, employee_id: employeeId, total_controles: total, taux_erreur: errorRate },
        { onConflict: "mois,employee_id" },
      );

    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function syncBalisageFromSupabase() {
  if (!hasBrowserWindow()) return false;

  try {
    const supabase = createClient();
    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,type,observation")
      .limit(5000);
    if (employeeError) throw employeeError;
    if (!employeeRows || employeeRows.length === 0) return false;

    const employeeNameById = new Map(
      employeeRows.map((employee) => [String(employee.id), String(employee.name ?? "").trim().toUpperCase()]),
    );

    // Peupler le cache inverse pour les sauvegardes
    employeeIdByName = new Map(
      employeeRows.map((employee) => [String(employee.name ?? "").trim().toUpperCase(), String(employee.id)]),
    );

    const { data: balisageRows, error: balisageError } = await supabase
      .from("balisage_mensuel")
      .select("mois,employee_id,total_controles,taux_erreur")
      .limit(20000);
    if (balisageError) throw balisageError;

    const next = createEmptyBalisageDataset(employeeRows);
    const monthIdSet = new Set(balisageMonths.map((month) => month.id));

    (balisageRows ?? []).forEach((row) => {
      const monthId = String(row.mois ?? "");
      if (!monthIdSet.has(monthId)) return;
      const name = employeeNameById.get(String(row.employee_id));
      if (!name) return;

      if (!next[monthId]) next[monthId] = [];
      const idx = next[monthId].findIndex((item) => item.name === name);
      const mapped = {
        name,
        total: Number(row.total_controles ?? 0),
        errorRate:
          row.taux_erreur === null || row.taux_erreur === undefined
            ? null
            : Number(row.taux_erreur),
      };
      if (idx >= 0) next[monthId][idx] = mapped;
    });

    const changed = replaceBalisageSnapshot(next);
    if (changed) emitBalisageUpdated();
    return changed;
  } catch {
    return false;
  }
}
