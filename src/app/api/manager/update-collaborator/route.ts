import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  canWriteOfficeModule,
  getProfileModulePermissions,
  normalizeAllowedModules,
  normalizeModulePermissions,
} from "@/lib/modules-config";
import { getRhEmployeeDbStatus, getRhEmployeeRoleLabel } from "@/lib/rh-status";
import { createAdminClient } from "@/lib/supabase-admin";

type UpdateCollaboratorBody = {
  dbId?: string;
  profileId?: string;
  n?: string;
  t?: "M" | "S" | "E";
  hs?: string | null;
  hm?: string | null;
  hsa?: string | null;
  obs?: string;
  rh_status?: string;
  actif?: boolean;
  rayons?: string[];
  ruptures_rayons?: number[];
  profile_role?: string;
  allowed_modules?: string[];
  module_permissions?: Record<string, string>;
};

function canPersistAllowedModules(profileRole: string) {
  return ["gestionnaire", "viewer", "collaborateur", "custom_access"].includes(profileRole);
}

function isMissingModulePermissionsColumnError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("module_permissions") && (message.includes("column") || message.includes("schema cache"));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Erreur lors de la mise a jour du collaborateur.");
  }
  return "Erreur lors de la mise a jour du collaborateur.";
}

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
        // No-op: this route only validates the current session.
      },
    },
  });
}

function normalizeRhTypeToDb(value: "M" | "S" | "E") {
  if (value === "S") return "APRES-MIDI";
  if (value === "E") return "ETUDIANT";
  return "MATIN";
}

function normalizeEmployeeRayons(value: unknown) {
  if (!Array.isArray(value)) return [];
  const rayons = value
    .map((item) => String(item ?? "").trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(rayons)).sort((a, b) => a.localeCompare(b, "fr"));
}

function normalizeEmployeeRuptureRayons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item)),
  )).sort((a, b) => a - b);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateCollaboratorBody;
    const employeeId = String(body.dbId ?? "").trim();
    const profileId = String(body.profileId ?? "").trim();
    const employeeName = String(body.n ?? "").trim().toUpperCase();
    const employeeType = body.t ?? "M";
    const employeeRoleLabel = getRhEmployeeRoleLabel(body.rh_status ?? "Collaborateur", employeeType);
    const employeeRhStatus = getRhEmployeeDbStatus(body.rh_status ?? employeeRoleLabel, employeeType);
    const profileRole = String(body.profile_role ?? "collaborateur").trim().toLowerCase() || "collaborateur";
    const allowedModules = canPersistAllowedModules(profileRole) ? normalizeAllowedModules(body.allowed_modules) : [];
    const modulePermissions = canPersistAllowedModules(profileRole)
      ? getProfileModulePermissions({
          role: profileRole,
          allowed_modules: allowedModules,
          module_permissions: normalizeModulePermissions(body.module_permissions),
        })
      : {};

    if (!employeeId) {
      return NextResponse.json({ error: "dbId manquant." }, { status: 400 });
    }

    if (employeeName.length < 2) {
      return NextResponse.json({ error: "Nom collaborateur invalide." }, { status: 400 });
    }

    const supabase = createRouteSupabaseClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    let profileQuery = await supabase
      .from("profiles")
      .select("role,allowed_modules,module_permissions")
      .eq("id", user.id)
      .maybeSingle();
    if (isMissingModulePermissionsColumnError(profileQuery.error)) {
      profileQuery = await supabase
        .from("profiles")
        .select("role,allowed_modules")
        .eq("id", user.id)
        .maybeSingle();
    }
    const { data: profile, error: profileError } = profileQuery;

    if (profileError) {
      throw profileError;
    }

    if (!canWriteOfficeModule({
      role: String(profile?.role ?? ""),
      allowed_modules: normalizeAllowedModules(profile?.allowed_modules),
      module_permissions: normalizeModulePermissions(profile?.module_permissions),
    }, "rh")) {
      return NextResponse.json({ error: "Action reservee aux managers." }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const employeePayload = {
      name: employeeName,
      type: normalizeRhTypeToDb(employeeType),
      horaire_standard: body.hs ?? null,
      horaire_mardi: body.hm ?? null,
      horaire_samedi: body.hsa ?? null,
      observation: employeeRoleLabel,
      rh_status: employeeRhStatus,
      actif: body.actif !== false,
      tg_rayons: normalizeEmployeeRayons(body.rayons),
      ruptures_rayons: normalizeEmployeeRuptureRayons(body.ruptures_rayons),
    };

    const { data: updatedEmployee, error: updateEmployeeError } = await supabaseAdmin
      .from("employees")
      .update(employeePayload)
      .eq("id", employeeId)
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,rh_status,actif,tg_rayons,ruptures_rayons")
      .maybeSingle();

    if (updateEmployeeError || !updatedEmployee) {
      throw updateEmployeeError ?? new Error("Erreur mise a jour employe.");
    }

    if (profileId) {
      let profileUpdate = await supabaseAdmin
        .from("profiles")
        .update({
          role: profileRole,
          allowed_modules: Object.keys(modulePermissions).length > 0
            ? Object.keys(modulePermissions)
            : allowedModules,
          module_permissions: modulePermissions,
          full_name: employeeName,
        })
        .eq("id", profileId);

      if (isMissingModulePermissionsColumnError(profileUpdate.error)) {
        profileUpdate = await supabaseAdmin
          .from("profiles")
          .update({
            role: profileRole,
            allowed_modules: Object.keys(modulePermissions).length > 0
              ? Object.keys(modulePermissions)
              : allowedModules,
            full_name: employeeName,
          })
          .eq("id", profileId);
      }

      if (profileUpdate.error) throw profileUpdate.error;
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...updatedEmployee,
        profile_id: profileId || null,
        profile_role: profileRole,
        allowed_modules: Object.keys(modulePermissions).length > 0
          ? Object.keys(modulePermissions)
          : allowedModules,
        module_permissions: modulePermissions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
