import type { BalisageEmployeeStat } from "@/lib/balisage-data";
import type { RhEmployee } from "@/lib/rh-store";

export type BalisageEmployeeWithRhState = BalisageEmployeeStat & {
  actif: boolean;
};

export function attachRhActivityToBalisageStats(
  stats: BalisageEmployeeStat[],
  rhEmployees: RhEmployee[],
): BalisageEmployeeWithRhState[] {
  const activityByName = new Map(
    rhEmployees.map((employee) => [employee.n.trim().toUpperCase(), employee.actif]),
  );

  return stats.map((employee) => ({
    ...employee,
    actif: activityByName.get(employee.name.trim().toUpperCase()) ?? true,
  }));
}

export function getActiveBalisageStats(stats: BalisageEmployeeWithRhState[]) {
  return stats.filter((employee) => employee.actif);
}

export function getInactiveBalisageStats(stats: BalisageEmployeeWithRhState[]) {
  return stats.filter((employee) => !employee.actif);
}
