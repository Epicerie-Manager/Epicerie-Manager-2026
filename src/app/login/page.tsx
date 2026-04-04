"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearBrowserSessionState,
  markBrowserSessionActive,
  recordBrowserActivity,
  restoreBrowserSessionMarker,
} from "@/lib/browser-session";
import { isManagerProject } from "@/lib/app-variant";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const isManagerApp = isManagerProject();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isManagerApp) {
      router.replace("/manager/login");
      return;
    }

    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const restored = await restoreBrowserSessionMarker();
      if (!restored) {
        clearBrowserSessionState();
        await supabase.auth.signOut();
        return;
      }
      markBrowserSessionActive();
      recordBrowserActivity();
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_changed")
        .eq("id", user.id)
        .maybeSingle();
      router.replace(profile?.password_changed ? "/" : "/change-password");
    };
    void checkSession();
  }, [isManagerApp, router]);

  if (isManagerApp) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      markBrowserSessionActive();
      recordBrowserActivity();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_changed")
        .eq("id", user.id)
        .maybeSingle();
      router.replace(profile?.password_changed ? "/" : "/change-password");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 15% 10%, rgba(185,28,46,0.1) 0%, transparent 30%), radial-gradient(circle at 85% 80%, rgba(10,79,152,0.08) 0%, transparent 34%), linear-gradient(180deg, #f7f3ee 0%, #edf2f8 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "468px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div
          style={{
            borderRadius: "28px",
            padding: "22px 24px",
            background: "rgba(255,255,255,0.86)",
            border: "1px solid rgba(255,255,255,0.75)",
            boxShadow: "0 20px 50px rgba(68,39,20,0.1)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #b91c2e, #8f1222)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 10px 24px rgba(185,28,46,0.24)",
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                }}
              >
                É
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9f1239" }}>
                  Application manager
                </div>
                <div style={{ marginTop: 4, fontSize: 30, fontWeight: 900, letterSpacing: "-0.05em", color: "#111827" }}>
                  Connexion
                </div>
              </div>
            </div>
            <div
              style={{
                borderRadius: 999,
                padding: "7px 10px",
                background: "#fff",
                border: "1px solid rgba(185,28,46,0.14)",
                color: "#9f1239",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              Acces securise
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
            Connecte-toi avec ton compte manager pour accéder au bureau et à l’application mobile.
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(226,232,240,0.7)",
            borderRadius: "24px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03),0 4px 16px rgba(0,0,0,0.04),0 18px 42px rgba(0,0,0,0.04)",
            padding: "22px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 4,
              paddingBottom: 4,
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>Bienvenue</div>
            <div style={{ fontSize: "13px", color: "#64748b" }}>Saisie ton email et ton mot de passe habituels.</div>
          </div>

          <label style={{ fontSize: "12px", color: "#475569", fontWeight: 700 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom.nom@..."
            style={{
              minHeight: "46px",
              borderRadius: "14px",
              border: "1px solid #dbe3eb",
              padding: "0 14px",
              fontSize: "14px",
              background: "#fbfdff",
            }}
          />

          <label style={{ fontSize: "12px", color: "#475569", fontWeight: 700 }}>Mot de passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            style={{
              minHeight: "46px",
              borderRadius: "14px",
              border: "1px solid #dbe3eb",
              padding: "0 14px",
              fontSize: "14px",
              background: "#fbfdff",
            }}
          />

          {error ? (
            <div
              style={{
                fontSize: "12px",
                color: "#991b1b",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "10px 12px",
                marginTop: "2px",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              minHeight: "46px",
              borderRadius: "14px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, #b91c2e, #8f1222)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "-0.01em",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 12px 24px rgba(185,28,46,0.22)",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </section>
  );
}
