"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { loadManagerMobileProfiles, signInManagerMobile, type ManagerMobileProfile } from "@/lib/manager-mobile-auth";
import { createClient } from "@/lib/supabase";

const RED = "#D40511";
const PAGE_BG = "#F4F1ED";
const CARD_BG = "#FAFAF8";
const CARD_LINE = "#EDEBE7";
const TEXT = "#1a1410";

function shellCardStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: CARD_BG,
    border: `1px solid ${CARD_LINE}`,
    boxShadow: "0 18px 44px rgba(60,40,20,0.06)",
  };
}

export default function ManagerMobileLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<ManagerMobileProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProfileSlug, setSelectedProfileSlug] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinError, setPinError] = useState("");
  const previewMode = searchParams.get("preview") === "1";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!previewMode) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            router.replace("/manager");
            return;
          }
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
  }, [previewMode, router]);

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
    <section
      style={{
        minHeight: "100dvh",
        background: PAGE_BG,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: TEXT,
      }}
    >
      <div
        style={{
          width: "min(100%, 390px)",
          minHeight: "100dvh",
          margin: "0 auto",
          padding: "10px 14px 0",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div
          style={{
            background: RED,
            borderRadius: 36,
            padding: "26px 24px 46px",
            color: "#fff",
            boxShadow: "0 20px 44px rgba(212,5,17,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "start", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.06em",
              }}
            >
              EM
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>
                Application manager
              </div>
              <div style={{ marginTop: 2, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.58)", fontWeight: 500 }}>
                Épicerie Villebon 2
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: "var(--font-fraunces), serif",
              fontSize: 30,
              lineHeight: 0.96,
              fontWeight: 650,
              color: "#fff",
            }}
          >
            Choisissez votre
            <br />
            profil
          </div>
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55, fontWeight: 500, color: "rgba(255,255,255,0.84)" }}>
            Touchez votre pastille puis entrez votre code PIN personnel.
          </div>
        </div>

        <div style={{ ...shellCardStyle(), marginTop: -28, padding: "22px 18px 20px", position: "relative", zIndex: 1, borderRadius: "28px 28px 30px 30px" }}>
          <div
            style={{
              minHeight: 0,
              display: "grid",
              alignContent: "start",
            }}
          >
          {!selectedProfile ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ccc", fontWeight: 500 }}>
                Managers actifs
              </div>

              {loading ? <div style={{ fontSize: 13, color: "#777" }}>Chargement des profils manager...</div> : null}
              {error ? (
                <div style={{ fontSize: 12, color: "#991b1b", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "12px 14px" }}>
                  {error}
                </div>
              ) : null}
              {!loading && !error && profiles.length === 0 ? (
                <div style={{ fontSize: 13, color: "#777" }}>Aucun accès manager mobile n&apos;est encore configuré.</div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                {profiles.map((profile) => (
                  <button
                    key={profile.slug}
                    type="button"
                    onClick={() => handleProfileSelect(profile.slug)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr 16px",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px",
                      borderRadius: 14,
                      border: `0.5px solid ${CARD_LINE}`,
                      background: "#FFFFFF",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: "#FEF2F2",
                        border: "1px solid #FDDADA",
                        color: RED,
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      {profile.initials || "EM"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{profile.displayName}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: "#bbb" }}>Manager mobile</div>
                    </div>
                    <div style={{ color: "#DDD", fontSize: 18, textAlign: "right" }}>›</div>
                  </button>
                ))}
              </div>

              <div style={{ textAlign: "center", fontSize: 12, color: "#ccc", paddingTop: 2 }}>— ou —</div>

              <button
                type="button"
                onClick={() => router.push("/login")}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  border: `0.5px solid #E8E4DE`,
                  background: "#fff",
                  color: "#C7C2BC",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Connexion par email
              </button>
            </div>
          ) : (
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
                  color: "#999",
                  fontSize: 12,
                  cursor: busy ? "default" : "pointer",
                  padding: 0,
                }}
              >
                ← Retour aux profils
              </button>

              <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: "#FEF2F2",
                    border: "1px solid #FDDADA",
                    color: RED,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 20,
                  }}
                >
                  {selectedProfile.initials || "EM"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: TEXT }}>{selectedProfile.displayName}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>Entrez votre code PIN à 6 chiffres.</div>
              </div>

              <PinDots value={pin} />
              {pinError ? <div style={{ textAlign: "center", color: "#991b1b", fontSize: 13 }}>{pinError}</div> : null}
              <NumericKeypad
                disabled={busy}
                onDigit={handlePinDigit}
                onBackspace={() => {
                  if (busy) return;
                  setPin((current) => current.slice(0, -1));
                }}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
