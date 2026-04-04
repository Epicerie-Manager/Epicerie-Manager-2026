"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { loadManagerMobileProfiles, signInManagerMobile, type ManagerMobileProfile } from "@/lib/manager-mobile-auth";

function shellCardStyle(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.78)",
    boxShadow: "0 16px 40px rgba(91,33,63,0.08)",
  };
}

function ManagerMobilePinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const profileSlug = String(params.get("profile") ?? "").trim().toLowerCase();
  const [profiles, setProfiles] = useState<ManagerMobileProfile[]>([]);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextProfiles = await loadManagerMobileProfiles();
        if (!cancelled) setProfiles(nextProfiles);
      } catch {
        if (!cancelled) setProfiles([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.slug === profileSlug) ?? null,
    [profileSlug, profiles],
  );

  useEffect(() => {
    if (!profileSlug) {
      router.replace("/manager/login");
    }
  }, [profileSlug, router]);

  const handleDigit = (digit: string) => {
    if (busy) return;
    setError("");
    const nextPin = `${pin}${digit}`.slice(0, 6);
    setPin(nextPin);

    if (nextPin.length !== 6 || !profileSlug) return;

    setBusy(true);
    void signInManagerMobile(profileSlug, nextPin)
      .then(() => {
        router.replace("/manager");
        router.refresh();
      })
      .catch((signInError) => {
        setError(signInError instanceof Error ? signInError.message : "Code PIN incorrect.");
        setPin("");
      })
      .finally(() => setBusy(false));
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Link href="/manager/login" style={{ color: "#9f1239", textDecoration: "none", fontSize: 14, fontWeight: 800 }}>
        ← Retour
      </Link>

      <div style={shellCardStyle()}>
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
            {selectedProfile?.initials || "EM"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#111827" }}>
            {selectedProfile?.displayName || "Accès manager"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 280 }}>
            Entrez votre code PIN personnel à 6 chiffres pour ouvrir l&apos;application manager.
          </div>
        </div>
      </div>

      <div style={shellCardStyle()}>
        <PinDots value={pin} />
        {error ? (
          <div style={{ marginBottom: 16, textAlign: "center", color: "#991b1b", fontSize: 13 }}>{error}</div>
        ) : null}
        <NumericKeypad disabled={busy} onDigit={handleDigit} onBackspace={() => setPin((current) => current.slice(0, -1))} />
      </div>
    </section>
  );
}

export default function ManagerMobilePinPage() {
  return (
    <Suspense
      fallback={
        <section style={{ display: "grid", gap: 16 }}>
          <div style={shellCardStyle()}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#111827" }}>
              Ouverture du code manager...
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
              Chargement sécurisé en cours.
            </div>
          </div>
        </section>
      }
    >
      <ManagerMobilePinContent />
    </Suspense>
  );
}
