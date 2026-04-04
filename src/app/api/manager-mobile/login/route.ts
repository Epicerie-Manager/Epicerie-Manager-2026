import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type VerifyPinRow = {
  email: string;
  display_name: string;
  first_login: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { slug?: string; pin?: string };
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const pin = String(body.pin ?? "").trim();

    if (!slug || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Code PIN invalide." }, { status: 400 });
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

    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/manager/auth/callback`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      throw linkError;
    }

    return NextResponse.json({
      actionLink: linkData.properties?.action_link ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion manager impossible." },
      { status: 500 },
    );
  }
}
