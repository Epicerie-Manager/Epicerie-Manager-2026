"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { loadManagerMobileProfiles, signInManagerMobile, type ManagerMobileProfile } from "@/lib/manager-mobile-auth";
import { createClient } from "@/lib/supabase";

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
  const [selectedProfileSlug, setSelectedProfileSlug] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          router.replace("/manager");
          return;
        }

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
  }, [router]);

  const selectedProfile = profiles.find((profile) => profile.slug === selectedProfileSlug) ?? null;

  const handleProfileSelect = (slug: string) => {
    setSelectedProfileSlug(slug);
    setPin("");
    setPinError("");
  };

  const handlePinDigit = (digit: string) => {
    if (busy || !selectedProfileSlug) return;
    setPinError("");
    const nextPin = `${pin}${digit}`.slice(0, 6);
    setPin(nextPin);

    if (nextPin.length !== 6) return;

    setBusy(true);
    void signInManagerMobile(selectedProfileSlug, nextPin)
      .then(() => {
        router.replace("/manager");
        router.refresh();
      })
      .catch((signInError) => {
        setPinError(signInError instanceof Error ? signInError.message : "Code PIN incorrect.");
        setPin("");
      })
      .finally(() => setBusy(false));
  };

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
          {selectedProfile
            ? "Entrez votre code PIN personnel pour ouvrir l'application manager."
            : "Touchez votre pastille puis entrez votre code PIN personnel pour ouvrir l'application manager."}
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

        {selectedProfile ? (
          <div style={{ display: "grid", gap: 14 }}>
            <button
              type="button"
              onClick={() => {
                if (busy) return;
                setSelectedProfileSlug("");
                setPin("");
                setPinError("");
              }}
              style={{
                justifySelf: "start",
                border: "none",
                background: "transparent",
                color: "#9f1239",
                fontSize: 14,
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
                padding: 0,
                opacity: busy ? 0.6 : 1,
              }}
            >
              ← Changer de profil
            </button>

            <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 26,
                  background: "linear-gradient(135deg, #b91c2e, #8f1222)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 12px 26px rgba(185,28,46,0.24)",
                  fontSize: 28,
                  fontWeight: 900,
                }}
              >
                {selectedProfile.initials || "EM"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#111827" }}>
                {selectedProfile.displayName}
              </div>
            </div>

            <PinDots value={pin} />
            {pinError ? (
              <div style={{ textAlign: "center", color: "#991b1b", fontSize: 13 }}>{pinError}</div>
            ) : null}
            <NumericKeypad
              disabled={busy}
              onDigit={handlePinDigit}
              onBackspace={() => {
                if (busy) return;
                setPin((current) => current.slice(0, -1));
              }}
            />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {profiles.map((profile) => (
              <button
                key={profile.slug}
                type="button"
                onClick={() => handleProfileSelect(profile.slug)}
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
        )}
      </div>
    </section>
  );
}
