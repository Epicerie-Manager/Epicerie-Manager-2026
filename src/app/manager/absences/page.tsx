"use client";

import { useEffect, useMemo, useState } from "react";
import {
  absenceTypes,
  type AbsenceRequest,
  type AbsenceStatusId,
} from "@/lib/absences-data";
import {
  createAbsenceRequestInSupabase,
  deleteAbsenceRequestInSupabase,
  getAbsencesUpdatedEventName,
  loadAbsenceRequests,
  syncAbsencesFromSupabase,
  updateAbsenceStatusInSupabase,
} from "@/lib/absences-store";
import { countDaysExcludingSundays } from "@/lib/absence-days";
import { loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";

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

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

const STATUS_STYLE: Record<AbsenceStatusId, { bg: string; color: string; label: string }> = {
  en_attente: { bg: "#fff7ed", color: "#c2410c", label: "En attente" },
  approuve: { bg: "#ecfdf5", color: "#166534", label: "Approuvée" },
  refuse: { bg: "#fef2f2", color: "#b91c1c", label: "Refusée" },
};

export default function ManagerAbsencesPage() {
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AbsenceStatusId | "ALL">("en_attente");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmployee, setCreateEmployee] = useState("");
  const [createType, setCreateType] = useState<(typeof absenceTypes)[number]["id"]>("CP");
  const [createStartDate, setCreateStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [createEndDate, setCreateEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [createNote, setCreateNote] = useState("");
  const [refusalTargetId, setRefusalTargetId] = useState<string | null>(null);
  const [refusalComment, setRefusalComment] = useState("");

  useEffect(() => {
    const refresh = () => {
      setRequests(loadAbsenceRequests());
      const nextEmployees = loadRhEmployees()
        .filter((employee) => employee.actif)
        .map((employee) => employee.n)
        .sort((left, right) => left.localeCompare(right, "fr"));
      setEmployeeOptions(nextEmployees);
    };

    refresh();
    void Promise.all([syncRhFromSupabase(), syncAbsencesFromSupabase()]).then(() => {
      refresh();
      setLoading(false);
    });

    const eventName = getAbsencesUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, []);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((request) => (filter === "ALL" ? true : request.status === filter))
      .sort((a, b) => {
        if (a.status === "en_attente" && b.status !== "en_attente") return -1;
        if (a.status !== "en_attente" && b.status === "en_attente") return 1;
        return a.startDate.localeCompare(b.startDate);
      });
  }, [filter, requests]);

  const pendingCount = requests.filter((request) => request.status === "en_attente").length;
  const approvedCount = requests.filter((request) => request.status === "approuve").length;
  const refusedCount = requests.filter((request) => request.status === "refuse").length;
  const approvedDays = requests
    .filter((request) => request.status === "approuve")
    .reduce((sum, request) => sum + countDaysExcludingSundays(request.startDate, request.endDate), 0);

  const updateStatus = async (request: AbsenceRequest, nextStatus: AbsenceStatusId) => {
    if (!request.dbId) return;
    try {
      setError("");
      setBusyId(request.id);
      await updateAbsenceStatusInSupabase(request.dbId, nextStatus);
      await syncAbsencesFromSupabase();
      setRequests(loadAbsenceRequests());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de mettre à jour la demande.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteRequest = async (request: AbsenceRequest) => {
    if (!request.dbId) return;
    try {
      setError("");
      setBusyId(request.id);
      await deleteAbsenceRequestInSupabase(request.dbId);
      await syncAbsencesFromSupabase();
      setRequests(loadAbsenceRequests());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de supprimer la demande.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRefusal = async (request: AbsenceRequest) => {
    if (!request.dbId) return;
    try {
      setError("");
      setBusyId(request.id);
      await updateAbsenceStatusInSupabase(request.dbId, "refuse", refusalComment);
      await syncAbsencesFromSupabase();
      setRequests(loadAbsenceRequests());
      setRefusalTargetId(null);
      setRefusalComment("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de refuser la demande.");
    } finally {
      setBusyId(null);
    }
  };

  const createManagerAbsence = async () => {
    if (!createEmployee) {
      setError("Choisis un collaborateur.");
      return;
    }

    try {
      setError("");
      setBusyId("create-absence");
      await createAbsenceRequestInSupabase({
        employee: createEmployee,
        type: createType,
        startDate: createStartDate,
        endDate: createEndDate,
        status: "approuve",
        note: createNote.trim() || "Créée depuis l'application manager.",
      });
      await syncAbsencesFromSupabase();
      setRequests(loadAbsenceRequests());
      setShowCreateForm(false);
      setCreateType("CP");
      setCreateNote("");
      setCreateStartDate(new Date().toISOString().slice(0, 10));
      setCreateEndDate(new Date().toISOString().slice(0, 10));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de créer l'absence.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
            Validation manager
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.06em", color: "#111827" }}>
            Demandes d&apos;absence
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Lecture rapide des périodes posées, calcul en jours hors dimanche et validation directe depuis le téléphone.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>En attente</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#c2410c" }}>{pendingCount}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Approuvées</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#166534" }}>{approvedCount}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Refusées</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#b91c1c" }}>{refusedCount}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Jours approuvés</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{approvedDays}</div>
        </div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["en_attente", "approuve", "refuse", "ALL"] as const).map((status) => {
                const active = filter === status;
                const label = status === "ALL" ? "Toutes" : STATUS_STYLE[status].label;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    style={{
                      minHeight: 38,
                      borderRadius: 999,
                      border: `1px solid ${active ? "#2563eb" : "#d8d1c8"}`,
                      background: active ? "#eff6ff" : "#fff",
                      color: active ? "#1d4ed8" : "#475569",
                      padding: "0 12px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((value) => !value)}
              style={{
                minHeight: 38,
                borderRadius: 999,
                border: "1px solid #86efac",
                background: "#ecfdf5",
                color: "#166534",
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {showCreateForm ? "Réduire" : "Créer une absence"}
            </button>
          </div>

          {showCreateForm ? (
            <div style={{ display: "grid", gap: 10, borderTop: "1px solid rgba(230,220,212,0.82)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                Création directe depuis l&apos;application manager. L&apos;absence est enregistrée et approuvée immédiatement.
              </div>
              <select
                value={createEmployee}
                onChange={(event) => setCreateEmployee(event.target.value)}
                style={{ minHeight: 44, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
              >
                <option value="">Choisir un collaborateur</option>
                {employeeOptions.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
              <select
                value={createType}
                onChange={(event) => setCreateType(event.target.value as (typeof absenceTypes)[number]["id"])}
                style={{ minHeight: 44, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
              >
                {absenceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <input
                  type="date"
                  value={createStartDate}
                  onChange={(event) => {
                    setCreateStartDate(event.target.value);
                    if (event.target.value > createEndDate) setCreateEndDate(event.target.value);
                  }}
                  style={{ minHeight: 44, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
                />
                <input
                  type="date"
                  value={createEndDate}
                  min={createStartDate}
                  onChange={(event) => setCreateEndDate(event.target.value)}
                  style={{ minHeight: 44, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
                />
              </div>
              <textarea
                value={createNote}
                onChange={(event) => setCreateNote(event.target.value)}
                placeholder="Commentaire manager (optionnel)"
                rows={3}
                style={{ borderRadius: 18, border: "1px solid #d8d1c8", padding: "12px 14px", fontSize: 14, background: "#fff", resize: "vertical" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={busyId === "create-absence"}
                  onClick={() => void createManagerAbsence()}
                  style={{
                    minHeight: 42,
                    borderRadius: 16,
                    border: "none",
                    background: "linear-gradient(135deg, #be123c, #ef4444)",
                    color: "#fff",
                    padding: "0 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: busyId === "create-absence" ? 0.7 : 1,
                  }}
                >
                  {busyId === "create-absence" ? "Création..." : "Créer l'absence"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ ...shellCard(), color: "#b91c1c", fontSize: 13 }}>{error}</div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {loading ? (
          <div style={{ ...shellCard(), fontSize: 14, color: "#6b7280" }}>Chargement des demandes...</div>
        ) : filteredRequests.length ? (
          filteredRequests.map((request) => {
            const statusMeta = STATUS_STYLE[request.status];
            const typeLabel = absenceTypes.find((type) => type.id === request.type)?.label ?? request.type;
            const days = countDaysExcludingSundays(request.startDate, request.endDate);
            const busy = busyId === request.id;

            return (
              <div key={request.id} style={shellCard()}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.04em", color: "#111827" }}>
                        {request.employee}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                        {typeLabel} · {formatDate(request.startDate)} au {formatDate(request.endDate)}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: "7px 10px",
                        background: statusMeta.bg,
                        color: statusMeta.color,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {statusMeta.label}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    <div
                      style={{
                        ...metricTileStyle(),
                        borderRadius: 18,
                        padding: "12px 12px 10px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Durée posée</div>
                      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: "#111827" }}>{days}</div>
                      <div style={{ marginTop: 3, fontSize: 10, color: "#6b7280" }}>hors dimanche</div>
                    </div>
                    <div
                      style={{
                        ...metricTileStyle(),
                        borderRadius: 18,
                        padding: "12px 12px 10px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Type</div>
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#7c2d12", lineHeight: 1.15 }}>{typeLabel}</div>
                    </div>
                  </div>

                  {request.note ? (
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                      <strong style={{ color: "#111827" }}>Note :</strong> {request.note}
                    </div>
                  ) : null}

                  {request.status === "en_attente" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(request, "approuve")}
                        style={{
                          minHeight: 42,
                          borderRadius: 16,
                          border: "1px solid #86efac",
                          background: "#ecfdf5",
                          color: "#166534",
                          fontSize: 12,
                          fontWeight: 800,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRefusalTargetId((current) => (current === request.id ? null : request.id));
                          setRefusalComment(request.status === "refuse" ? request.note ?? "" : "");
                        }}
                        style={{
                          minHeight: 42,
                          borderRadius: 16,
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          fontSize: 12,
                          fontWeight: 800,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteRequest(request)}
                        style={{
                          minHeight: 42,
                          borderRadius: 16,
                          border: "1px solid #d8d1c8",
                          background: "#fff",
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 800,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteRequest(request)}
                        style={{
                          minHeight: 40,
                          borderRadius: 16,
                          border: "1px solid #d8d1c8",
                          background: "#fff",
                          color: "#475569",
                          padding: "0 14px",
                          fontSize: 12,
                          fontWeight: 800,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}

                  {refusalTargetId === request.id ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <textarea
                        value={refusalComment}
                        onChange={(event) => setRefusalComment(event.target.value)}
                        placeholder="Commentaire de refus"
                        rows={3}
                        style={{ borderRadius: 18, border: "1px solid #fecaca", padding: "12px 14px", fontSize: 14, background: "#fff" }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setRefusalTargetId(null);
                            setRefusalComment("");
                          }}
                          style={{
                            minHeight: 40,
                            borderRadius: 16,
                            border: "1px solid #d8d1c8",
                            background: "#fff",
                            color: "#475569",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void confirmRefusal(request)}
                          style={{
                            minHeight: 40,
                            borderRadius: 16,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontSize: 12,
                            fontWeight: 800,
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          Valider le refus
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ ...shellCard(), fontSize: 14, color: "#6b7280" }}>Aucune demande pour ce filtre.</div>
        )}
      </div>
    </section>
  );
}
