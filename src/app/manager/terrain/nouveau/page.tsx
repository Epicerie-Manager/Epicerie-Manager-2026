"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  computeGlobalScore,
  computeSectionScore,
  createEmptyMetreAuditDraft,
  getSectionsForShift,
  type AuditShift,
  type BooleanAnswer,
  type MetreAuditDraft,
} from "@/lib/metre-a-metre-config";
import {
  loadFollowupFieldVisitSetup,
  loadMetreAuditDraft,
  loadManagerDisplayName,
  saveMetreAudit,
  updateMetreAudit,
  type FollowupEmployeeOption,
} from "@/lib/followup-store";

const RATING_LEGEND = [
  { value: 0, label: "Très insuffisant", color: "#991b1b", background: "#fef2f2", border: "#fecaca" },
  { value: 1, label: "Insuffisant", color: "#b45309", background: "#fff7ed", border: "#fed7aa" },
  { value: 2, label: "À corriger", color: "#92400e", background: "#fffbeb", border: "#fde68a" },
  { value: 3, label: "Correct", color: "#166534", background: "#f0fdf4", border: "#bbf7d0" },
  { value: 4, label: "Très bon", color: "#166534", background: "#ecfdf5", border: "#86efac" },
  { value: 5, label: "Exemplaire", color: "#155e75", background: "#ecfeff", border: "#a5f3fc" },
];

function getSectionChipLabel(label: string) {
  return label
    .replace(" & ", " ")
    .replace("Présentation ", "")
    .replace("Réserve ", "")
    .replace("Signalétique", "Sign.")
    .trim();
}

function getRatingTone(value: number | undefined) {
  const legend = RATING_LEGEND.find((entry) => entry.value === value);
  return legend ?? RATING_LEGEND[0];
}

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 16px 40px rgba(17,24,39,0.08)",
  };
}

function metricTileStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: "#fffdfb",
    border: "1px solid rgba(230,220,212,0.92)",
    boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
  };
}

function ManagerNewTerrainVisitPageContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const [employees, setEmployees] = useState<FollowupEmployeeOption[]>([]);
  const [rayons, setRayons] = useState<string[]>([]);
  const [draft, setDraft] = useState<MetreAuditDraft>(() => createEmptyMetreAuditDraft());
  const [shift, setShift] = useState<AuditShift>("matin");
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const progressAxesRef = useRef<HTMLDivElement | null>(null);
  const isEditMode = Boolean(auditId);
  const backHref = isEditMode ? "/suivi" : "/manager/terrain";

  useEffect(() => {
    let cancelled = false;
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");
        const [{ employees: employeeOptions, rayons: availableRayons }, managerName, existingDraft] = await Promise.all([
          loadFollowupFieldVisitSetup(),
          loadManagerDisplayName(),
          auditId ? loadMetreAuditDraft(auditId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const eligibleEmployees = employeeOptions.filter((employee) => employee.eligibleForFieldVisit);
        const effectiveEmployees =
          existingDraft &&
          existingDraft.employeeId &&
          !eligibleEmployees.some((employee) => employee.id === existingDraft.employeeId)
            ? [
                {
                  id: existingDraft.employeeId,
                  name: existingDraft.collaboratorName.trim().toUpperCase(),
                  rayons: existingDraft.rayon ? [existingDraft.rayon] : [],
                  role: "COLLABORATEUR",
                  eligibleForFieldVisit: true,
                  eligibleForBalisage: true,
                },
                ...eligibleEmployees,
              ]
            : eligibleEmployees;

        setEmployees(effectiveEmployees);
        setRayons(availableRayons);
        if (existingDraft) {
          setShift(existingDraft.shift);
          setDraft({
            ...existingDraft,
            managerName: existingDraft.managerName || managerName,
          });
        } else {
          setDraft((current) => ({ ...current, managerName: current.managerName || managerName }));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : isEditMode
                ? "Impossible de charger l'audit à modifier."
                : "Impossible de charger la saisie terrain.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [auditId, isEditMode]);

  const activeSections = getSectionsForShift(shift);
  const activeSection = activeSections[activeSectionIndex];
  const globalScore = computeGlobalScore(draft);
  const completedSections = activeSections.filter((section) => {
    const response = draft.sections[section.key];
    const answeredCount = section.type === "rating"
      ? Object.values(response.ratings).filter((value) => typeof value === "number").length
      : Object.values(response.booleans).filter((value) => value === "OUI" || value === "NON").length;
    return answeredCount === section.questions.length;
  }).length;
  const activeResponse = draft.sections[activeSection.key];
  const activeSectionScore = computeSectionScore(activeSection, activeResponse);

  const handleShiftChange = (newShift: AuditShift) => {
    if (newShift === shift) return;
    setShift(newShift);
    setActiveSectionIndex(0);
    setDraft((prev) => {
      const fresh = createEmptyMetreAuditDraft(newShift);
      return {
        ...fresh,
        auditDate: prev.auditDate,
        rayon: prev.rayon,
        managerName: prev.managerName,
        collaboratorName: prev.collaboratorName,
        employeeId: prev.employeeId,
      };
    });
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((entry) => entry.id === employeeId);
    setDraft((current) => ({
      ...current,
      employeeId,
      collaboratorName: employee?.name ?? "",
      rayon: employee?.rayons[0] || "",
    }));
  };

  const setDraftField = <K extends keyof MetreAuditDraft>(field: K, value: MetreAuditDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setRating = (questionKey: string, value: number) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [activeSection.key]: {
          ...current.sections[activeSection.key],
          ratings: { ...current.sections[activeSection.key].ratings, [questionKey]: value },
        },
      },
    }));
  };

  const setBoolean = (questionKey: string, value: BooleanAnswer) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [activeSection.key]: {
          ...current.sections[activeSection.key],
          booleans: { ...current.sections[activeSection.key].booleans, [questionKey]: value },
        },
      },
    }));
  };

  const setComment = (value: string) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [activeSection.key]: { ...current.sections[activeSection.key], comment: value },
      },
    }));
  };

  const scrollToActiveSection = () => {
    if (!sectionTopRef.current) return;
    sectionTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToProgressAxes = () => {
    if (!progressAxesRef.current) return;
    progressAxesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = async () => {
    if (!draft.employeeId) return setError("Choisis d'abord un collaborateur.");
    if (!draft.rayon.trim()) return setError("Précise le rayon du passage.");
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const result = isEditMode && auditId
        ? await updateMetreAudit(auditId, draft)
        : await saveMetreAudit(draft);
      setSuccess(
        isEditMode
          ? `Audit mis à jour avec succès, score global ${Math.round(result.globalScore)}%.`
          : `Audit enregistré avec succès, score global ${Math.round(result.globalScore)}%.`,
      );
      if (!isEditMode) {
        setDraft((current) => ({
          ...createEmptyMetreAuditDraft(shift),
          managerName: current.managerName,
        }));
        setActiveSectionIndex(0);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEditMode
            ? "Impossible de modifier l'audit."
            : "Impossible d'enregistrer l'audit.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9f1239" }}>
              Mètre à mètre
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                color: "#111827",
                whiteSpace: "nowrap",
              }}
            >
              {isEditMode ? "Modifier une visite terrain" : "Nouvelle visite terrain"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}>
              {isEditMode
                ? "Retouche l'audit existant section par section, puis enregistre la mise à jour."
                : "Une section à la fois, puis enregistrement direct en base."}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <Link href={backHref} style={{ textDecoration: "none", minHeight: 40, borderRadius: 999, padding: "0 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 800, border: "1px solid rgba(216,209,200,1)" }}>
              Retour
            </Link>
            <Link href={backHref} style={{ textDecoration: "none", minHeight: 40, borderRadius: 999, padding: "0 14px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 800, border: "1px solid #fdba74" }}>
              Annuler
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Progression</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#111827" }}>{completedSections}/{activeSections.length}</div></div>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Score live</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#7c2d12" }}>{Math.round(globalScore)}%</div></div>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Section</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#6d28d9" }}>{activeSectionIndex + 1}</div></div>
      </div>

      <div ref={sectionTopRef} style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Équipe auditée</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, padding: 4, borderRadius: 20, background: "#fff7fb", border: "1px solid #fbcfe8" }}>
              {([
                { value: "matin", label: "☀️ Matin - Ouverture" },
                { value: "apres_midi", label: "🌙 AM - Maintenance" },
              ] as const).map((option) => {
                const active = shift === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleShiftChange(option.value)}
                    style={{
                      minHeight: 44,
                      borderRadius: 16,
                      border: "none",
                      background: active ? "linear-gradient(135deg, #be123c, #ef4444)" : "transparent",
                      color: active ? "#fff" : "#6b7280",
                      fontSize: 13,
                      fontWeight: 800,
                      boxShadow: active ? "0 10px 24px rgba(190,24,93,0.18)" : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Collaborateur</span>
            <select value={draft.employeeId} onChange={(event) => handleEmployeeChange(event.target.value)} style={{ minHeight: 48, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}>
              <option value="">Sélectionner un collaborateur</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</span>
              <input type="date" value={draft.auditDate} onChange={(event) => setDraftField("auditDate", event.target.value)} style={{ minHeight: 48, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }} />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rayon</span>
              <select
                value={draft.rayon}
                onChange={(event) => setDraftField("rayon", event.target.value)}
                style={{ minHeight: 48, width: "100%", borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
              >
                <option value="">Sélectionner un rayon</option>
                {rayons.map((rayon) => (
                  <option key={rayon} value={rayon}>
                    {rayon}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6d28d9" }}>Section {activeSectionIndex + 1} / {activeSections.length}</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>{activeSection.label}</div>
            </div>
            <div style={{ borderRadius: 999, padding: "8px 10px", background: activeSectionScore >= 80 ? "#ecfdf5" : activeSectionScore >= 60 ? "#fffbeb" : "#fef2f2", color: activeSectionScore >= 80 ? "#166534" : activeSectionScore >= 60 ? "#92400e" : "#b91c1c", fontSize: 12, fontWeight: 800 }}>
              {Math.round(activeSectionScore)}%
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {activeSections.map((section, index) => {
              const currentScore = computeSectionScore(section, draft.sections[section.key]);
              const active = index === activeSectionIndex;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSectionIndex(index)}
                  style={{
                    minHeight: 38,
                    borderRadius: 999,
                    border: `1px solid ${active ? "#8b5cf6" : "#ded6cd"}`,
                    background: active ? "#f5f3ff" : "#fffdfb",
                    color: active ? "#6d28d9" : "#475569",
                    padding: "0 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{getSectionChipLabel(section.label)}</span>
                  <span style={{ opacity: 0.72 }}>{Math.round(currentScore)}%</span>
                </button>
              );
            })}
          </div>

          {activeSection.type === "rating" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>Même logique que la fiche initiale. Les couleurs servent juste à se repérer plus vite sur le terrain.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {RATING_LEGEND.map((entry) => <div key={entry.value} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, border: `1px solid ${entry.border}`, background: entry.background, color: entry.color, padding: "10px 12px", fontSize: 12, fontWeight: 700 }}><span style={{ fontSize: 16 }}>{entry.value === 0 ? "☆" : "★"}</span><span>{entry.value}</span><span>{entry.label}</span></div>)}
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            {activeSection.questions.map((question) => (
              <div key={question.key} style={{ display: "grid", gap: 10, borderRadius: 22, border: "1px solid rgba(230,220,212,0.95)", background: "#fffdfb", padding: "14px 14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.45 }}>{question.label}</div>
                </div>
                {question.type === "rating" ? (
                  (() => {
                    const currentRating = activeResponse.ratings[question.key];
                    const tone = getRatingTone(currentRating ?? undefined);
                    return (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setRating(question.key, 0)}
                            style={{
                              minWidth: 36,
                              height: 36,
                              borderRadius: 999,
                              border: `1px solid ${currentRating === 0 ? tone.border : "#ded6cd"}`,
                              background: currentRating === 0 ? tone.background : "#fff",
                              color: currentRating === 0 ? tone.color : "#64748b",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            0
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
                            {[1, 2, 3, 4, 5].map((value) => {
                              const selected = typeof currentRating === "number" && currentRating >= value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-label={`Note ${value}`}
                                  onClick={() => setRating(question.key, value)}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 999,
                                    border: `1px solid ${selected ? tone.border : "#ded6cd"}`,
                                    background: selected ? tone.background : "#fff",
                                    color: selected ? tone.color : "#cbd5e1",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 18,
                                    lineHeight: 1,
                                  }}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 14,
                            padding: "8px 10px",
                            background: tone.background,
                            border: `1px solid ${tone.border}`,
                            color: tone.color,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {typeof currentRating === "number"
                            ? `${currentRating}/5 · ${tone.label}`
                            : "Choisis une note"}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    {(["OUI", "NON"] as const).map((answer) => {
                      const active = activeResponse.booleans[question.key] === answer;
                      const positive = question.expectedAnswer === answer;
                      return <button key={answer} type="button" onClick={() => setBoolean(question.key, answer)} style={{ minHeight: 46, borderRadius: 16, border: `1px solid ${active ? (positive ? "#86efac" : "#fca5a5") : "#ded6cd"}`, background: active ? (positive ? "#ecfdf5" : "#fef2f2") : "#fff", color: active ? (positive ? "#166534" : "#991b1b") : "#374151", fontSize: 14, fontWeight: 800 }}>{answer}</button>;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Commentaire de section</span>
            <textarea value={activeResponse.comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder={`Observation ${activeSection.label}`} style={{ borderRadius: 18, border: "1px solid #d8d1c8", padding: "12px 14px", fontSize: 14, resize: "vertical", background: "#fff" }} />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setActiveSectionIndex((current) => {
                  const next = Math.max(current - 1, 0);
                  requestAnimationFrame(() => scrollToActiveSection());
                  return next;
                });
              }}
              disabled={activeSectionIndex === 0}
              style={{ minHeight: 44, flex: 1, borderRadius: 999, border: "1px solid #ded6cd", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 800, opacity: activeSectionIndex === 0 ? 0.5 : 1 }}
            >
              Section précédente
            </button>
            {activeSectionIndex === activeSections.length - 1 ? (
              <button
                type="button"
                onClick={() => scrollToProgressAxes()}
                style={{
                  minHeight: 44,
                  flex: 1,
                  borderRadius: 999,
                  border: "1px solid #f59e0b",
                  background: "#fff7ed",
                  color: "#b45309",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Fin de visite - axes de progrès
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveSectionIndex((current) => {
                    const next = Math.min(current + 1, activeSections.length - 1);
                    requestAnimationFrame(() => scrollToActiveSection());
                    return next;
                  });
                }}
                style={{ minHeight: 44, flex: 1, borderRadius: 999, border: "1px solid #8b5cf6", background: "#f5f3ff", color: "#6d28d9", fontSize: 13, fontWeight: 800 }}
              >
                Section suivante
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={progressAxesRef} style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Axes de progrès</span>
            <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              À compléter une fois toute la visite terminée, pour résumer les points à revoir et le suivi à prévoir.
            </span>
            <textarea value={draft.progressAxes} onChange={(event) => setDraftField("progressAxes", event.target.value)} rows={4} placeholder="Remarques globales, points à revoir, suivi à prévoir..." style={{ borderRadius: 18, border: "1px solid #d8d1c8", padding: "12px 14px", fontSize: 14, resize: "vertical", background: "#fff" }} />
          </label>
          {error ? <div style={{ fontSize: 13, color: "#b91c1c" }}>{error}</div> : null}
          {success ? <div style={{ fontSize: 13, color: "#166534" }}>{success}</div> : null}
          {loading ? <div style={{ fontSize: 13, color: "#6b7280" }}>Chargement des références terrain...</div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <Link href={backHref} style={{ textDecoration: "none", minHeight: 52, borderRadius: 999, border: "1px solid #d8d1c8", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Annuler</Link>
            <button type="button" onClick={handleSave} disabled={saving || loading} style={{ minHeight: 52, borderRadius: 999, border: "none", background: "linear-gradient(135deg, #be123c, #ef4444)", color: "#fff", fontSize: 15, fontWeight: 800, boxShadow: "0 14px 28px rgba(190,24,93,0.24)", opacity: saving || loading ? 0.7 : 1 }}>{saving ? (isEditMode ? "Mise à jour..." : "Enregistrement...") : (isEditMode ? "Modifier l'audit" : "Enregistrer l'audit")}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ManagerNewTerrainVisitPage() {
  return (
    <Suspense fallback={<section style={{ display: "grid", gap: 16, fontSize: 13, color: "#6b7280" }}>Chargement de la saisie terrain...</section>}>
      <ManagerNewTerrainVisitPageContent />
    </Suspense>
  );
}
