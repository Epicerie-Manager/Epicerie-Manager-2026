import { defaultRhEmployees } from "@/lib/rh-store";
import { isRhEmployeeExcludedByNameFromBalisage, isRhEmployeeExcludedFromBalisage } from "@/lib/rh-status";

export type BalisageEmployeeStat = {
  name: string;
  total: number;
  errorRate: number | null;
  lastUpdatedAt?: string | null;
};

export const balisageObjective = 800;

export const balisageMonths = [
  { id: "JANV_2026", label: "Janvier" },
  { id: "FEVR_2026", label: "Fevrier" },
  { id: "MARS_2026", label: "Mars" },
  { id: "AVRIL_2026", label: "Avril" },
  { id: "MAI_2026", label: "Mai" },
  { id: "JUIN_2026", label: "Juin" },
  { id: "JUIL_2026", label: "Juillet" },
  { id: "AOUT_2026", label: "Aout" },
  { id: "SEPT_2026", label: "Septembre" },
  { id: "OCT_2026", label: "Octobre" },
  { id: "NOV_2026", label: "Novembre" },
  { id: "DEC_2026", label: "Decembre" },
];

function getTrackedBalisageEmployeeNames() {
  return defaultRhEmployees
    .filter((employee) => (
      employee.t !== "E" &&
      !isRhEmployeeExcludedFromBalisage(employee.obs, employee.t) &&
      !isRhEmployeeExcludedByNameFromBalisage(employee.n)
    ))
    .map((employee) => employee.n.trim().toUpperCase());
}

function buildMonthStats(
  overrides: Record<string, { total: number; errorRate: number | null }> = {},
): BalisageEmployeeStat[] {
  const overrideMap = new Map(
    Object.entries(overrides).map(([name, value]) => [name.trim().toUpperCase(), value]),
  );

  return getTrackedBalisageEmployeeNames().map((name) => {
    const override = overrideMap.get(name);
    return {
      name,
      total: override?.total ?? 0,
      errorRate: override?.errorRate ?? null,
      lastUpdatedAt: null,
    };
  });
}

const defaultEmployees = buildMonthStats();

export const balisageData: Record<string, BalisageEmployeeStat[]> = {
  MARS_2026: buildMonthStats(),
  FEVR_2026: buildMonthStats({
    PASCALE: { total: 1055, errorRate: null },
    WASIM: { total: 97, errorRate: null },
    JEREMY: { total: 1033, errorRate: null },
    JAMAA: { total: 806, errorRate: null },
    KAMEL: { total: 220, errorRate: null },
    "EL HASSANE": { total: 805, errorRate: null },
    CECILE: { total: 1327, errorRate: null },
  }),
  JANV_2026: buildMonthStats({
    PASCALE: { total: 954, errorRate: 0.9 },
    ROSALIE: { total: 750, errorRate: 0 },
    WASIM: { total: 210, errorRate: 0 },
    JEREMY: { total: 1589, errorRate: 0.2 },
    JAMAA: { total: 939, errorRate: 0 },
    KAMEL: { total: 822, errorRate: 0 },
    "EL HASSANE": { total: 972, errorRate: 0 },
    LIYAKATH: { total: 1251, errorRate: 0.4 },
    CECILE: { total: 1532, errorRate: 0 },
  }),
  AVRIL_2026: defaultEmployees,
  MAI_2026: defaultEmployees,
  JUIN_2026: defaultEmployees,
  JUIL_2026: defaultEmployees,
  AOUT_2026: defaultEmployees,
  SEPT_2026: defaultEmployees,
  OCT_2026: defaultEmployees,
  NOV_2026: defaultEmployees,
  DEC_2026: defaultEmployees,
};
