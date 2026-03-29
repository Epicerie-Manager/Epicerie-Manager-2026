"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { NumericKeypad, PinDots } from "@/components/collab/keypad";
import { collabTheme } from "@/components/collab/theme";
import { changeCollabPin, getCollabProfile } from "@/lib/collab-auth";

export default function CollabChangePinPage() {
  const router = useRouter();
  const [profileReady, setProfileReady] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        if (!profile.first_login) {
          router.replace("/collab/home");
          return;
        }
        setProfileReady(true);
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  const pinsMatch = firstPin.length === 4 && confirmPin.length === 4 && firstPin === confirmPin;
  const mismatch = firstPin.length === 4 && confirmPin.length === 4 && firstPin !== confirmPin;

  const handleDigit = (digit: string) => {
    setError("");
    if (step === "choose") {
      const next = `${firstPin}${digit}`.slice(0, 4);
      setFirstPin(next);
      if (next.length === 4) setStep("confirm");
      return;
    }
    setConfirmPin((current) => `${current}${digit}`.slice(0, 4));
  };

  const handleBackspace = () => {
    setError("");
    if (step === "confirm") {
      if (confirmPin.length > 0) {
        setConfirmPin((current) => current.slice(0, -1));
        return;
      }
      setStep("choose");
      setFirstPin((current) => current.slice(0, -1));
      return;
    }
    setFirstPin((current) => current.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!pinsMatch) return;
    setBusy(true);
    setError("");
    try {
      await changeCollabPin(firstPin);
      router.replace("/collab/home");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d'enregistrer ce code.");
    } finally {
      setBusy(false);
    }
  };

  if (!profileReady) return null;

  return (
    <CollabPage>
      <CollabHeader title="Votre nouveau code" subtitle="Première connexion : choisissez un code personnel à 4 chiffres." accent={false} />
      <SectionCard style={{ padding: "18px 16px", marginBottom: 16, background: "#fff8ec" }}>
        <div style={{ fontSize: 13, color: collabTheme.amber }}>Première connexion — choisissez un code personnel.</div>
      </SectionCard>
      <SectionCard style={{ padding: "22px 18px" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Choisissez 4 chiffres</div>
        <PinDots value={firstPin} />
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Confirmez</div>
        <PinDots value={confirmPin} />
        {pinsMatch ? <div style={{ textAlign: "center", color: collabTheme.green, fontSize: 13, marginBottom: 12 }}>Les codes correspondent.</div> : null}
        {mismatch ? <div style={{ textAlign: "center", color: "#991b1b", fontSize: 13, marginBottom: 12 }}>Les codes ne correspondent pas.</div> : null}
        {error ? <div style={{ textAlign: "center", color: "#991b1b", fontSize: 13, marginBottom: 12 }}>{error}</div> : null}
        <NumericKeypad disabled={busy} onDigit={handleDigit} onBackspace={handleBackspace} />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pinsMatch || busy}
          style={{
            width: "100%",
            marginTop: 16,
            minHeight: 50,
            borderRadius: 18,
            border: "none",
            background: pinsMatch ? "#111111" : "#d6cdc2",
            color: pinsMatch ? "#fff" : "#7d7164",
            cursor: pinsMatch ? "pointer" : "not-allowed",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Valider mon code
        </button>
      </SectionCard>
    </CollabPage>
  );
}
