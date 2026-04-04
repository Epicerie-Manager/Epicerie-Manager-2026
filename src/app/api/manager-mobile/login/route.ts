import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type VerifyPinRow = {
  email: string;
  display_name: string;
  first_login: boolean;
};

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getRateLimitKey(ip: string, slug: string) {
  return `${ip}:${slug}`;
}

function checkRateLimit(ip: string, slug: string): { allowed: boolean; retryAfter?: number } {
  const key = getRateLimitKey(ip, slug);
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

function clearRateLimit(ip: string, slug: string) {
  loginAttempts.delete(getRateLimitKey(ip, slug));
}

export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded ? forwarded.split(",")[0].trim() : (realIp?.trim() || "unknown");
    const body = (await request.json()) as { slug?: string; pin?: string };
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const pin = String(body.pin ?? "").trim();

    if (!slug || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Code PIN invalide." }, { status: 400 });
    }

    const rateCheck = checkRateLimit(ip, slug);
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

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("verify_manager_mobile_pin", {
      p_slug: slug,
      p_pin: pin,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? (data[0] as VerifyPinRow | undefined) : undefined;

    if (!row?.email) {
      return NextResponse.json({ error: "Code PIN incorrect." }, { status: 401 });
    }

    clearRateLimit(ip, slug);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
    });

    if (linkError) {
      throw linkError;
    }

    return NextResponse.json({
      tokenHash: linkData.properties?.hashed_token ?? "",
      email: row.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion manager impossible." },
      { status: 500 },
    );
  }
}
