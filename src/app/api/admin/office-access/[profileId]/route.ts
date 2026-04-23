import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  canWriteOfficeModule,
  normalizeAllowedModules,
  normalizeModulePermissions,
  type ModuleAccessKey,
  type ModulePermissions,
} from "@/lib/modules-config";
import { isAdminUser } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase-admin";

type UpdateOfficeAccessPayload = {
  fullName?: string;
  email?: string;
  employeeId?: string | null;
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
        // Validation de session seulement.
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

async function assertAdmin(request: NextRequest) {
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
    .select("email,role,allowed_modules,module_permissions")
    .eq("id", user.id)
    .maybeSingle();
  if (isMissingModulePermissionsColumnError(profileQuery.error)) {
    profileQuery = await supabase
      .from("profiles")
      .select("email,role,allowed_modules")
      .eq("id", user.id)
      .maybeSingle();
  }
  if (profileQuery.error) throw profileQuery.error;

  const profile = profileQuery.data;
  const email = normalizeEmail(profile?.email ?? user.email);
  const role = String(profile?.role ?? "");
  const allowed_modules = normalizeAllowedModules(profile?.allowed_modules);
  const module_permissions = normalizeModulePermissions(profile?.module_permissions);

  if (!isAdminUser(email, role) || !canWriteOfficeModule({ role, allowed_modules, module_permissions }, "rh")) {
    throw new Error("Action réservée à l'administrateur.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> },
) {
  try {
    await assertAdmin(request);
    const { profileId } = await context.params;
    const payload = (await request.json()) as UpdateOfficeAccessPayload;
    const fullName = String(payload.fullName ?? "").trim();
    const email = normalizeEmail(payload.email);
    const employeeId = String(payload.employeeId ?? "").trim() || null;
    const role = normalizeRole(payload.role);
    const modulePermissions = role === "manager" ? {} : normalizeModulePermissions(payload.module_permissions);
    const allowedModules = role === "manager" ? [] : (Object.keys(modulePermissions) as ModuleAccessKey[]);

    if (!profileId) {
      return NextResponse.json({ error: "Profil bureau introuvable." }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "Nom bureau requis." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email bureau invalide." }, { status: 400 });
    }

    if (role !== "manager" && allowedModules.length === 0) {
      return NextResponse.json({ error: "Sélectionne au moins un module autorisé." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const existingLink = employeeId
      ? await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("employee_id", employeeId)
          .neq("id", profileId)
          .maybeSingle()
      : { data: null, error: null };
    if (existingLink.error) throw existingLink.error;
    if (existingLink.data?.id) {
      return NextResponse.json({ error: "Cette fiche RH est déjà liée à un autre accès bureau." }, { status: 400 });
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
      email,
      user_metadata: { full_name: fullName },
    });
    if (authUpdateError) throw authUpdateError;

    let profileUpdate = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role,
        employee_id: employeeId,
        allowed_modules: allowedModules,
        module_permissions: modulePermissions,
      })
      .eq("id", profileId);

    if (isMissingModulePermissionsColumnError(profileUpdate.error)) {
      profileUpdate = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          role,
          employee_id: employeeId,
          allowed_modules: allowedModules,
        })
        .eq("id", profileId);
    }

    if (profileUpdate.error) throw profileUpdate.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de mettre à jour l'accès bureau." },
      { status: 500 },
    );
  }
}
