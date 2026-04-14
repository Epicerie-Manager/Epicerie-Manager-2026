"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVisibleModules,
  hasOfficeModuleAccess,
  isPrivilegedOfficeRole,
  isReadOnlyOfficeAccessRole,
  normalizeAllowedModules,
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
  canAccessModule: (moduleId: string) => boolean;
};

export function buildUserRole(profile: Pick<OfficeProfile, "role" | "allowed_modules"> | null): UserRoleInfo {
  const role = String(profile?.role ?? "").trim();
  const allowedModules = normalizeAllowedModules(profile?.allowed_modules ?? []);
  const isManager = isPrivilegedOfficeRole(role);
  const isReadOnly = isReadOnlyOfficeAccessRole({ role, allowed_modules: allowedModules });
  const hasDashboardAccess = hasOfficeModuleAccess({ role, allowed_modules: allowedModules });
  const visibleModules = getVisibleModules({ role, allowed_modules: allowedModules });

  return {
    role,
    isManager,
    isReadOnly,
    hasDashboardAccess,
    allowedModules,
    canAccessModule(moduleId: string) {
      if (isManager) return true;
      return visibleModules.some((moduleItem) => moduleItem.key === moduleId);
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
