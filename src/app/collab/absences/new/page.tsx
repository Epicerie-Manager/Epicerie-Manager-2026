"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { calcJoursOuvres, calcJoursTotal, createAbsenceRequest } from "@/lib/collab-data";

const ABSENCE_TYPES = [
  { label: "Congé payé", sublabel: "CP acquis", value: "CP", icon: "☐" },
  { label: "Déplacement RH", sublabel: "Reporter un repos", value: "DEPLACEMENT_RH", icon: "◷" },
] as const;

export default function NewCollabAbsencePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [type, setType] = useState("CP");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [displacedRh, setDisplacedRh] = useState("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  const totalDays = useMemo(() => (dateDebut && dateFin ? calcJoursTotal(dateDebut, dateFin) : 0), [dateDebut, dateFin]);
  const openDays = useMemo(() => (dateDebut && dateFin ? calcJoursOuvres(dateDebut, dateFin) : 0), [dateDebut, dateFin]);
  const isRhShift = type === "DEPLACEMENT_RH";
  const periodLabel = isRhShift ? "À quelle date souhaitez-vous la déplacer ?" : "Période";
  const note = isRhShift && displacedRh.trim() ? `Déplacement RH : ${displacedRh.trim()}` : undefined;
  const canContinue = Boolean(dateDebut && dateFin && dateFin >= dateDebut);

  const handleSubmit = async () => {
    if (!canContinue) {
      setError("Veuillez renseigner une période valide.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createAbsenceRequest({
        type,
        date_debut: dateDebut,
        date_fin: dateFin,
        nb_jours: totalDays,
        nb_jours_ouvres: openDays,
        note,
      });
      router.replace("/collab/absences");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d’envoyer la demande.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <CollabPage>
      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => router.push("/collab/absences")} style={{ border: "none", background: "transparent", color: collabTheme.accent, fontWeight: 700, cursor: "pointer", padding: 0 }}>
          ← Retour
        </button>
      </div>
      <CollabHeader title={step === "edit" ? "Nouvelle demande" : "Confirmer la demande"} subtitle="Préparez avant d&apos;envoyer à votre responsable." />

      <div style={{ display: "grid", gap: 16 }}>
        {step === "edit" ? (
          <>
            <SectionCard>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: collabTheme.muted, textTransform: "uppercase", marginBottom: 10 }}>Type d&apos;absence</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {ABSENCE_TYPES.map((item) => {
                  const active = item.value === type;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value)}
                      style={{
                        minHeight: 96,
                        borderRadius: 16,
                        border: `1px solid ${active ? collabTheme.black : collabTheme.line}`,
                        background: active ? "#fffdfb" : "#ffffff",
                        color: collabTheme.text,
                        cursor: "pointer",
                        padding: "12px 12px 10px",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 10, background: active ? collabTheme.black : "#f5efe7", color: active ? "#fff" : collabTheme.muted, display: "grid", placeItems: "center", fontSize: 16 }}>{item.icon}</div>
                      <div style={{ ...collabSerifTitleStyle({ fontSize: 19, marginTop: 12 }) }}>{item.label}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>{item.sublabel}</div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: collabTheme.muted, textTransform: "uppercase", marginBottom: 10 }}>{periodLabel}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: collabTheme.muted, textTransform: "uppercase" }}>Du</span>
                  <input type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${collabTheme.line}`, padding: "0 12px", fontFamily: "inherit", background: "#fbf8f3" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: collabTheme.muted, textTransform: "uppercase" }}>Au</span>
                  <input type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${collabTheme.line}`, padding: "0 12px", fontFamily: "inherit", background: "#fbf8f3" }} />
                </label>
              </div>
              <div style={{ marginTop: 12, width: "100%", minHeight: 10, borderRadius: 999, background: "#f7f0e8", position: "relative" }}>
                <div style={{ position: "absolute", left: 10, top: 2, width: 6, height: 6, borderRadius: 999, background: collabTheme.accent }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: collabTheme.muted }}>{totalDays || 0} jour · {openDays || 0} jour ouvré</div>
            </SectionCard>

            {isRhShift ? (
              <SectionCard>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", color: collabTheme.muted, textTransform: "uppercase", marginBottom: 10 }}>RH à déplacer</div>
                <input
                  value={displacedRh}
                  onChange={(event) => setDisplacedRh(event.target.value)}
                  placeholder="Ex : RH du lundi 23 mars"
                  style={{ width: "100%", minHeight: 48, borderRadius: 14, border: `1px solid ${collabTheme.line}`, padding: "0 12px", fontFamily: "inherit", background: "#fbf8f3" }}
                />
              </SectionCard>
            ) : null}

            {error ? <div style={{ color: collabTheme.accent, fontSize: 13 }}>{error}</div> : null}

            <button type="button" onClick={() => setStep("confirm")} disabled={!canContinue} style={{ minHeight: 52, borderRadius: 16, border: "none", background: collabTheme.accent, color: "#fff", fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed", opacity: canContinue ? 1 : 0.45 }}>
              Continuer
            </button>
          </>
        ) : (
          <>
            <SectionCard>
              <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                <div><strong>Type :</strong> {ABSENCE_TYPES.find((item) => item.value === type)?.label ?? type}</div>
                <div><strong>{periodLabel} :</strong> {dateDebut} → {dateFin}</div>
                <div><strong>Durée totale :</strong> {totalDays} jour(s)</div>
                <div><strong>Jours ouvrés :</strong> {openDays}</div>
                {isRhShift && displacedRh.trim() ? <div><strong>RH déplacée :</strong> {displacedRh}</div> : null}
              </div>
            </SectionCard>
            {error ? <div style={{ color: collabTheme.accent, fontSize: 13 }}>{error}</div> : null}
            <button type="button" onClick={handleSubmit} disabled={busy} style={{ minHeight: 52, borderRadius: 16, border: "none", background: collabTheme.accent, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
              Confirmer l&apos;envoi
            </button>
            <button type="button" onClick={() => setStep("edit")} style={{ minHeight: 52, borderRadius: 16, border: `1px solid ${collabTheme.line}`, background: "#ffffff", color: collabTheme.text, fontWeight: 700, cursor: "pointer" }}>
              Modifier
            </button>
          </>
        )}
      </div>
    </CollabPage>
  );
}


