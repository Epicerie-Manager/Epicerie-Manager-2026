import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProfileModulePermissions,
  normalizeAllowedModules,
  type ModuleAccessKey,
  type ModulePermissions,
} from "@/lib/modules-config";

export type OfficeProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id: string;
  allowed_modules: ModuleAccessKey[];
  module_permissions: ModulePermissions;
  password_changed: boolean;
};

export function getOfficeProfileFirstName(value: string | null | undefined) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "";
  return cleaned.split(/\s+/)[0] ?? "";
}

function isMissingModulePermissionsColumnError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("module_permissions") && (message.includes("column") || message.includes("schema cache"));
}

export async function loadCurrentOfficeProfile(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  let profileQuery = await supabase
    .from("profiles")
    .select("id,full_name,email,role,employee_id,allowed_modules,module_permissions,password_changed")
    .eq("id", user.id)
    .maybeSingle();

  if (isMissingModulePermissionsColumnError(profileQuery.error)) {
    profileQuery = await supabase
      .from("profiles")
      .select("id,full_name,email,role,employee_id,allowed_modules,password_changed")
      .eq("id", user.id)
      .maybeSingle();
  }

  const { data: profile, error: profileError } = profileQuery;

  if (profileError || !profile) return null;

  const role = String(profile.role ?? "").trim();
  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  const modulePermissions = getProfileModulePermissions({
    role,
    allowed_modules: allowedModules,
    module_permissions: profile.module_permissions,
  });

  return {
    id: String(profile.id ?? user.id ?? ""),
    full_name: String(profile.full_name ?? user.email ?? "").trim(),
    email: String(profile.email ?? user.email ?? "").trim(),
    role,
    employee_id: String(profile.employee_id ?? ""),
    allowed_modules: Object.keys(modulePermissions).length > 0
      ? (Object.keys(modulePermissions) as ModuleAccessKey[])
      : allowedModules,
    module_permissions: modulePermissions,
    password_changed: profile.password_changed === true,
  } satisfies OfficeProfile;
}
