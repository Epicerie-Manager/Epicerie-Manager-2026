"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "@/components/exports/PeriodSelector";
import { colors } from "@/lib/theme";
import {
  buildPlanRayonPackages,
  formatPlanRayonMonthKey,
  formatPlanRayonShortDate,
  getPlanRayonOperationSummary,
  getPlanRayonTheme,
  groupPlanRayonPackagesByMonth,
  loadPlanRayonExportSnapshot,
  type PlanRayonSnapshot,
} from "@/lib/plan-rayon-export";
import { useModuleAccess } from "@/lib/use-module-access";

type PlanRayonExportDocument = "gantt" | "calendar";

function PlanningPreview({
  snapshot,
  operationId,
}: {
  snapshot: PlanRayonSnapshot;
  operationId: string;
}) {
  const operation = snapshot.operations.find((item) => item.id === operationId) ?? snapshot.operations[0];
  const packages = useMemo(
    () => (operation ? buildPlanRayonPackages(operation.interventions, snapshot.plans).slice(0, 6) : []),
    [operation, snapshot.plans],
  );

  if (!operation) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#13243b" }}>{operation.name}</div>
      <div style={{ fontSize: 13, color: "#617286", lineHeight: 1.6 }}>
        La version imprimée inclura maintenant une vue globale par phases, puis des pages mensuelles plus compactes
        pour éviter que la frise soit rognée.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {packages.map((item, index) => {
          const primary = item.interventions[0];
          const theme = getPlanRayonTheme(primary.section, snapshot.plans[primary.section]);
          return (
            <div
              key={item.id}
              style={{
                borderRadius: 16,
                border: "1px solid #dbe3eb",
                background: index % 2 ? "#fffaf0" : "#f8fbff",
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: theme.light,
                    color: theme.text,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: theme.color, display: "inline-block" }} />
                  {theme.label}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#617286" }}>Phase {index + 1}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#13243b" }}>
                {formatPlanRayonShortDate(item.start)}
                {item.start !== item.end ? ` → ${formatPlanRayonShortDate(item.end)}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.55 }}>
                {item.count} rayon{item.count > 1 ? "s" : ""} : {item.rayonLabels.join(" · ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPreview({
  snapshot,
  operationId,
}: {
  snapshot: PlanRayonSnapshot;
  operationId: string;
}) {
  const operation = snapshot.operations.find((item) => item.id === operationId) ?? snapshot.operations[0];
  const monthEntries = useMemo(() => {
    if (!operation) return [];
    const packages = buildPlanRayonPackages(operation.interventions, snapshot.plans);
    return Object.entries(groupPlanRayonPackagesByMonth(packages)).slice(0, 2);
  }, [operation, snapshot.plans]);

  if (!operation) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#13243b" }}>{operation.name}</div>
      <div style={{ fontSize: 13, color: "#617286", lineHeight: 1.6 }}>
        Les cartes calendrier sont elles aussi regroupées par phases communes, pour éviter les répétitions quand
        plusieurs rayons tombent sur la même fenêtre.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {monthEntries.map(([monthKey, items]) => (
          <div key={monthKey} style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d71920" }}>
              {formatPlanRayonMonthKey(monthKey)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {items.slice(0, 4).map((item) => {
                const theme = getPlanRayonTheme(item.interventions[0].section, snapshot.plans[item.interventions[0].section]);
                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 16,
                      border: "1px solid #dbe3eb",
                      background: "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "inline-flex", width: "fit-content", padding: "3px 8px", borderRadius: 999, background: theme.light, color: theme.text, fontSize: 10, fontWeight: 800 }}>
                      {theme.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#13243b" }}>
                      {formatPlanRayonShortDate(item.start)}
                      {item.start !== item.end ? ` → ${formatPlanRayonShortDate(item.end)}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                      {item.rayonLabels.slice(0, 3).join(" · ")}
                      {item.count > 3 ? ` +${item.count - 3}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExportsPlanRayonPage() {
  const { hasAccess, loading } = useModuleAccess("exports");
  const [snapshot, setSnapshot] = useState<PlanRayonSnapshot | null>(null);
  const [documentType, setDocumentType] = useState<PlanRayonExportDocument>("gantt");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      const nextSnapshot = await loadPlanRayonExportSnapshot();
      if (!mounted) return;
      setSnapshot(nextSnapshot);
      setSelectedOperationId(nextSnapshot.activeOperationId || nextSnapshot.operations[0]?.id || "");
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedOperation = useMemo(
    () => snapshot?.operations.find((item) => item.id === selectedOperationId) ?? snapshot?.operations[0] ?? null,
    [snapshot, selectedOperationId],
  );

  const handlePrint = () => {
    if (!selectedOperation) return;
    const params = new URLSearchParams({
      view: documentType,
      operationId: selectedOperation.id,
    });
    const popup = window.open(
      `/exports/plan-rayon/print?${params.toString()}`,
      "exports-plan-rayon-print",
      "popup=yes,width=1700,height=1000",
    );
    if (!popup) {
      setError("Autorisez les fenêtres popup pour lancer l'impression.");
      return;
    }
    popup.focus();
  };

  if (loading || !hasAccess) return null;

  return (
    <div style={{ maxWidth: 1380, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.textStrong, letterSpacing: "-0.04em" }}>
          Plan de rayon
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Préparez une impression A3 du planning de réimplantation ou du calendrier du module plan rayon.
        </p>
      </div>

      <PeriodSelector
        formats={[
          { label: "Planning", value: "gantt" },
          { label: "Calendrier", value: "calendar" },
        ]}
        selectedFormat={documentType}
        onFormatChange={(value) => setDocumentType(value === "calendar" ? "calendar" : "gantt")}
        periodLabel={selectedOperation?.name ?? "Chargement..."}
        periodSub={
          selectedOperation
            ? documentType === "gantt"
              ? "Vue globale + détails mensuels"
              : "Cartes calendrier regroupées"
            : "Sélection du document"
        }
        onPrev={() => {
          if (!snapshot?.operations.length || !selectedOperation) return;
          const index = snapshot.operations.findIndex((item) => item.id === selectedOperation.id);
          const nextIndex = index <= 0 ? snapshot.operations.length - 1 : index - 1;
          setSelectedOperationId(snapshot.operations[nextIndex].id);
        }}
        onNext={() => {
          if (!snapshot?.operations.length || !selectedOperation) return;
          const index = snapshot.operations.findIndex((item) => item.id === selectedOperation.id);
          const nextIndex = index >= snapshot.operations.length - 1 ? 0 : index + 1;
          setSelectedOperationId(snapshot.operations[nextIndex].id);
        }}
        onPrint={handlePrint}
      >
        <select
          value={selectedOperation?.id ?? ""}
          onChange={(event) => setSelectedOperationId(event.target.value)}
          style={{
            minHeight: 38,
            minWidth: 320,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #dbe3eb",
            background: "#ffffff",
            color: colors.text,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {(snapshot?.operations ?? []).map((operation) => (
            <option key={operation.id} value={operation.id}>
              {operation.name}
            </option>
          ))}
        </select>
      </PeriodSelector>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {selectedOperation && snapshot ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 18 }}>
          <div
            style={{
              border: "1px solid #dbe3eb",
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              padding: 18,
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0a4f98" }}>
              Document à imprimer
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#13243b" }}>
              {documentType === "gantt" ? "Planning de réimplantation" : "Calendrier de réimplantation"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#617286" }}>
              {getPlanRayonOperationSummary(selectedOperation)}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                `Nom du planning: ${selectedOperation.name}`,
                `Nombre d'interventions: ${selectedOperation.interventions.length}`,
                "Format: A3 paysage",
                documentType === "gantt"
                  ? "Sortie: une synthèse globale puis une page par mois"
                  : "Sortie: cartes regroupées par mois et par phase",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12,
                    color: "#334155",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #dbe3eb",
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              padding: 18,
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#617286" }}>
              Aperçu de l'export
            </div>
            <div
              style={{
                borderRadius: 18,
                border: "1px dashed #cbd5e1",
                background: "linear-gradient(180deg, #f8fafc, #ffffff)",
                minHeight: 420,
                padding: 20,
                display: "grid",
                alignContent: "start",
                gap: 12,
              }}
            >
              {documentType === "gantt" ? (
                <PlanningPreview snapshot={snapshot} operationId={selectedOperation.id} />
              ) : (
                <CalendarPreview snapshot={snapshot} operationId={selectedOperation.id} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
