"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markBrowserSessionActive, recordBrowserActivity } from "@/lib/browser-session";
import { createClient } from "@/lib/supabase";

export default function ManagerMobileAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const finalizeLogin = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/manager/login");
        return;
      }

      markBrowserSessionActive();
      recordBrowserActivity();

      if (!cancelled) {
        router.replace("/manager");
        router.refresh();
      }
    };

    void finalizeLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          borderRadius: 24,
          padding: "24px 22px",
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 18px 40px rgba(91,33,63,0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#111827" }}>
          Ouverture de l&apos;application manager...
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
          Connexion sécurisée en cours.
        </div>
      </div>
    </section>
  );
}
