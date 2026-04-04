import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("manager_mobile_access")
      .select("slug, display_name, initials")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      profiles: (data ?? []).map((row) => ({
        slug: String(row.slug ?? ""),
        displayName: String(row.display_name ?? ""),
        initials: String(row.initials ?? "").trim() || String(row.display_name ?? "").slice(0, 2).toUpperCase(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger les profils manager." },
      { status: 500 },
    );
  }
}
