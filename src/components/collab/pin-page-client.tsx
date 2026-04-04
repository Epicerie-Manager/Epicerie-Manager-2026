"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { collabTheme } from "@/components/collab/theme";
import { collabSignIn, getCollabProfile } from "@/lib/collab-auth";

export function CollabPinPageClient({ selectedName }: { selectedName: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedName) {
      router.replace("/collab/login");
      return;
    }
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") return;
        router.replace(profile.first_login ? "/collab/change-pin" : "/collab/home");
      })
      .catch(() => undefined);
  }, [router, selectedName]);

  const handleDigit = (digit: string) => {
    if (busy) return;
    setError("");
    const nextPin = `${pin}${digit}`.slice(0, 6);
    setPin(nextPin);
    if (nextPin.length !== 6 || !selectedName) return;

    setBusy(true);
    void collabSignIn(selectedName, nextPin)
      .then(async () => {
        const profile = await getCollabProfile();
        router.replace(profile?.first_login ? "/collab/change-pin" : "/collab/home");
      })
      .catch(() => {
        setError("PIN incorrect");
        setPin("");
      })
      .finally(() => setBusy(false));
  };

  const initials = selectedName.slice(0, 2).toUpperCase();

  return (
    <CollabPage>
      <Link href="/collab/login" style={{ color: collabTheme.accent, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
        ← Retour
      </Link>
      <div style={{ height: 10 }} />
      <CollabHeader title="Code personnel" subtitle="Entrez votre code à 6 chiffres pour ouvrir votre espace." />
      <SectionCard style={{ padding: "22px 18px", overflow: "hidden" }}>
        <div
          style={{
            margin: "-22px -18px 18px",
            padding: "18px 18px 16px",
            background:
              "radial-gradient(circle at top right, rgba(29,95,160,0.12) 0%, transparent 34%), linear-gradient(135deg, #f8fbff 0%, #fffdf9 100%)",
            borderBottom: `1px solid ${collabTheme.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: collabTheme.accent,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "0.06em",
                boxShadow: "0 10px 18px rgba(212,5,17,0.18)",
              }}
            >
              É
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: collabTheme.accent, fontWeight: 800 }}>
                Connexion collaborateur
              </div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: collabTheme.text, fontFamily: collabTheme.titleFont }}>
                {selectedName}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", justifyItems: "center" }}>
          <div style={{ width: 78, height: 78, borderRadius: 26, display: "grid", placeItems: "center", background: collabTheme.accentSoft, color: collabTheme.accent, fontSize: 28, fontWeight: 700 }}>
            {initials}
          </div>
          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 700 }}>{selectedName}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>Code confidentiel collaborateur</div>
        </div>
        <PinDots value={pin} />
        {error ? <div style={{ marginBottom: 16, textAlign: "center", color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
        <NumericKeypad disabled={busy} onDigit={handleDigit} onBackspace={() => setPin((current) => current.slice(0, -1))} />
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: collabTheme.muted }}>Code oublié ? Contacter la responsable.</div>
      </SectionCard>
    </CollabPage>
  );
}



