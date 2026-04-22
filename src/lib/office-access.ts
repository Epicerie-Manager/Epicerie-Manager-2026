import {
  getVisibleModules,
  isLimitedOfficeAccessRole,
  isPrivilegedOfficeRole,
  type ModuleAccessKey,
} from "@/lib/modules-config";

export type OfficeShellModuleId =
  | "dashboard"
  | "planning"
  | "exports"
  | "plantg"
  | "planriz"
  | "plateau"
  | "balisage"
  | "ruptures"
  | "absences"
  | "rh"
  | "suivi"
  | "infos"
  | "aide"
  | "admin";

function getModuleIdFromAccessKey(moduleKey: ModuleAccessKey): OfficeShellModuleId {
  const mapping: Record<ModuleAccessKey, OfficeShellModuleId> = {
    planning: "planning",
    ruptures: "ruptures",
    absences: "absences",
    infos: "infos",
    rh: "rh",
    balisage: "balisage",
    plateau: "plateau",
    plan_tg: "plantg",
    plan_rayon: "planriz",
    exports: "exports",
  };

  return mapping[moduleKey];
}

export function getOfficeModuleAccess(role: string | null | undefined, allowedModules: ModuleAccessKey[] = [], isAdmin = false) {
  if (isPrivilegedOfficeRole(role)) {
    const modules = new Set<OfficeShellModuleId>([
      "dashboard",
      "planning",
      "exports",
      "plantg",
      "planriz",
      "plateau",
      "balisage",
      "ruptures",
      "absences",
      "rh",
      "suivi",
      "infos",
      "aide",
    ]);

    if (isAdmin) {
      modules.add("admin");
    }

    return modules;
  }

  if (isLimitedOfficeAccessRole({ role, allowed_modules: allowedModules })) {
    const visibleModules = getVisibleModules({ role, allowed_modules: allowedModules });
    return new Set<OfficeShellModuleId>([
      "dashboard",
      ...visibleModules.map((moduleItem) => getModuleIdFromAccessKey(moduleItem.key)),
    ]);
  }

  return new Set<OfficeShellModuleId>();
}

export function canAccessOfficePath(pathname: string, role: string | null | undefined, allowedModules: ModuleAccessKey[] = [], isAdmin = false) {
  if (!pathname || pathname === "/login" || pathname === "/change-password") {
    return true;
  }

  const allowed = getOfficeModuleAccess(role, allowedModules, isAdmin);

  if (pathname === "/") return allowed.has("dashboard");
  if (pathname === "/planning" || pathname.startsWith("/planning/")) return allowed.has("planning");
  if (pathname === "/ruptures" || pathname.startsWith("/ruptures/")) return allowed.has("ruptures");
  if (pathname === "/absences" || pathname.startsWith("/absences/")) return allowed.has("absences");
  if (pathname === "/infos" || pathname.startsWith("/infos/")) return allowed.has("infos");
  if (pathname === "/rh" || pathname.startsWith("/rh/")) return allowed.has("rh");
  if (pathname === "/stats" || pathname.startsWith("/stats/")) return allowed.has("balisage");
  if (pathname === "/plan-plateau" || pathname.startsWith("/plan-plateau/")) return allowed.has("plateau");
  if (pathname === "/plan-tg" || pathname.startsWith("/plan-tg/")) return allowed.has("plantg");
  if (
    pathname === "/plan-de-rayon" ||
    pathname.startsWith("/plan-de-rayon/") ||
    pathname === "/plan-de-riz" ||
    pathname.startsWith("/plan-de-riz/")
  ) {
    return allowed.has("planriz");
  }
  if (pathname === "/exports" || pathname.startsWith("/exports/")) return allowed.has("exports");
  if (pathname === "/suivi" || pathname.startsWith("/suivi/")) return allowed.has("suivi");
  if (pathname === "/aide" || pathname.startsWith("/aide/")) return allowed.has("aide");
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return allowed.has("admin");

  return true;
}
