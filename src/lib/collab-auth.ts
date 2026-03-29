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

function mapProfileRow(row: Record<string, unknown> | null): CollabProfile | null {
  if (!row) return null;
  const employee = row.employees as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id ?? ""),
    role: row.role == null ? null : String(row.role),
    employee_id: row.employee_id == null ? null : String(row.employee_id),
    first_login: Boolean(row.first_login),
    solde_cp: row.solde_cp == null ? null : Number(row.solde_cp),
    employees: employee
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
      : null,
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
  console.log("tentative connexion:", email);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });
    if (error) {
      console.error("[collabSignIn] signInWithPassword failed", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("[collabSignIn] unexpected error", error);
    throw new Error("PIN incorrect");
  }
}

export async function collabSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function getCollabProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, employee_id, first_login, solde_cp, employees(id, name, type, observation, horaire_standard, horaire_mardi, horaire_samedi, actif)")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return mapProfileRow(data as Record<string, unknown> | null);
}

export async function changeCollabPin(newPin: string) {
  const supabase = createClient();
  if (!/^\d{6}$/.test(newPin)) {
    throw new Error("Le PIN doit être composé de 6 chiffres");
  }

  const { error } = await supabase.auth.updateUser({ password: newPin });
  if (error) throw error;

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

