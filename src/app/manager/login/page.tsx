"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadManagerMobileProfiles, type ManagerMobileProfile } from "@/lib/manager-mobile-auth";

function shellCardStyle(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(255,255,255,0.78)",
    boxShadow: "0 16px 40px rgba(91,33,63,0.08)",
    overflow: "hidden",
  };
}

export default function ManagerMobileLoginPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ManagerMobileProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const nextProfiles = await loadManagerMobileProfiles();
        if (!cancelled) setProfiles(nextProfiles);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger les accès manager.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCardStyle()}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: "linear-gradient(135deg, #b91c2e, #8f1222)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 10px 22px rgba(185,28,46,0.24)",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            EM
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9f1239" }}>
              Application manager
            </div>
            <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, letterSpacing: "-0.05em", color: "#111827" }}>
              Choisissez votre profil
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
          Touchez votre pastille puis entrez votre code PIN personnel pour ouvrir l&apos;application manager.
        </div>
      </div>

      <div style={{ ...shellCardStyle(), display: "grid", gap: 12 }}>
        {loading ? <div style={{ fontSize: 13, color: "#64748b" }}>Chargement des profils manager...</div> : null}
        {error ? (
          <div
            style={{
              fontSize: 12,
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            {error}
          </div>
        ) : null}
        {!loading && !error && profiles.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Aucun accès manager mobile n&apos;est encore configuré.</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {profiles.map((profile) => (
            <button
              key={profile.slug}
              type="button"
              onClick={() => router.push(`/manager/pin?profile=${encodeURIComponent(profile.slug)}`)}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr 20px",
                alignItems: "center",
                gap: 12,
                padding: "14px 12px",
                borderRadius: 20,
                border: "1px solid rgba(226,232,240,0.9)",
                background: "linear-gradient(180deg, #ffffff 0%, #fff8f6 100%)",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(17,24,39,0.05)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #b91c2e, #8f1222)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                }}
              >
                {profile.initials || "EM"}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{profile.displayName}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>Accès manager mobile</div>
              </div>
              <div style={{ color: "#9f1239", fontSize: 20, fontWeight: 700 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
