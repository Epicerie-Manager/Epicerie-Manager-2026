"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { calcJoursOuvres, calcJoursTotal, createAbsenceRequest } from "@/lib/collab-data";

const absenceTypes = [
  { id: "Congé payé", label: "Congé payé" },
  { id: "RTT", label: "RTT" },
  { id: "Événement familial", label: "Événement familial" },
  { id: "Autre", label: "Autre" },
];

export default function NewCollabAbsencePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [type, setType] = useState("Congé payé");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [note, setNote] = useState("");
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
        note: note.trim() || undefined,
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
      <CollabHeader title="Nouvelle absence" subtitle="Préparez votre demande avant de l'envoyer à votre responsable." accent={false} />
      {step === "edit" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {absenceTypes.map((item) => {
                const active = item.id === type;
                return (
                  <button key={item.id} type="button" onClick={() => setType(item.id)} style={{ minHeight: 64, borderRadius: 18, border: `1px solid ${active ? collabTheme.accent : collabTheme.line}`, background: active ? collabTheme.accentSoft : "#fffaf6", color: active ? collabTheme.accent : collabTheme.text, fontWeight: 700, cursor: "pointer", padding: "0 12px" }}>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Du
                <input type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${collabTheme.line}`, padding: "0 12px", fontFamily: "inherit" }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Au
                <input type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${collabTheme.line}`, padding: "0 12px", fontFamily: "inherit" }} />
              </label>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: collabTheme.muted }}>Durée totale : {totalDays || 0} jour(s) · Jours ouvrés : {openDays || 0}</div>
          </SectionCard>
          <SectionCard>
            <label style={{ display: "grid", gap: 8, fontSize: 13 }}>
              Note optionnelle
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ borderRadius: 16, border: `1px solid ${collabTheme.line}`, padding: 12, resize: "vertical", fontFamily: "inherit" }} />
            </label>
          </SectionCard>
          {error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
          <button type="button" onClick={() => setStep("confirm")} disabled={!canContinue} style={{ minHeight: 50, borderRadius: 18, border: "none", background: collabTheme.accent, color: "#fff", fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed", opacity: canContinue ? 1 : 0.5 }}>
            Continuer
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard style={{ background: collabTheme.blueBg }}>
            <div style={{ fontSize: 13, color: collabTheme.blue }}>Votre responsable sera notifiée.</div>
          </SectionCard>
          <SectionCard>
            <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
              <div><strong>Type :</strong> {type}</div>
              <div><strong>Période :</strong> {dateDebut} → {dateFin}</div>
              <div><strong>Durée totale :</strong> {totalDays} jour(s)</div>
              <div><strong>Jours ouvrés :</strong> {openDays}</div>
              {note.trim() ? <div><strong>Note :</strong> {note}</div> : null}
            </div>
          </SectionCard>
          {error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
          <button type="button" onClick={handleSubmit} disabled={busy} style={{ minHeight: 50, borderRadius: 18, border: "none", background: "#111111", color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
            Confirmer l’envoi
          </button>
          <button type="button" onClick={() => setStep("edit")} style={{ minHeight: 50, borderRadius: 18, border: `1px solid ${collabTheme.line}`, background: "transparent", color: collabTheme.text, fontWeight: 700, cursor: "pointer" }}>
            Modifier
          </button>
        </div>
      )}
    </CollabPage>
  );
}


