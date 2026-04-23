"use client";

import { useEffect, useMemo, useState } from "react";
import {
  canWriteOfficeModule,
  getVisibleModules,
  hasOfficeModuleAccess,
  isPrivilegedOfficeRole,
  isReadOnlyOfficeAccessRole,
  normalizeAllowedModules,
  type ModulePermissions,
  type ModuleAccessKey,
} from "@/lib/modules-config";
import { loadCurrentOfficeProfile, type OfficeProfile } from "@/lib/office-profile";
import { createClient } from "@/lib/supabase";

export type UserRoleInfo = {
  role: string;
  isManager: boolean;
  isReadOnly: boolean;
  hasDashboardAccess: boolean;
  allowedModules: ModuleAccessKey[];
  modulePermissions: ModulePermissions;
  canAccessModule: (moduleId: string) => boolean;
  canWriteModule: (moduleId: string) => boolean;
};

export function buildUserRole(profile: Pick<OfficeProfile, "role" | "allowed_modules" | "module_permissions"> | null): UserRoleInfo {
  const role = String(profile?.role ?? "").trim();
  const allowedModules = normalizeAllowedModules(profile?.allowed_modules ?? []);
  const modulePermissions = profile?.module_permissions ?? {};
  const isManager = isPrivilegedOfficeRole(role);
  const isReadOnly = isReadOnlyOfficeAccessRole({ role, allowed_modules: allowedModules, module_permissions: modulePermissions });
  const hasDashboardAccess = hasOfficeModuleAccess({ role, allowed_modules: allowedModules, module_permissions: modulePermissions });
  const visibleModules = getVisibleModules({ role, allowed_modules: allowedModules, module_permissions: modulePermissions });

  return {
    role,
    isManager,
    isReadOnly,
    hasDashboardAccess,
    allowedModules,
    modulePermissions,
    canAccessModule(moduleId: string) {
      if (isManager) return true;
      return visibleModules.some((moduleItem) => moduleItem.key === moduleId);
    },
    canWriteModule(moduleId: string) {
      if (!allowedModules.includes(moduleId as ModuleAccessKey) && !isManager) return false;
      return canWriteOfficeModule(
        { role, allowed_modules: allowedModules, module_permissions: modulePermissions },
        moduleId as ModuleAccessKey,
      );
    },
  };
}

export function useUserRole() {
  const [profile, setProfile] = useState<OfficeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const currentProfile = await loadCurrentOfficeProfile(supabase);
        if (!cancelled) {
          setProfile(currentProfile);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const roleInfo = useMemo(() => buildUserRole(profile), [profile]);

  return {
    loading,
    profile,
    ...roleInfo,
  };
}
