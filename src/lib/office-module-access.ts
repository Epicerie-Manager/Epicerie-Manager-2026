import { createClient } from "@/lib/supabase";
import { loadCurrentOfficeProfile } from "@/lib/office-profile";
import { canReadOfficeModule, canWriteOfficeModule, type ModuleAccessKey } from "@/lib/modules-config";

async function loadRequiredProfile() {
  const supabase = createClient();
  const profile = await loadCurrentOfficeProfile(supabase);
  if (!profile) {
    throw new Error("Veuillez vous reconnecter.");
  }
  return profile;
}

export async function assertOfficeModuleReadAccess(
  moduleKey: ModuleAccessKey,
  deniedMessage = "Acces refuse a ce module.",
) {
  const profile = await loadRequiredProfile();
  if (!canReadOfficeModule(profile, moduleKey)) {
    throw new Error(deniedMessage);
  }
  return profile;
}

export async function assertOfficeModuleWriteAccess(
  moduleKey: ModuleAccessKey,
  deniedMessage = "Action reservee sur ce module.",
) {
  const profile = await loadRequiredProfile();
  if (!canWriteOfficeModule(profile, moduleKey)) {
    throw new Error(deniedMessage);
  }
  return profile;
}
