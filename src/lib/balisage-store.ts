import {
  balisageData,
  balisageMonths,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";
import { createClient } from "@/lib/supabase";

const BALISAGE_STORAGE_KEY = "epicerie-manager-balisage-data-v1";
const BALISAGE_UPDATED_EVENT = "epicerie-manager:balisage-updated";

type BalisageDataset = Record<string, BalisageEmployeeStat[]>;

function cloneDefaultData(): BalisageDataset {
  return Object.fromEntries(
    Object.entries(balisageData).map(([monthId, stats]) => [
      monthId,
      stats.map((item) => ({ ...item })),
    ]),
  );
}

function isStatRow(value: unknown): value is BalisageEmployeeStat {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.name === "string" &&
    typeof row.total === "number" &&
    (typeof row.errorRate === "number" || row.errorRate === null)
  );
}

export function loadBalisageData(): BalisageDataset {
  if (typeof window === "undefined") {
    return cloneDefaultData();
  }

  const raw = window.localStorage.getItem(BALISAGE_STORAGE_KEY);
  if (!raw) {
    return cloneDefaultData();
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sanitized = cloneDefaultData();

    balisageMonths.forEach((month) => {
      const monthRows = parsed?.[month.id];
      if (!Array.isArray(monthRows)) return;
      const rows = monthRows.filter(isStatRow);
      if (rows.length > 0) {
        sanitized[month.id] = rows;
      }
    });

    return sanitized;
  } catch {
    return cloneDefaultData();
  }
}

export function saveBalisageData(data: BalisageDataset) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BALISAGE_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(BALISAGE_UPDATED_EVENT));
}

export function getBalisageUpdatedEventName() {
  return BALISAGE_UPDATED_EVENT;
}

export async function syncBalisageFromSupabase() {
  if (typeof window === "undefined") return false;

  try {
    const supabase = createClient();
    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name")
      .limit(5000);
    if (employeeError) throw employeeError;
    if (!employeeRows || employeeRows.length === 0) return false;

    const employeeNameById = new Map(
      employeeRows.map((employee) => [String(employee.id), String(employee.name ?? "").trim().toUpperCase()]),
    );

    const { data: balisageRows, error: balisageError } = await supabase
      .from("balisage_mensuel")
      .select("mois,employee_id,total_controles,taux_erreur")
      .limit(20000);
    if (balisageError) throw balisageError;
    if (!balisageRows || balisageRows.length === 0) return false;

    const next = cloneDefaultData();
    const monthIdSet = new Set(balisageMonths.map((month) => month.id));

    balisageRows.forEach((row) => {
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
      else next[monthId].push(mapped);
    });

    window.localStorage.setItem(BALISAGE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(BALISAGE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
