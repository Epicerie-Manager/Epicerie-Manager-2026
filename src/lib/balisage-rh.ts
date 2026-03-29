import type { BalisageEmployeeStat } from "@/lib/balisage-data";
import type { RhEmployee } from "@/lib/rh-store";
import { isRhEmployeeCoordinatorRole } from "@/lib/rh-status";

export type BalisageEmployeeWithRhState = BalisageEmployeeStat & {
  actif: boolean;
};

export function attachRhActivityToBalisageStats(
  stats: BalisageEmployeeStat[],
  rhEmployees: RhEmployee[],
): BalisageEmployeeWithRhState[] {
  const statByName = new Map(
    stats.map((employee) => [employee.name.trim().toUpperCase(), employee]),
  );

  return rhEmployees
    .filter((employee) => employee.t !== "E" && !isRhEmployeeCoordinatorRole(employee.obs, employee.t))
    .map((employee) => {
      const name = employee.n.trim().toUpperCase();
      const stat = statByName.get(name);
      return {
        name,
        total: stat?.total ?? 0,
        errorRate: stat?.errorRate ?? null,
        actif: employee.actif,
      };
    });
}

export function getActiveBalisageStats(stats: BalisageEmployeeWithRhState[]) {
  return stats.filter((employee) => employee.actif);
}

export function getInactiveBalisageStats(stats: BalisageEmployeeWithRhState[]) {
  return stats.filter((employee) => !employee.actif);
}
