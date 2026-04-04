import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getRateLimitKey(ip: string, employeeId: string) {
  return `${ip}:${employeeId}`;
}

function checkRateLimit(ip: string, employeeId: string): { allowed: boolean; retryAfter?: number } {
  const key = getRateLimitKey(ip, employeeId);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  const elapsed = now - entry.firstAttempt;

  if (elapsed > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((WINDOW_MS - elapsed) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

function clearRateLimit(ip: string, employeeId: string) {
  loginAttempts.delete(getRateLimitKey(ip, employeeId));
}

export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded ? forwarded.split(",")[0].trim() : (realIp?.trim() || "unknown");
    const body = (await request.json()) as { employee_id?: string; pin?: string };
    const employeeId = String(body.employee_id ?? "").trim();
    const pin = String(body.pin ?? "").trim();

    if (!employeeId || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Parametres invalides." }, { status: 400 });
    }

    const rateCheck = checkRateLimit(ip, employeeId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Reessayez dans quelques minutes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfter ?? 0),
          },
        },
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data: pinValid, error: pinError } = await supabaseAdmin.rpc("verify_collab_pin", {
      p_employee_id: employeeId,
      p_pin: pin,
    });

    if (pinError || !pinValid) {
      return NextResponse.json({ error: "PIN incorrect." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(String(profile.id));

    const email = userData?.user?.email ?? null;
    if (userError || !email) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError) {
      throw linkError;
    }

    clearRateLimit(ip, employeeId);

    return NextResponse.json({
      actionLink: linkData.properties?.action_link ?? "",
      tokenHash: linkData.properties?.hashed_token ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion collaborateur impossible." },
      { status: 500 },
    );
  }
}
