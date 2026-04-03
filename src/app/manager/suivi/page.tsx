"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadEmployeeAbsenceYearStats,
  loadEmployeeBalisageYearStats,
  loadFollowupEmployees,
  loadMetreAuditDetail,
  loadRecentMetreAudits,
  type EmployeeAbsenceYearStats,
  type EmployeeBalisageYearStats,
  type FollowupEmployeeOption,
  type MetreAuditDetail,
  type MetreAuditListItem,
} from "@/lib/followup-store";

const ALL_EMPLOYEES_OPTION = "__all__";

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

function formatCompactDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(new Date(date));
}

export default function ManagerSuiviPage() {
  const [employees, setEmployees] = useState<FollowupEmployeeOption[]>([]);
  const [audits, setAudits] = useState<MetreAuditListItem[]>([]);
  const [balisageStats, setBalisageStats] = useState<Record<string, EmployeeBalisageYearStats>>({});
  const [absenceStats, setAbsenceStats] = useState<Record<string, EmployeeAbsenceYearStats>>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(ALL_EMPLOYEES_OPTION);
  const [openAuditId, setOpenAuditId] = useState<string | null>(null);
  const [openAuditDetail, setOpenAuditDetail] = useState<MetreAuditDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const employeeOptions = (await loadFollowupEmployees()).filter((employee) => employee.eligibleForFieldVisit);
        const auditsList = await loadRecentMetreAudits(120);
        const ids = employeeOptions.map((employee) => employee.id);
        const [balisage, absences] = await Promise.all([
          loadEmployeeBalisageYearStats(ids),
          loadEmployeeAbsenceYearStats(ids),
        ]);

        if (cancelled) return;

        setEmployees(employeeOptions);
        setAudits(auditsList);
        setBalisageStats(balisage);
        setAbsenceStats(absences);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger le suivi collaborateur.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAudits = useMemo(
    () =>
      selectedEmployeeId === ALL_EMPLOYEES_OPTION
        ? audits
        : audits.filter((audit) => audit.employeeId === selectedEmployeeId),
    [audits, selectedEmployeeId],
  );

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const summary = useMemo(() => {
    const employeePool =
      selectedEmployeeId === ALL_EMPLOYEES_OPTION
        ? employees
        : employees.filter((employee) => employee.id === selectedEmployeeId);

    const averageScore = filteredAudits.length
      ? Math.round(filteredAudits.reduce((sum, audit) => sum + audit.globalScore, 0) / filteredAudits.length)
      : 0;

    const balisagePool = employeePool
      .map((employee) => balisageStats[employee.id])
      .filter((entry): entry is EmployeeBalisageYearStats => Boolean(entry));

    const absencePool = employeePool
      .map((employee) => absenceStats[employee.id])
      .filter((entry): entry is EmployeeAbsenceYearStats => Boolean(entry));

    return {
      peopleCount: employeePool.length,
      averageScore,
      averageBalisage: balisagePool.length
        ? Math.round(balisagePool.reduce((sum, entry) => sum + entry.averagePerMonth, 0) / balisagePool.length)
        : 0,
      approvedDays: absencePool.reduce((sum, entry) => sum + entry.approvedDays, 0),
      pendingRequests: absencePool.reduce((sum, entry) => sum + entry.pendingRequests, 0),
      auditCount: filteredAudits.length,
    };
  }, [absenceStats, balisageStats, employees, filteredAudits, selectedEmployeeId]);

  useEffect(() => {
    if (!openAuditId) {
      setOpenAuditDetail(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setLoadingDetail(true);
        const detail = await loadMetreAuditDetail(openAuditId);
        if (!cancelled) {
          setOpenAuditDetail(detail);
        }
      } catch {
        if (!cancelled) {
          setOpenAuditDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [openAuditId]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6d28d9" }}>
            Suivi collaborateur
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.06em", color: "#111827" }}>
            Lecture mobile du suivi
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Vision équipe ou zoom sur une personne, puis ouverture d&apos;une fiche terrain seulement si besoin.
          </div>
        </div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Collaborateur
            </span>
            <select
              value={selectedEmployeeId}
              onChange={(event) => {
                setSelectedEmployeeId(event.target.value);
                setOpenAuditId(null);
                setOpenAuditDetail(null);
              }}
              style={{ minHeight: 48, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
            >
              <option value={ALL_EMPLOYEES_OPTION}>Toute l&apos;équipe</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Audits</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>
                {summary.auditCount}
              </div>
            </div>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Note moyenne</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#7c2d12" }}>
                {summary.auditCount ? `${summary.averageScore}%` : "-"}
              </div>
            </div>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Balisage moyen / mois</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#0f766e" }}>
                {summary.averageBalisage}
              </div>
            </div>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Absences approuvées</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#1d4ed8" }}>
                {summary.approvedDays}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Demandes en attente</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: summary.pendingRequests ? "#b91c1c" : "#166534" }}>
                {summary.pendingRequests}
              </div>
            </div>
            <div style={metricTileStyle()}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Périmètre</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>
                {summary.peopleCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEmployee ? (
        <div style={shellCard()}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9f1239" }}>
              Fiche rapide
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>
              {selectedEmployee.name}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {selectedEmployee.rayons.length ? selectedEmployee.rayons.join(" · ") : "Rayon non renseigné"}
            </div>
          </div>
        </div>
      ) : null}

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e" }}>
            Historique des audits
          </div>
          {loading ? (
            <div style={{ fontSize: 14, color: "#6b7280" }}>Chargement du suivi...</div>
          ) : error ? (
            <div style={{ fontSize: 14, color: "#b91c1c" }}>{error}</div>
          ) : filteredAudits.length ? (
            filteredAudits.map((audit) => {
              const opened = openAuditId === audit.id;
              return (
                <div
                  key={audit.id}
                  style={{
                    borderRadius: 24,
                    border: `1px solid ${opened ? "#d8b4fe" : "rgba(230,220,212,0.95)"}`,
                    background: opened ? "#faf5ff" : "#fffdfb",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenAuditId((current) => (current === audit.id ? null : audit.id))}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: "14px 14px 16px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      alignItems: "center",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>
                        {audit.collaboratorName}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {formatCompactDate(audit.auditDate)} · {audit.rayon || "Rayon à préciser"}
                      </div>
                    </div>
                    <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                      <div
                        style={{
                          minWidth: 60,
                          textAlign: "center",
                          borderRadius: 999,
                          padding: "8px 10px",
                          background: audit.globalScore >= 80 ? "#ecfdf5" : audit.globalScore >= 60 ? "#fffbeb" : "#fef2f2",
                          color: audit.globalScore >= 80 ? "#166534" : audit.globalScore >= 60 ? "#92400e" : "#b91c1c",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {Math.round(audit.globalScore)}%
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9" }}>
                        {opened ? "Réduire" : "Ouvrir"}
                      </span>
                    </div>
                  </button>

                  {opened ? (
                    <div style={{ borderTop: "1px solid rgba(216,180,254,0.5)", padding: "0 14px 16px", display: "grid", gap: 12 }}>
                      {loadingDetail ? (
                        <div style={{ fontSize: 13, color: "#6b7280", paddingTop: 12 }}>Chargement de la fiche...</div>
                      ) : openAuditDetail?.id === audit.id ? (
                        <>
                          <div style={{ display: "grid", gap: 10, paddingTop: 12 }}>
                            {openAuditDetail.sections.map((section) => (
                              <div
                                key={section.id}
                                style={{
                                  borderRadius: 18,
                                  background: "#fff",
                                  border: "1px solid rgba(230,220,212,0.92)",
                                  padding: "12px 12px 14px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{section.label}</div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: section.score >= 80 ? "#166534" : section.score >= 60 ? "#92400e" : "#b91c1c" }}>
                                    {Math.round(section.score)}%
                                  </div>
                                </div>
                                {section.comment ? (
                                  <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                                    {section.comment}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          {openAuditDetail.progressAxes ? (
                            <div
                              style={{
                                borderRadius: 18,
                                background: "#fffdfb",
                                border: "1px solid rgba(230,220,212,0.92)",
                                padding: "12px 12px 14px",
                                fontSize: 13,
                                color: "#4b5563",
                                lineHeight: 1.6,
                              }}
                            >
                              <strong style={{ color: "#111827" }}>Axes de progrès :</strong> {openAuditDetail.progressAxes}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: "#6b7280", paddingTop: 12 }}>Impossible de charger cette fiche.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {selectedEmployeeId === ALL_EMPLOYEES_OPTION
                ? "Aucun audit enregistré sur l'équipe pour le moment."
                : "Aucun audit enregistré pour ce collaborateur."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
