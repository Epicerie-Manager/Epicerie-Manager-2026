import { createClient } from "@/lib/supabase";

export type CollabEmployee = {
  id: string;
  name: string;
  type: string | null;
  observation: string | null;
  horaire_standard?: string | null;
  horaire_mardi?: string | null;
  horaire_samedi?: string | null;
  actif?: boolean | null;
};

export type CollabProfile = {
  id: string;
  role: string | null;
  employee_id: string | null;
  first_login: boolean;
  solde_cp: number | null;
  employees: CollabEmployee | null;
};

const COLLAB_PROFILE_CACHE_TTL_MS = 5000;
let collabProfileCache:
  | {
      expiresAt: number;
      value: CollabProfile | null;
    }
  | null = null;
let collabProfilePromise: Promise<CollabProfile | null> | null = null;

const COLLAB_PROFILE_MAPPING = [
  { email: "abdou@ep.fr", auth_id: "a1cbec69-17e8-49af-8724-daa88ade5f55", employee_id: "bf2b450e-2838-47a2-81ab-6fbe7ff8e671" },
  { email: "achraf@ep.fr", auth_id: "7fc9cae8-55a8-4ad6-be19-982d092eed8c", employee_id: "c8bc3554-4afd-498b-be0d-c0b4a93e1c93" },
  { email: "cecile@ep.fr", auth_id: "2e52de56-77b6-4ba3-a971-20cc3d448953", employee_id: "0cbd4ef3-07b3-46cc-b1a7-d39e7d52afe3" },
  { email: "dilaxshan@ep.fr", auth_id: "eb9298c3-f930-48e2-91ed-b2e2c87794bd", employee_id: "7d9cd97d-598c-49e4-b535-715641a7b093" },
  { email: "el-hassane@ep.fr", auth_id: "36e77bd1-5202-47db-b4d7-489cbf7c4ebf", employee_id: "47f94f10-aed4-4f08-962f-352ba57ace0e" },
  { email: "florian@ep.fr", auth_id: "c1fffc5d-c119-4267-bbb9-589c54d2d97c", employee_id: "6b203752-a542-47c6-8b19-4ab22b69e9aa" },
  { email: "jamaa@ep.fr", auth_id: "f3dd39a9-a1fd-45e4-a000-9957fdf48f63", employee_id: "7cce4c6e-a694-4647-bcc6-394928939e19" },
  { email: "jeremy@ep.fr", auth_id: "996f15d8-3846-48df-9997-a90f621ea0b0", employee_id: "103410a3-571d-41a8-b88d-4b280dda4fa3" },
  { email: "kamel@ep.fr", auth_id: "7f284886-106d-4a91-89e6-5254574a2b72", employee_id: "b0f1b3c0-f6b0-40d9-ad89-45dcd7982461" },
  { email: "khanh@ep.fr", auth_id: "6bea03f1-47da-4570-9623-1f635ee21be5", employee_id: "f4171ceb-031a-497b-b059-9039c3127113" },
  { email: "liyakath@ep.fr", auth_id: "6f5165e1-c7f9-4c8d-bae0-63f287cf8430", employee_id: "a81209bc-4eab-48b0-9981-86d8db9fb8d2" },
  { email: "mahin@ep.fr", auth_id: "8fd11cd0-ee02-4804-b5ab-568c5e1eed59", employee_id: "4e7503e3-c9b5-477c-aca1-9952cadb2d29" },
  { email: "massimo@ep.fr", auth_id: "7a6dcbcb-7899-4655-9419-19143abd063a", employee_id: "f3f75018-3572-4001-8010-783390d35915" },
  { email: "mohamed@ep.fr", auth_id: "c67bc6a7-c2ed-4fe1-8495-be268328e520", employee_id: "6f83a731-7530-4208-9f07-4ed29c71d1e5" },
  { email: "mohcine@ep.fr", auth_id: "209f9821-c9c1-4a5f-b9d2-eea1c23bb1cc", employee_id: "32598d42-79a5-474c-9327-96cf612cee2a" },
  { email: "mounir@ep.fr", auth_id: "88754738-ab83-40b8-b27e-7a1c59e4ba5d", employee_id: "cbc16e31-6b7b-4864-bc33-856109344171" },
  { email: "pascale@ep.fr", auth_id: "9d9c6d10-dc3a-4eee-8e02-f69aa2285833", employee_id: "3af35fc2-8dec-400e-ba3c-df44ac6a00c8" },
  { email: "rosalie@ep.fr", auth_id: "7ceeddf4-8f37-4f21-b8c3-2d5d25a0f1ca", employee_id: "6b6016ac-ac4d-4c9c-ba05-786d746d9c47" },
  { email: "wasim@ep.fr", auth_id: "174a4a98-615e-4b5a-8807-0c0cce30e5d6", employee_id: "1c0e94d5-0365-4ab1-9062-aef1207083a0" },
  { email: "yleana@ep.fr", auth_id: "3f4fa51f-30a8-4c4e-a900-a74e8bc0160c", employee_id: "2a9fac18-2041-4363-8aed-8a7f07ee4a54" },
] as const;

function normalizeEmployeeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapProfileRow(row: Record<string, unknown> | null): CollabProfile | null {
  if (!row) return null;
  const employee = row.employees as Record<string, unknown> | null | undefined;
  const mappedEmployee = employee
    ? {
        id: String(employee.id ?? ""),
        name: String(employee.name ?? ""),
        type: employee.type == null ? null : String(employee.type),
        observation: employee.observation == null ? null : String(employee.observation),
        horaire_standard: employee.horaire_standard == null ? null : String(employee.horaire_standard),
        horaire_mardi: employee.horaire_mardi == null ? null : String(employee.horaire_mardi),
        horaire_samedi: employee.horaire_samedi == null ? null : String(employee.horaire_samedi),
        actif: employee.actif == null ? null : Boolean(employee.actif),
      }
    : null;

  return {
    id: String(row.id ?? ""),
    role: row.role == null ? null : String(row.role),
    employee_id:
      row.employee_id == null
        ? mappedEmployee?.id || null
        : String(row.employee_id),
    first_login: Boolean(row.first_login),
    solde_cp: row.solde_cp == null ? null : Number(row.solde_cp),
    employees: mappedEmployee,
  };
}

export async function searchEmployeesByName(query: string) {
  if (!query || query.trim().length < 1) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, type, observation")
    .ilike("name", `${query.trim().toUpperCase()}%`)
    .eq("actif", true)
    .order("name")
    .limit(6);

  if (error) throw error;
  return data ?? [];
}

export function buildCollabEmail(name: string): string {
  return `${name.toLowerCase().trim().replace(/\s+/g, "-")}@ep.fr`;
}

export async function collabSignIn(name: string, pin: string) {
  const supabase = createClient();
  const email = buildCollabEmail(name);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });
    if (error) {
      throw error;
    }
    collabProfileCache = null;
    collabProfilePromise = null;
    return data;
  } catch {
    throw new Error("PIN incorrect");
  }
}

export async function collabSignOut() {
  const supabase = createClient();
  collabProfileCache = null;
  collabProfilePromise = null;
  await supabase.auth.signOut();
}

export async function getCollabProfile() {
  if (collabProfileCache && collabProfileCache.expiresAt > Date.now()) {
    return collabProfileCache.value;
  }
  if (collabProfilePromise) {
    return collabProfilePromise;
  }

  const supabase = createClient();
  collabProfilePromise = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      collabProfileCache = { value: null, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, employee_id, first_login, solde_cp, employees(id, name, type, observation, horaire_standard, horaire_mardi, horaire_samedi, actif)")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    const profile = mapProfileRow(data as Record<string, unknown> | null);

    if (profile?.employee_id) {
      collabProfileCache = { value: profile, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
      return profile;
    }

    const mappedByAuth = COLLAB_PROFILE_MAPPING.find((item) => item.auth_id === user.id || item.email === user.email?.toLowerCase());
    if (mappedByAuth) {
      const { data: mappedEmployee, error: mappedEmployeeError } = await supabase
        .from("employees")
        .select("id, name, type, observation, horaire_standard, horaire_mardi, horaire_samedi, actif")
        .eq("id", mappedByAuth.employee_id)
        .maybeSingle();

      if (mappedEmployeeError) throw mappedEmployeeError;

      const resolvedProfile = {
        id: profile?.id ?? user.id,
        role: profile?.role ?? "collaborateur",
        employee_id: mappedByAuth.employee_id,
        first_login: profile?.first_login ?? false,
        solde_cp: profile?.solde_cp ?? null,
        employees: mappedEmployee
          ? {
              id: String(mappedEmployee.id ?? ""),
              name: String(mappedEmployee.name ?? ""),
              type: mappedEmployee.type == null ? null : String(mappedEmployee.type),
              observation: mappedEmployee.observation == null ? null : String(mappedEmployee.observation),
              horaire_standard: mappedEmployee.horaire_standard == null ? null : String(mappedEmployee.horaire_standard),
              horaire_mardi: mappedEmployee.horaire_mardi == null ? null : String(mappedEmployee.horaire_mardi),
              horaire_samedi: mappedEmployee.horaire_samedi == null ? null : String(mappedEmployee.horaire_samedi),
              actif: mappedEmployee.actif == null ? null : Boolean(mappedEmployee.actif),
            }
          : null,
      };
      collabProfileCache = { value: resolvedProfile, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
      return resolvedProfile;
    }

    const emailLocalPart = String(user.email ?? "").split("@")[0]?.trim();
    if (!emailLocalPart) {
      collabProfileCache = { value: profile, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
      return profile;
    }

    const normalizedEmailKey = normalizeEmployeeKey(emailLocalPart);
    const { data: employees, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, type, observation, horaire_standard, horaire_mardi, horaire_samedi, actif")
      .eq("actif", true)
      .limit(200);

    if (employeeError) throw employeeError;

    const matchedEmployee = (employees ?? []).find((employee) => normalizeEmployeeKey(String(employee.name ?? "")) === normalizedEmailKey);
    if (!matchedEmployee) {
      collabProfileCache = { value: profile, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
      return profile;
    }

    const resolvedProfile = {
      id: profile?.id ?? user.id,
      role: profile?.role ?? "collaborateur",
      employee_id: String(matchedEmployee.id ?? ""),
      first_login: profile?.first_login ?? false,
      solde_cp: profile?.solde_cp ?? null,
      employees: {
        id: String(matchedEmployee.id ?? ""),
        name: String(matchedEmployee.name ?? ""),
        type: matchedEmployee.type == null ? null : String(matchedEmployee.type),
        observation: matchedEmployee.observation == null ? null : String(matchedEmployee.observation),
        horaire_standard: matchedEmployee.horaire_standard == null ? null : String(matchedEmployee.horaire_standard),
        horaire_mardi: matchedEmployee.horaire_mardi == null ? null : String(matchedEmployee.horaire_mardi),
        horaire_samedi: matchedEmployee.horaire_samedi == null ? null : String(matchedEmployee.horaire_samedi),
        actif: matchedEmployee.actif == null ? null : Boolean(matchedEmployee.actif),
      },
    };
    collabProfileCache = { value: resolvedProfile, expiresAt: Date.now() + COLLAB_PROFILE_CACHE_TTL_MS };
    return resolvedProfile;
  })();

  try {
    return await collabProfilePromise;
  } finally {
    collabProfilePromise = null;
  }
}

export async function changeCollabPin(newPin: string) {
  const supabase = createClient();
  if (!/^\d{6}$/.test(newPin)) {
    throw new Error("Le PIN doit être composé de 6 chiffres");
  }

  const { error } = await supabase.auth.updateUser({ password: newPin });
  if (error) throw error;
  collabProfileCache = null;
  collabProfilePromise = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ first_login: false })
      .eq("id", user.id);
    if (profileError) throw profileError;
  }
}

export async function isCollabAuthenticated() {
  const profile = await getCollabProfile();
  return profile?.role === "collaborateur";
}

