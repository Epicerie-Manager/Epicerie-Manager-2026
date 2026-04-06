import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

type CreateCollaboratorBody = {
  n?: string;
  t?: "M" | "S" | "E";
  hs?: string | null;
  hm?: string | null;
  hsa?: string | null;
  obs?: string;
  actif?: boolean;
  rayons?: string[];
  ruptures_rayons?: number[];
  cycle?: string[];
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

function buildEmailBase(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const dotted = normalized
    .split(" ")
    .filter(Boolean)
    .join(".")
    .replace(/\.{2,}/g, ".")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+|\.+$/g, "");

  return dotted || "collaborateur";
}

function isDuplicateEmailError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("exists") ||
    normalized.includes("registered") ||
    normalized.includes("duplicate")
  );
}

function normalizeEmployeeRuptureRayons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item)),
  )).sort((a, b) => a - b);
}

async function createUserWithUniqueEmail(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  displayName: string,
) {
  const base = buildEmailBase(displayName);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const email = `${base}${suffix === 0 ? "" : suffix + 1}@ep.fr`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "000000",
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
      },
    });

    if (!error && data.user) {
      return { email, userId: data.user.id };
    }

    if (!isDuplicateEmailError(error)) {
      throw error ?? new Error("Erreur création compte auth.");
    }
  }

  throw new Error("Impossible de generer un email unique pour ce collaborateur.");
}

export async function POST(request: NextRequest) {
  let createdEmployeeId: string | null = null;
  let createdAuthUserId: string | null = null;
  let createdProfileId: string | null = null;

  try {
    const body = (await request.json()) as CreateCollaboratorBody;
    const employeeName = String(body.n ?? "").trim().toUpperCase();
    const employeeType = body.t ?? "M";
    const employeeRole = String(body.obs ?? "Collaborateur").trim();
    const employeeCycle = Array.isArray(body.cycle) ? body.cycle.slice(0, 5) : [];

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (String(profile?.role ?? "").toLowerCase() !== "manager") {
      return NextResponse.json({ error: "Action reservee aux managers." }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const employeePayload = {
      name: employeeName,
      type: normalizeRhTypeToDb(employeeType),
      horaire_standard: body.hs ?? null,
      horaire_mardi: body.hm ?? null,
      horaire_samedi: body.hsa ?? null,
      observation: employeeRole,
      actif: body.actif !== false,
      tg_rayons: normalizeEmployeeRayons(body.rayons),
      ruptures_rayons: normalizeEmployeeRuptureRayons(body.ruptures_rayons),
    };

    const { data: insertedEmployee, error: insertEmployeeError } = await supabaseAdmin
      .from("employees")
      .insert(employeePayload)
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif,tg_rayons,ruptures_rayons")
      .single();

    if (insertEmployeeError || !insertedEmployee?.id) {
      throw insertEmployeeError ?? new Error("Erreur creation employe.");
    }

    createdEmployeeId = String(insertedEmployee.id);

    const { email, userId } = await createUserWithUniqueEmail(supabaseAdmin, employeeName);
    createdAuthUserId = userId;

    const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: employeeName,
      email,
      role: "collaborateur",
      employee_id: insertedEmployee.id,
      first_login: true,
      password_changed: false,
    });

    if (profileInsertError) {
      throw profileInsertError;
    }

    createdProfileId = userId;

    if (employeeCycle.length) {
      const cyclePayload = employeeCycle.map((jour, index) => ({
        employee_id: insertedEmployee.id,
        semaine_cycle: index + 1,
        jour_repos: String(jour ?? "LUN").trim().toUpperCase() || "LUN",
      }));

      const { error: cycleError } = await supabaseAdmin.from("cycle_repos").insert(cyclePayload);
      if (cycleError) {
        throw cycleError;
      }
    }

    return NextResponse.json({
      success: true,
      email,
      initialPin: "000000",
      employee: insertedEmployee,
    });
  } catch (error) {
    const supabaseAdmin = createAdminClient();

    if (createdProfileId) {
      await supabaseAdmin.from("profiles").delete().eq("id", createdProfileId);
    }

    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    if (createdEmployeeId) {
      await supabaseAdmin.from("cycle_repos").delete().eq("employee_id", createdEmployeeId);
      await supabaseAdmin.from("employees").delete().eq("id", createdEmployeeId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la creation du collaborateur." },
      { status: 500 },
    );
  }
}
