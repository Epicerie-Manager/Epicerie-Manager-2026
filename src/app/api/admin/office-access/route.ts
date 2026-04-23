import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  canReadOfficeModule,
  canWriteOfficeModule,
  getProfileModulePermissions,
  normalizeAllowedModules,
  normalizeModulePermissions,
  type ModuleAccessKey,
  type ModulePermissions,
} from "@/lib/modules-config";
import { isAdminUser } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildTemporaryOfficePassword } from "@/lib/temporary-password";

type OfficeAccessPayload = {
  profileId?: string;
  employeeId?: string | null;
  fullName?: string;
  email?: string;
  role?: string;
  module_permissions?: ModulePermissions;
};

function createRouteSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Variables Supabase publiques manquantes.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll() {
        // Route de lecture/validation uniquement.
      },
    },
  });
}

function isMissingModulePermissionsColumnError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("module_permissions") && (message.includes("column") || message.includes("schema cache"));
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRole(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "manager" || normalized === "admin" || normalized === "viewer" || normalized === "gestionnaire") return normalized;
  return "custom_access";
}

function canPersistAllowedModules(role: string) {
  return ["gestionnaire", "viewer", "collaborateur", "custom_access"].includes(role);
}

async function loadRequestActor(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Connexion requise.");
  }

  let profileQuery = await supabase
    .from("profiles")
    .select("id,email,role,allowed_modules,module_permissions")
    .eq("id", user.id)
    .maybeSingle();

  if (isMissingModulePermissionsColumnError(profileQuery.error)) {
    profileQuery = await supabase
      .from("profiles")
      .select("id,email,role,allowed_modules")
      .eq("id", user.id)
      .maybeSingle();
  }

  if (profileQuery.error) throw profileQuery.error;

  const profile = profileQuery.data;
  const email = normalizeEmail(profile?.email ?? user.email);
  const role = String(profile?.role ?? "");
  const allowed_modules = normalizeAllowedModules(profile?.allowed_modules);
  const module_permissions = normalizeModulePermissions(profile?.module_permissions);

  if (!isAdminUser(email, role)) {
    throw new Error("Accès réservé à l'administrateur.");
  }

  if (!canReadOfficeModule({ role, allowed_modules, module_permissions }, "rh")) {
    throw new Error("Accès module RH requis.");
  }

  return { user, profile: { role, allowed_modules, module_permissions } };
}

async function buildListPayload() {
  const supabaseAdmin = createAdminClient();

  const employeesQuery = await supabaseAdmin
    .from("employees")
    .select("id,name,actif,rh_status,type")
    .order("name", { ascending: true });
  if (employeesQuery.error) throw employeesQuery.error;

  type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    employee_id: string | null;
    allowed_modules: ModuleAccessKey[] | null;
    module_permissions?: ModulePermissions | null;
    password_changed: boolean | null;
  };

  let profilesData: ProfileRow[] = [];
  const profilesQuery = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,email,role,employee_id,allowed_modules,module_permissions,password_changed")
    .order("full_name", { ascending: true });

  if (isMissingModulePermissionsColumnError(profilesQuery.error)) {
    const fallbackProfilesQuery = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,email,role,employee_id,allowed_modules,password_changed")
      .order("full_name", { ascending: true });
    if (fallbackProfilesQuery.error) throw fallbackProfilesQuery.error;
    profilesData = (fallbackProfilesQuery.data ?? []) as ProfileRow[];
  } else {
    if (profilesQuery.error) throw profilesQuery.error;
    profilesData = (profilesQuery.data ?? []) as ProfileRow[];
  }

  const employees = employeesQuery.data ?? [];
  const profiles = profilesData.map((profile) => {
    const role = normalizeRole(profile.role);
    const allowedModules = normalizeAllowedModules(profile.allowed_modules);
    const modulePermissions = getProfileModulePermissions({
      role,
      allowed_modules: allowedModules,
      module_permissions: profile.module_permissions,
    });
    const hasOfficeAccess =
      role === "manager" ||
      role === "admin" ||
      Object.keys(modulePermissions).length > 0;

    return {
      id: String(profile.id),
      full_name: String(profile.full_name ?? "").trim(),
      email: normalizeEmail(profile.email),
      role,
      employee_id: profile.employee_id == null ? null : String(profile.employee_id),
      allowed_modules: Object.keys(modulePermissions).length > 0
        ? (Object.keys(modulePermissions) as ModuleAccessKey[])
        : allowedModules,
      module_permissions: modulePermissions,
      password_changed: profile.password_changed === true,
      has_office_access: hasOfficeAccess,
    };
  });

  return {
    employees: employees.map((employee) => ({
      id: String(employee.id),
      name: String(employee.name ?? "").trim(),
      actif: employee.actif !== false,
      rh_status: String(employee.rh_status ?? "").trim(),
      type: String(employee.type ?? "").trim(),
    })),
    profiles,
  };
}

async function createOfficeAccess(payload: OfficeAccessPayload) {
  const fullName = String(payload.fullName ?? "").trim();
  const email = normalizeEmail(payload.email);
  const role = normalizeRole(payload.role);
  const employeeId = String(payload.employeeId ?? "").trim() || null;
  const rawPermissions = normalizeModulePermissions(payload.module_permissions);
  const modulePermissions = role === "manager"
    ? {}
    : canPersistAllowedModules(role)
      ? rawPermissions
      : {};
  const allowedModules = role === "manager"
    ? []
    : Object.keys(modulePermissions) as ModuleAccessKey[];

  if (!fullName) {
    throw new Error("Nom bureau requis.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Email bureau invalide.");
  }

  if (role !== "manager" && Object.keys(modulePermissions).length === 0) {
    throw new Error("Sélectionne au moins un module autorisé.");
  }

  const supabaseAdmin = createAdminClient();

  const existingByEmployee = employeeId
    ? await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("employee_id", employeeId)
        .maybeSingle()
    : { data: null, error: null };
  if (existingByEmployee.error) throw existingByEmployee.error;
  if (existingByEmployee.data?.id) {
    throw new Error("Cette fiche RH possède déjà un profil bureau. Modifie-le depuis la liste.");
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: buildTemporaryOfficePassword(fullName),
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (createUserError || !createdUser.user?.id) {
    throw createUserError ?? new Error("Impossible de créer le compte bureau.");
  }

  const profilePayload = {
    id: createdUser.user.id,
    full_name: fullName,
    email,
    role,
    employee_id: employeeId,
    first_login: true,
    password_changed: false,
    allowed_modules: role === "manager" ? [] : allowedModules,
    module_permissions: role === "manager" ? {} : modulePermissions,
  };

  let profileInsert = await supabaseAdmin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (isMissingModulePermissionsColumnError(profileInsert.error)) {
    profileInsert = await supabaseAdmin.from("profiles").upsert({
      ...profilePayload,
      module_permissions: undefined,
    }, { onConflict: "id" });
  }

  if (profileInsert.error) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    throw profileInsert.error;
  }
}

export async function GET(request: NextRequest) {
  try {
    await loadRequestActor(request);
    return NextResponse.json(await buildListPayload());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger les accès bureau." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await loadRequestActor(request);
    if (!canWriteOfficeModule(actor.profile, "rh")) {
      return NextResponse.json({ error: "Action réservée à l'administrateur." }, { status: 403 });
    }

    const payload = (await request.json()) as OfficeAccessPayload;
    await createOfficeAccess(payload);
    return NextResponse.json(await buildListPayload());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de créer l'accès bureau." },
      { status: 500 },
    );
  }
}
