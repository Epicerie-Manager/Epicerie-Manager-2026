"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
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

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          password_changed: true,
        },
        { onConflict: "id" },
      );
      if (profileError) {
        setError(profileError.message);
        return;
      }

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
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            minHeight: "40px",
            borderRadius: "10px",
            border: "1px solid #dbe3eb",
            padding: "0 12px",
            fontSize: "14px",
          }}
        />

        <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>Confirmation</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          style={{
            minHeight: "40px",
            borderRadius: "10px",
            border: "1px solid #dbe3eb",
            padding: "0 12px",
            fontSize: "14px",
          }}
        />

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
          disabled={loading}
          style={{
            marginTop: "6px",
            minHeight: "42px",
            borderRadius: "10px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #b91c2e, #8f1222)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "14px",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </section>
  );
}
