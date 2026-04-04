"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { collabSignIn, getCollabProfile } from "@/lib/collab-auth";

const RED = "#D40511";
const PAGE_BG = "#F4F1ED";
const CARD_BG = "#FAFAF8";
const CARD_LINE = "#EDEBE7";
const TEXT = "#1a1410";

export function CollabPinPageClient({ selectedName, employeeId }: { selectedName: string; employeeId: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedName || !employeeId) {
      router.replace("/collab/login");
      return;
    }
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") return;
        router.replace(profile.first_login ? "/collab/change-pin" : "/collab/home");
      })
      .catch(() => undefined);
  }, [employeeId, router, selectedName]);

  const handleDigit = (digit: string) => {
    if (busy) return;
    setError("");
    const nextPin = `${pin}${digit}`.slice(0, 6);
    setPin(nextPin);
    if (nextPin.length !== 6 || !selectedName || !employeeId) return;

    setBusy(true);
    void collabSignIn(employeeId, nextPin)
      .then(async () => {
        const profile = await getCollabProfile();
        router.replace(profile?.first_login ? "/collab/change-pin" : "/collab/home");
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : "PIN incorrect");
        setPin("");
      })
      .finally(() => setBusy(false));
  };

  const initials = selectedName.slice(0, 2).toUpperCase();

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              É
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              Épicerie · Villebon 2
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: "var(--font-fraunces), serif",
              fontSize: 30,
              lineHeight: 0.96,
              fontWeight: 650,
              color: "#fff",
            }}
          >
            Code
            <br />
            personnel
          </div>
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.84)" }}>
            Entrez votre code à 6 chiffres pour ouvrir votre espace.
          </div>
        </div>

        <div
          style={{
            marginTop: -28,
            background: CARD_BG,
            borderRadius: "28px 28px 30px 30px",
            border: `1px solid ${CARD_LINE}`,
            padding: "20px 20px 24px",
            position: "relative",
            zIndex: 1,
            boxShadow: "0 16px 42px rgba(60,40,20,0.05)",
            display: "grid",
            gap: 14,
            minHeight: 0,
            alignContent: "start",
          }}
        >
          <Link href="/collab/login" style={{ color: "#999", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>
            ← Retour
          </Link>

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
              {initials}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: TEXT }}>{selectedName}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>Code confidentiel collaborateur</div>
          </div>

          <PinDots value={pin} />
          {error ? <div style={{ textAlign: "center", color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
          <NumericKeypad disabled={busy} onDigit={handleDigit} onBackspace={() => setPin((current) => current.slice(0, -1))} />
          <div style={{ textAlign: "center", fontSize: 12, color: "#bbb" }}>Code oublié ? Contacter la responsable.</div>
        </div>
      </div>
    </section>
  );
}
