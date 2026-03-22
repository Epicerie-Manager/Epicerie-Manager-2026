import {
  balisageData,
  balisageMonths,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";

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

