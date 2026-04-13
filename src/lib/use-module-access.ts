"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getVisibleModules, isPrivilegedOfficeRole, type ModuleAccessKey } from "@/lib/modules-config";
import { loadCurrentOfficeProfile, type OfficeProfile } from "@/lib/office-profile";

export function useModuleAccess(moduleKey: ModuleAccessKey) {
  const router = useRouter();
  const [profile, setProfile] = useState<OfficeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const supabase = createClient();
      const currentProfile = await loadCurrentOfficeProfile(supabase);

      if (cancelled) return;

      setProfile(currentProfile);

      if (!currentProfile) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      if (isPrivilegedOfficeRole(currentProfile.role)) {
        setLoading(false);
        return;
      }

      const visibleModules = getVisibleModules(currentProfile);
      const hasAccess = visibleModules.some((item) => item.key === moduleKey);

      setLoading(false);

      if (!hasAccess) {
        router.replace("/");
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [moduleKey, router]);

  const hasAccess = profile ? isPrivilegedOfficeRole(profile.role) || getVisibleModules(profile).some((item) => item.key === moduleKey) : false;

  return { loading, hasAccess, profile };
}
