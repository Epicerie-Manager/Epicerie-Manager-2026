"use client";

import { createClient } from "@/lib/supabase";

export type ManagerMobileProfile = {
  slug: string;
  displayName: string;
  initials: string;
};

export async function loadManagerMobileProfiles(): Promise<ManagerMobileProfile[]> {
  const response = await fetch("/api/manager-mobile/profiles", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les accès manager.");
  }

  const payload = (await response.json()) as { profiles?: ManagerMobileProfile[] };
  return Array.isArray(payload.profiles) ? payload.profiles : [];
}

export async function signInManagerMobile(slug: string, pin: string) {
  const response = await fetch("/api/manager-mobile/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ slug, pin }),
  });

  const payload = (await response.json()) as { tokenHash?: string; email?: string; error?: string };

  if (!response.ok || !payload.tokenHash) {
    throw new Error(payload.error || "Connexion manager impossible.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: payload.tokenHash,
    email: payload.email,
  });

  if (error) {
    throw error;
  }
}
