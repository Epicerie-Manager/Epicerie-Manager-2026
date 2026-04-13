"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearBrowserSessionState,
  markBrowserSessionActive,
  recordBrowserActivity,
  restoreBrowserSessionMarker,
} from "@/lib/browser-session";
import { createClient } from "@/lib/supabase";

const PAGE_BG = "#F4F1ED";
const PANEL_RED = "#D40511";
const CARD_BG = "#FAFAF8";
const INPUT_BG = "#F5F2EE";
const INPUT_BORDER = "#E5E2DD";
const TEXT = "#1a1410";
const MUTED = "#999";

function featureStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "rgba(255,255,255,0.74)",
    lineHeight: 1.45,
  } as React.CSSProperties;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [router]);

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
        background: PAGE_BG,
        padding: "24px",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          display: "grid",
          gridTemplateColumns: "minmax(300px, 0.95fr) minmax(360px, 1.3fr)",
          background: CARD_BG,
          borderRadius: 30,
          overflow: "hidden",
          border: "1px solid #EDEBE7",
          boxShadow: "0 24px 60px rgba(60,40,20,0.08)",
        }}
      >
        <div
          style={{
            background: PANEL_RED,
            padding: "34px 30px 28px",
            color: "#fff",
            display: "grid",
            gap: 22,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 15,
              background: "rgba(255,255,255,0.18)",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            ÉM
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 34,
                lineHeight: 1.05,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              Épicerie
              <br />
              Manager
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 13,
                color: "rgba(255,255,255,0.68)",
                lineHeight: 1.65,
                maxWidth: 280,
              }}
            >
              Pilotage équipe, planning, absences et suivi terrain dans un seul espace.
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Connexion sécurisée au bureau manager",
              "Accès au planning et aux validations",
              "Saisie terrain et suivi collaborateur",
              "Données synchronisées avec Supabase",
            ].map((label) => (
              <div key={label} style={featureStyle()}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.45)",
                    flexShrink: 0,
                  }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", fontSize: 11, color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em" }}>
            Accès managers uniquement
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "40px 34px",
            display: "grid",
            placeItems: "center",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: 320,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: PANEL_RED }}>
              Connexion
            </div>
            <div
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 34,
                lineHeight: 1.05,
                fontWeight: 600,
                color: TEXT,
              }}
            >
              Bonjour
            </div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, marginBottom: 8 }}>
              Connecte-toi avec ton compte manager.
            </div>

            <label style={{ fontSize: 12, fontWeight: 500, color: "#888" }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom@ep.fr"
              style={{
                minHeight: 46,
                borderRadius: 10,
                border: `1px solid ${INPUT_BORDER}`,
                background: INPUT_BG,
                padding: "0 14px",
                fontSize: 14,
                color: TEXT,
                colorScheme: "light",
                outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            />

            <label style={{ fontSize: 12, fontWeight: 500, color: "#888", marginTop: 2 }}>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe"
                style={{
                  minHeight: 46,
                  width: "100%",
                  borderRadius: 10,
                  border: `1px solid ${INPUT_BORDER}`,
                  background: INPUT_BG,
                  padding: "0 50px 0 14px",
                  fontSize: 14,
                  color: TEXT,
                  colorScheme: "light",
                  outline: "none",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPassword}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 10,
                  transform: "translateY(-50%)",
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "none",
                  background: "transparent",
                  color: "#8B8178",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword ? <path d="M4 4 20 20" /> : null}
                </svg>
              </button>
            </div>

            {error ? (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: "#991b1b",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                minHeight: 46,
                borderRadius: 10,
                border: "none",
                background: PANEL_RED,
                color: "#fff",
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginTop: 6,
              }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <button
              type="button"
              style={{
                marginTop: 2,
                border: "none",
                background: "transparent",
                color: "#bbb",
                fontSize: 12,
                cursor: "default",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Mot de passe oublié ?
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
