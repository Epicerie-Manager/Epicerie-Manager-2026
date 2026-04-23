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

function hasMinLength(value: string) {
  return value.length >= 12;
}

function hasLowercase(value: string) {
  return /[a-z]/.test(value);
}

function hasUppercase(value: string) {
  return /[A-Z]/.test(value);
}

function hasDigit(value: string) {
  return /\d/.test(value);
}

function hasSpecialChar(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function getPasswordChecks(value: string) {
  return [
    { label: "12 caractères minimum", valid: hasMinLength(value) },
    { label: "1 minuscule", valid: hasLowercase(value) },
    { label: "1 majuscule", valid: hasUppercase(value) },
    { label: "1 chiffre", valid: hasDigit(value) },
    { label: "1 caractère spécial", valid: hasSpecialChar(value) },
  ];
}

function getStrengthMeta(value: string) {
  const checks = getPasswordChecks(value);
  const score = checks.filter((check) => check.valid).length;

  if (!value) {
    return { score, label: "À définir", color: "#cbd5e1", background: "#e2e8f0", width: "0%" };
  }
  if (score <= 1) {
    return { score, label: "Faible", color: "#991b1b", background: "#fecaca", width: "25%" };
  }
  if (score <= 3) {
    return { score, label: "Moyen", color: "#9a3412", background: "#fdba74", width: "70%" };
  }
  return { score, label: "Fort", color: "#166534", background: "#86efac", width: "100%" };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordChecks = getPasswordChecks(password);
  const allPasswordChecksValid = passwordChecks.every((check) => check.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = allPasswordChecksValid && passwordsMatch && !loading;
  const strengthMeta = getStrengthMeta(password);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const restored = await restoreBrowserSessionMarker();
      if (!restored) {
        clearBrowserSessionState();
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      markBrowserSessionActive();
      recordBrowserActivity();
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_changed")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.password_changed === true) {
        router.replace("/");
      }
    };
    void checkAccess();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!allPasswordChecksValid) {
      setError("Le mot de passe ne respecte pas encore toutes les règles demandées.");
      return;
    }

    if (!passwordsMatch) {
      setError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password,
      });
      if (updatePasswordError) {
        setError(updatePasswordError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          password_changed: true,
          first_login: false,
        })
        .eq("id", user.id);
      if (profileError) {
        setError(profileError.message);
        return;
      }

      markBrowserSessionActive();
      recordBrowserActivity();
      router.replace("/");
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
          "radial-gradient(circle at 15% 10%, rgba(10,79,152,0.07) 0%, transparent 30%), radial-gradient(circle at 85% 80%, rgba(185,28,46,0.04) 0%, transparent 30%), linear-gradient(180deg, #f6f9fc 0%, #eef2f7 100%)",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(226,232,240,0.7)",
          borderRadius: "16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03),0 4px 16px rgba(0,0,0,0.04),0 12px 32px rgba(0,0,0,0.02)",
          padding: "22px",
          display: "grid",
          gap: "10px",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>Nouveau mot de passe</div>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
          Pour la première connexion, choisis un mot de passe personnel.
        </div>

        <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>Nouveau mot de passe</label>
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                minHeight: "40px",
                width: "100%",
                borderRadius: "10px",
                border: "1px solid #dbe3eb",
                padding: "0 92px 0 12px",
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                minHeight: "28px",
                padding: "0 10px",
                borderRadius: "999px",
                border: "1px solid #dbe3eb",
                background: "#fff",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showPassword ? "Cacher" : "Voir"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "6px",
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Force du mot de passe</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: strengthMeta.color }}>{strengthMeta.label}</span>
            </div>
            <div
              style={{
                height: "8px",
                borderRadius: "999px",
                background: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: strengthMeta.width,
                  height: "100%",
                  borderRadius: "999px",
                  background: strengthMeta.background,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: "4px" }}>
              {passwordChecks.map((check) => (
                <div
                  key={check.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: check.valid ? "#166534" : "#64748b",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "999px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: check.valid ? "#dcfce7" : "#e2e8f0",
                      color: check.valid ? "#166534" : "#64748b",
                      flexShrink: 0,
                    }}
                  >
                    {check.valid ? "✓" : "•"}
                  </span>
                  {check.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>Confirmation</label>
        <input
          type={showPassword ? "text" : "password"}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          style={{
            minHeight: "40px",
            borderRadius: "10px",
            border: `1px solid ${confirmPassword ? (passwordsMatch ? "#86efac" : "#fecaca") : "#dbe3eb"}`,
            padding: "0 12px",
            fontSize: "14px",
          }}
        />
        {confirmPassword ? (
          <div
            style={{
              fontSize: "12px",
              color: passwordsMatch ? "#166534" : "#991b1b",
            }}
          >
            {passwordsMatch ? "Les deux mots de passe correspondent." : "Les deux mots de passe doivent être identiques."}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              fontSize: "12px",
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              padding: "9px 10px",
              marginTop: "4px",
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            marginTop: "6px",
            minHeight: "42px",
            borderRadius: "10px",
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            background: "linear-gradient(135deg, #b91c2e, #8f1222)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "14px",
            opacity: canSubmit ? 1 : 0.55,
          }}
        >
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </section>
  );
}
