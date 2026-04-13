import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildTemporaryOfficePassword } from "@/lib/temporary-password";
import { createAdminClient } from "@/lib/supabase-admin";

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { profile_id?: string; employee_name?: string };
    const profileId = String(body.profile_id ?? "").trim();
    const employeeName = String(body.employee_name ?? "").trim();

    if (!profileId) {
      return NextResponse.json({ error: "profile_id manquant" }, { status: 400 });
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

    const temporaryPassword = buildTemporaryOfficePassword(employeeName);
    const supabaseAdmin = createAdminClient();

    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
      password: temporaryPassword,
      user_metadata: employeeName ? { full_name: employeeName } : undefined,
    });

    if (updateUserError) {
      throw updateUserError;
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ first_login: true, password_changed: false })
      .eq("id", profileId);

    if (updateProfileError) {
      throw updateProfileError;
    }

    return NextResponse.json({ success: true, temporaryPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la reinitialisation du mot de passe." },
      { status: 500 },
    );
  }
}
