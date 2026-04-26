import { createClient } from "@/lib/supabase";
import { endSessionLog } from "@/lib/session-log-client";

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

export async function collabSignIn(employeeId: string, pin: string) {
  const response = await fetch("/api/collab/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ employee_id: employeeId, pin }),
  });

  const payload = (await response.json()) as { tokenHash?: string; actionLink?: string; error?: string };

  if (!response.ok || !payload.tokenHash) {
    throw new Error(payload.error || "PIN incorrect");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: payload.tokenHash,
  });

  if (error) {
    throw error;
  }

  collabProfileCache = null;
  collabProfilePromise = null;
}

export async function collabSignOut() {
  const supabase = createClient();
  collabProfileCache = null;
  collabProfilePromise = null;
  await endSessionLog("collab", "Collab");
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

