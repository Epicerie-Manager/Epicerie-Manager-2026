import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAllowedModules, type ModuleAccessKey } from "@/lib/modules-config";

export type OfficeProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id: string;
  allowed_modules: ModuleAccessKey[];
  password_changed: boolean;
};

export function getOfficeProfileFirstName(value: string | null | undefined) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "";
  return cleaned.split(/\s+/)[0] ?? "";
}

export async function loadCurrentOfficeProfile(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,employee_id,allowed_modules,password_changed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    id: String(profile.id ?? user.id ?? ""),
    full_name: String(profile.full_name ?? user.email ?? "").trim(),
    email: String(profile.email ?? user.email ?? "").trim(),
    role: String(profile.role ?? "").trim(),
    employee_id: String(profile.employee_id ?? ""),
    allowed_modules: normalizeAllowedModules(profile.allowed_modules),
    password_changed: profile.password_changed === true,
  } satisfies OfficeProfile;
}

