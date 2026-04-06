"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import {
  extractRupturesImportSourceInfo,
  inspectRuptureDetailFile,
  parseRuptureDetailFile,
  parseRupturePerimetreFile,
} from "@/app/ruptures/lib/ruptures-parser";
import {
  formatLocalIsoDate,
  formatRuptureDateLabel,
  formatRuptureDateTime,
  getRupturePctTone,
  getRupturePeriodLabel,
  loadRupturesDashboard,
  loadRupturesEmployees,
  reassignRuptureDetail,
  saveParsedRupturesImport,
  type RuptureCollaboratorRow,
  type RuptureDetailRow,
  type RuptureHistoryRange,
  type RuptureHistoryRow,
  type RuptureEmployee,
  type RuptureImportRow,
  type RupturePeriod,
  type RuptureTeamSnapshot,
  type RupturesDashboardData,
} from "@/lib/ruptures-store";

type ViewMode = "equipe" | "collaborateurs" | "historique";

const baseCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8ecf1",
  boxShadow: "none",
};

function pillButtonStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "36px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#D40511" : "#dbe3eb"}`,
    background: active ? "#D40511" : "#fff",
    color: active ? "#fff" : "#475569",
    padding: "0 14px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function softPillStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "34px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#fecdd3" : "#dbe3eb"}`,
    background: active ? "#fff1f2" : "#fff",
    color: active ? "#D40511" : "#475569",
    padding: "0 12px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function progressTrackStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
  };
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card style={baseCardStyle}>
      <div style={{ fontSize: "13px", color: "#64748b" }}>{text}</div>
    </Card>
  );
}

function ImportPanel({
  period,
  onPeriodChange,
  selectedDate,
  recentImports,
  perimetreFileName,
  detailFileName,
  importing,
  error,
  onPickDate,
  onFileChange,
  onImport,
}: {
  period: RupturePeriod;
  onPeriodChange: (period: RupturePeriod) => void;
  selectedDate: string;
  recentImports: RuptureImportRow[];
  perimetreFileName: string;
  detailFileName: string;
  importing: boolean;
  error: string;
  onPickDate: (dateKey: string) => void;
  onFileChange: (slot: "perimetre" | "detail", file: File | null) => void;
  onImport: () => void;
}) {
  const periodLabel = getRupturePeriodLabel(period);

  return (
    <Card style={{ ...baseCardStyle, borderColor: "#ffd5d8" }}>
      <Kicker moduleKey="ruptures" label="Import double" />
      <h2 style={{ marginTop: "4px", fontSize: "17px", color: "#0f172a" }}>Import des fichiers ruptures</h2>
      <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b", lineHeight: 1.55, maxWidth: 900 }}>
        Deux fichiers par période: le dashboard rupture par périmètre et la gestion des ruptures détaillée. La période sélectionnée est rappelée sur chaque zone pour éviter toute confusion.
      </p>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "220px minmax(0, 1fr)", marginTop: "12px" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Période
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["matin", "fin_matinee"] as const).map((value) => (
              <button key={value} type="button" style={pillButtonStyle(period === value)} onClick={() => onPeriodChange(value)}>
                {getRupturePeriodLabel(value)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label
            style={{
              borderRadius: "16px",
              border: "1px dashed #f3a7af",
              background: "#fff",
              padding: "12px 14px",
              display: "grid",
              gap: "7px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Dashboard rupture par périmètre
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#D40511", background: "#fff1f2", borderRadius: "999px", padding: "4px 8px" }}>
                {periodLabel}
              </span>
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              {perimetreFileName || "Choisir le fichier 1"}
            </span>
            <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              Fichier périmètre manager avec les colonnes D / E / X / Y et les colonnes collaborateur.
            </span>
            <input type="file" accept=".xlsx,.xls,.xlsb,.csv" style={{ display: "none" }} onChange={(event) => onFileChange("perimetre", event.target.files?.[0] ?? null)} />
          </label>

          <label
            style={{
              borderRadius: "16px",
              border: "1px dashed #f3a7af",
              background: "#fff",
              padding: "12px 14px",
              display: "grid",
              gap: "7px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gestion des ruptures, liste des ruptures
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#D40511", background: "#fff1f2", borderRadius: "999px", padding: "4px 8px" }}>
                {periodLabel}
              </span>
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              {detailFileName || "Choisir le fichier 2"}
            </span>
            <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              Fichier détaillé produit par produit, utile pour les rayons partagés et la réaffectation manuelle.
            </span>
            <input type="file" accept=".xlsx,.xls,.xlsb,.csv" style={{ display: "none" }} onChange={(event) => onFileChange("detail", event.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "12px 14px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Imports récents
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {recentImports.length ? recentImports.slice(0, 10).map((item) => {
              const active = item.dateKey === selectedDate;
              return (
                <button key={item.id} type="button" onClick={() => onPickDate(item.dateKey)} style={softPillStyle(active)}>
                  {item.dateKey} · {getRupturePeriodLabel(item.period)}
                </button>
              );
            }) : (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Aucun import disponible pour l&apos;instant.</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          style={{
            minHeight: "42px",
            borderRadius: "999px",
            border: "1px solid #D40511",
            background: "#D40511",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 800,
            padding: "0 18px",
            cursor: importing ? "not-allowed" : "pointer",
            opacity: importing ? 0.7 : 1,
          }}
        >
          {importing ? "Import en cours..." : "Importer les fichiers"}
        </button>
      </div>
    </Card>
  );
}

function SnapshotBlock({
  title,
  snapshot,
  placeholder,
  extraLine,
}: {
  title: string;
  snapshot: RuptureTeamSnapshot;
  placeholder?: string;
  extraLine?: string | null;
}) {
  if (!snapshot.importRow) {
    return (
      <div
        style={{
          borderRadius: "18px",
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          padding: "16px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#64748b" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{placeholder ?? "Aucun import pour cette période."}</div>
      </div>
    );
  }

  const pctTone = getRupturePctTone(snapshot.pctTraitement);

  return (
    <div
      style={{
        borderRadius: "18px",
        border: "1px solid #e5e7eb",
        background: "#fff",
        padding: "16px",
        display: "grid",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {formatRuptureDateTime(snapshot.importRow.importedAt)}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            padding: "5px 10px",
            background: "#fff1f2",
            color: "#D40511",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {snapshot.rayonsCount} rayons
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        {[
          {
            label: "Total ruptures",
            value: snapshot.totalRuptures,
            color: "#0f172a",
            sub: `${snapshot.rayonsCount} rayons concernés`,
          },
          {
            label: title.includes("Fin") ? "Ruptures collab restantes" : "Ruptures collab à traiter",
            value: snapshot.collab,
            color: title.includes("Fin") ? (snapshot.collab === 0 ? "#639922" : "#EF9F27") : "#D40511",
            sub: title.includes("Fin") ? "reste sous responsabilité collab" : "en attente d'action collaborateur",
          },
          {
            label: "% de traitement",
            value: snapshot.pctTraitement === null ? "—" : `${snapshot.pctTraitement}%`,
            color: pctTone,
            sub: "objectif 100%",
          },
        ].map((item) => (
          <div key={item.label} style={{ borderRadius: "14px", padding: "14px", background: "#f8fafc", border: "1px solid #eef2f7" }}>
            <div style={{ fontSize: "28px", lineHeight: 1, fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 800, color: item.color }}>{item.label}</div>
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {extraLine ? (
        <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{extraLine}</div>
      ) : null}
    </div>
  );
}

function TeamView({
  morning,
  fin,
}: {
  morning: RuptureTeamSnapshot;
  fin: RuptureTeamSnapshot;
}) {
  const treatedInMorning = morning.importRow && fin.importRow ? Math.max(morning.collab - fin.collab, 0) : null;

  return (
    <Card style={baseCardStyle}>
      <Kicker moduleKey="ruptures" label="Vue équipe" />
      <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>KPI du jour</h2>
      <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
        Comparaison du snapshot du matin et du snapshot de fin de matinée pour mesurer l&apos;évolution réelle des ruptures collab.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "14px" }}>
        <SnapshotBlock title="Début de matinée" snapshot={morning} placeholder="En attente du premier import du jour." />
        <SnapshotBlock
          title="Fin de matinée"
          snapshot={fin}
          placeholder="Après 2e import."
          extraLine={treatedInMorning !== null ? `${treatedInMorning} traitées dans la matinée` : null}
        />
      </div>

      {treatedInMorning !== null ? (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid #ffd5d8",
            background: "#fff7f8",
            padding: "12px 14px",
            fontSize: "12px",
            color: "#7f1d1d",
          }}
        >
          Delta collab du jour: <strong>{treatedInMorning}</strong> rupture(s) traitée(s) entre le matin et la fin de matinée.
        </div>
      ) : null}
    </Card>
  );
}

function CollaboratorView({
  collaboratorRows,
  hasSecondImport,
  detailRows,
  employees,
  detailEnabled,
  savingReassign,
  onReassign,
}: {
  collaboratorRows: RuptureCollaboratorRow[];
  hasSecondImport: boolean;
  detailRows: RuptureDetailRow[];
  employees: RuptureEmployee[];
  detailEnabled: boolean;
  savingReassign: boolean;
  onReassign: (ruptureId: string, employeeId: string | null) => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const employeeNameById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee.name])), [employees]);
  const visibleDetailRows = useMemo(() => {
    if (selectedEmployeeId === "all") return detailRows;
    if (selectedEmployeeId === "__unassigned__") return detailRows.filter((row) => !row.employeeId);
    return detailRows.filter((row) => row.employeeId === selectedEmployeeId);
  }, [detailRows, selectedEmployeeId]);

  return (
    <div style={{ display: "grid", gap: "14px" }}>
    <Card style={baseCardStyle}>
      <Kicker moduleKey="ruptures" label="Vue collaborateurs" />
      <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Résultat journée</h2>
      <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
        Tri décroissant sur le pourcentage traité quand le second import existe. Les jours sans rupture collab restent en vert.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "14px" }}>
        {collaboratorRows.length ? collaboratorRows.map((row) => {
          const currentOutstanding = hasSecondImport ? (row.finCollab ?? row.morningCollab) : row.morningCollab;
          const hasWork = currentOutstanding > 0 || row.hasActiveWork;
          const displayPct = hasSecondImport
            ? row.pct !== null
              ? row.pct
              : hasWork
                ? 0
                : 100
            : hasWork
              ? 0
              : 100;
          const pctValue = displayPct;
          const tone = getRupturePctTone(displayPct);
          const summary = hasSecondImport
            ? hasWork || row.morningCollab > 0
              ? `${row.morningCollab} -> ${row.finCollab ?? 0} restantes · traité : ${row.treated ?? 0}`
              : "0 rupture collab ce jour"
            : hasWork
              ? `${currentOutstanding} rupture${currentOutstanding > 1 ? "s" : ""} à traiter`
              : "0 rupture collab ce jour";
          const pctLabel = hasSecondImport ? `${displayPct}%` : hasWork ? `${currentOutstanding} à traiter` : "RAS";
          const statusLabel = hasSecondImport
            ? !hasWork
              ? "Tout traité"
              : row.pct === 100
              ? "Tout traité"
              : row.treated === 0
                ? `${row.finCollab ?? row.morningCollab} restante${(row.finCollab ?? row.morningCollab) > 1 ? "s" : ""} · 0 traitée`
                : `${row.finCollab ?? 0} restante${(row.finCollab ?? 0) > 1 ? "s" : ""} · ${row.treated ?? 0} traitée${(row.treated ?? 0) > 1 ? "s" : ""}`
            : hasWork
              ? "Contrôles à faire"
              : "Aucune rupture collab";
          const cardTone = tone === "#639922"
            ? {
                background: "linear-gradient(180deg, #fbfef6 0%, #f3f9e8 100%)",
                border: "#cfe4a8",
                badgeBg: "#eef7dc",
                badgeText: "#5e8e1f",
                meterBg: "#dbe8bf",
                subtle: "#64813b",
              }
            : tone === "#EF9F27"
              ? {
                  background: "linear-gradient(180deg, #fffaf1 0%, #fff3de 100%)",
                  border: "#f6d49c",
                  badgeBg: "#ffedd1",
                  badgeText: "#b86f00",
                  meterBg: "#f8dfb5",
                  subtle: "#9f6a14",
                }
              : {
                  background: "linear-gradient(180deg, #fff7f7 0%, #ffefef 100%)",
                  border: "#f6caca",
                  badgeBg: "#ffe2e4",
                  badgeText: "#cf2330",
                  meterBg: "#f5d0d4",
                  subtle: "#9f2e37",
                };

          return (
            <button
              type="button"
              key={row.employeeId}
              onClick={() => setSelectedEmployeeId(row.employeeId)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: "16px",
                border: `1px solid ${selectedEmployeeId === row.employeeId ? tone : cardTone.border}`,
                background: cardTone.background,
                padding: "12px 14px 12px",
                cursor: "pointer",
                boxShadow: selectedEmployeeId === row.employeeId ? `inset 0 0 0 1px ${tone}` : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#10203b", lineHeight: 1.2, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                    {row.employeeName}
                  </div>
                  <div style={{ marginTop: "7px", fontSize: "12px", color: "#334155", fontWeight: 600, lineHeight: 1.35 }}>
                    {summary}
                  </div>
                  <div style={{ marginTop: "5px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                      Total jour: {row.totalLatest}
                    </span>
                    {hasWork ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "999px",
                          padding: "4px 8px",
                          background: "rgba(255,255,255,0.72)",
                          border: `1px solid ${cardTone.border}`,
                          fontSize: "10px",
                          color: cardTone.badgeText,
                          fontWeight: 800,
                        }}
                      >
                        Contrôles à faire
                      </span>
                    ) : null}
                    {hasSecondImport ? (
                      <span style={{ fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "98px" }}>
                  <div style={{ fontSize: "10px", color: "#7c8aa4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {hasSecondImport ? "Traitement" : "Statut"}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: hasSecondImport ? "74px" : "108px",
                      minHeight: "32px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      background: cardTone.badgeBg,
                      color: cardTone.badgeText,
                      fontSize: hasSecondImport ? "20px" : "12px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {pctLabel}
                  </div>
                  {!hasSecondImport ? (
                    <div style={{ marginTop: "5px", fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                      {statusLabel}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <div style={{ ...progressTrackStyle(), height: "7px", background: cardTone.meterBg }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, pctValue))}%`,
                      height: "100%",
                      background: tone,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        }) : (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Aucun collaborateur suivi pour cette journée.</div>
        )}
      </div>

      {detailEnabled ? (
        <div style={{ marginTop: "18px", borderTop: "1px solid #eef2f7", paddingTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#D40511", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Détail produit
              </div>
              <div style={{ marginTop: "4px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Réaffectation manuelle
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" style={softPillStyle(selectedEmployeeId === "all")} onClick={() => setSelectedEmployeeId("all")}>
                Tous
              </button>
              <button type="button" style={softPillStyle(selectedEmployeeId === "__unassigned__")} onClick={() => setSelectedEmployeeId("__unassigned__")}>
                Non affectés
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: "14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
              <thead>
                <tr>
                  {["Produit", "Statut", "Cause", "Matricule", "Affecté à", "Réaffecter"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #dbe3eb",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDetailRows.length ? visibleDetailRows.slice(0, 150).map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>
                      {row.libelleProduit}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.statut || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.cause || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.matriculeSource || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.employeeId ? employeeNameById.get(row.employeeId) ?? "Inconnu" : "Non affecté"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      <select
                        value={row.employeeId ?? ""}
                        onChange={(event) => onReassign(row.id, event.target.value || null)}
                        disabled={savingReassign}
                        style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", background: "#fff", padding: "0 10px", fontSize: "12px", color: "#334155" }}
                      >
                        <option value="">Non affecté</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 12px", fontSize: "12px", color: "#94a3b8" }}>
                      Aucun détail disponible pour cette sélection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
    </div>
  );
}

function HistoricalView({
  historyRange,
  onHistoryRangeChange,
  selectedDate,
  historyRows,
}: {
  historyRange: RuptureHistoryRange;
  onHistoryRangeChange: (range: RuptureHistoryRange) => void;
  selectedDate: string;
  historyRows: RuptureHistoryRow[];
}) {
  return (
    <Card style={baseCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <Kicker moduleKey="ruptures" label="Stats historiques" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Moyenne par collaborateur</h2>
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
            Calculé uniquement sur les jours où le collaborateur avait des ruptures collab à traiter.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["week", "month", "quarter", "year"] as const).map((range) => (
            <button key={range} type="button" onClick={() => onHistoryRangeChange(range)} style={softPillStyle(historyRange === range)}>
              {range === "week" ? "Semaine" : range === "month" ? "Mois" : range === "quarter" ? "Trimestre" : "Année"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "10px" }}>
        Période de référence autour du {formatRuptureDateLabel(selectedDate)}.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "14px" }}>
        {historyRows.length ? historyRows.map((row) => {
          const tone = getRupturePctTone(row.averagePct);
          const cardTone = tone === "#639922"
            ? {
                background: "linear-gradient(180deg, #fbfef6 0%, #f3f9e8 100%)",
                border: "#cfe4a8",
                badgeBg: "#eef7dc",
                badgeText: "#5e8e1f",
                meterBg: "#dbe8bf",
                subtle: "#64813b",
              }
            : tone === "#EF9F27"
              ? {
                  background: "linear-gradient(180deg, #fffaf1 0%, #fff3de 100%)",
                  border: "#f6d49c",
                  badgeBg: "#ffedd1",
                  badgeText: "#b86f00",
                  meterBg: "#f8dfb5",
                  subtle: "#9f6a14",
                }
              : {
                  background: "linear-gradient(180deg, #fff7f7 0%, #ffefef 100%)",
                  border: "#f6caca",
                  badgeBg: "#ffe2e4",
                  badgeText: "#cf2330",
                  meterBg: "#f5d0d4",
                  subtle: "#9f2e37",
                };
          return (
            <div
              key={row.employeeId}
              style={{
                borderRadius: "16px",
                border: `1px solid ${cardTone.border}`,
                background: cardTone.background,
                padding: "12px 14px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#10203b", lineHeight: 1.2, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                    {row.employeeName}
                  </div>
                  <div style={{ marginTop: "7px", fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                    {row.dayCount} jour(s) avec ruptures collab sur la période
                  </div>
                  <div style={{ marginTop: "5px", fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                    Moyenne calculée sur les journées actives seulement
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "96px" }}>
                  <div style={{ fontSize: "10px", color: "#7c8aa4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Moyenne
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "78px",
                      minHeight: "32px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      background: cardTone.badgeBg,
                      color: cardTone.badgeText,
                      fontSize: "20px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {row.averagePct === null ? "—" : `${row.averagePct}%`}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <div style={{ ...progressTrackStyle(), height: "7px", background: cardTone.meterBg }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, row.averagePct === null ? 100 : row.averagePct))}%`,
                      height: "100%",
                      background: tone,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Aucune statistique exploitable sur cette période.</div>
        )}
      </div>
    </Card>
  );
}

export default function RupturesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("equipe");
  const [historyRange, setHistoryRange] = useState<RuptureHistoryRange>("week");
  const [period, setPeriod] = useState<RupturePeriod>("matin");
  const [selectedDate, setSelectedDate] = useState<string>(formatLocalIsoDate(new Date()));
  const [dashboardData, setDashboardData] = useState<RupturesDashboardData | null>(null);
  const [selectedPerimetreFile, setSelectedPerimetreFile] = useState<File | null>(null);
  const [selectedDetailFile, setSelectedDetailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingReassign, setSavingReassign] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshDashboard = async (dateOverride?: string, rangeOverride?: RuptureHistoryRange) => {
    const data = await loadRupturesDashboard(dateOverride ?? selectedDate, rangeOverride ?? historyRange);
    setDashboardData(data);
    setSelectedDate(data.selectedDate);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const data = await loadRupturesDashboard(selectedDate, historyRange);
        if (cancelled) return;
        setDashboardData(data);
        setSelectedDate(data.selectedDate);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger le module ruptures.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [historyRange, selectedDate]);

  const selectedDateIndex = useMemo(
    () => dashboardData?.availableDates.findIndex((item) => item === selectedDate) ?? -1,
    [dashboardData?.availableDates, selectedDate],
  );

  const handlePickRelativeDate = async (direction: -1 | 1) => {
    if (!dashboardData || selectedDateIndex < 0) return;
    const nextDate = dashboardData.availableDates[selectedDateIndex + direction];
    if (!nextDate) return;
    setError("");
    setSuccess("");
    setSelectedDate(nextDate);
  };

  const handleImport = async () => {
    if (!selectedPerimetreFile || !selectedDetailFile) {
      setError("Choisis les deux fichiers de la période avant de lancer l'import.");
      setSuccess("");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setSuccess("");

      const [employees, sourceInfo] = await Promise.all([
        loadRupturesEmployees(),
        extractRupturesImportSourceInfo(selectedPerimetreFile),
      ]);
      const [parsedRows, detailSummary, parsedDetailRows] = await Promise.all([
        parseRupturePerimetreFile(selectedPerimetreFile, employees),
        inspectRuptureDetailFile(selectedDetailFile),
        parseRuptureDetailFile(selectedDetailFile, employees),
      ]);
      const importId = await saveParsedRupturesImport({
        period,
        sourceImportedAt: sourceInfo.sourceImportedAt,
        fileName: selectedPerimetreFile.name,
        detailFileName: selectedDetailFile.name,
        detailRowCount: detailSummary.rowCount,
        rows: parsedRows,
        detailRows: parsedDetailRows,
      });

      const nextDate = formatLocalIsoDate(new Date(sourceInfo.sourceImportedAt));
      setSelectedPerimetreFile(null);
      setSelectedDetailFile(null);
      setSelectedDate(nextDate);
      await refreshDashboard(nextDate);
      setSuccess(`Import enregistré (${sourceInfo.sourceLabel}) · ${parsedRows.length} rayon(s) · ${detailSummary.rowCount} ligne(s) détail · id ${importId.slice(0, 8)}.`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "L'import des ruptures a échoué.");
    } finally {
      setImporting(false);
    }
  };

  const handleChangeHistoryRange = async (range: RuptureHistoryRange) => {
    setHistoryRange(range);
    setError("");
  };

  const handleReassign = async (ruptureId: string, employeeId: string | null) => {
    try {
      setSavingReassign(true);
      setError("");
      await reassignRuptureDetail(ruptureId, employeeId);
      await refreshDashboard(selectedDate);
    } catch (reassignError) {
      setError(reassignError instanceof Error ? reassignError.message : "La réaffectation a échoué.");
    } finally {
      setSavingReassign(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        compact
        moduleKey="ruptures"
        title="Suivi des ruptures"
        description="Import du fichier périmètre, lecture équipe, lecture collaborateurs et statistiques historiques sur le site manager."
      />

      <ImportPanel
        period={period}
        onPeriodChange={setPeriod}
        selectedDate={selectedDate}
        recentImports={dashboardData?.recentImports ?? []}
        perimetreFileName={selectedPerimetreFile?.name ?? ""}
        detailFileName={selectedDetailFile?.name ?? ""}
        importing={importing}
        error={error}
        onPickDate={(dateKey) => {
          setError("");
          setSuccess("");
          setSelectedDate(dateKey);
        }}
        onFileChange={(slot, file) => {
          setError("");
          setSuccess("");
          if (slot === "perimetre") setSelectedPerimetreFile(file);
          if (slot === "detail") setSelectedDetailFile(file);
        }}
        onImport={() => void handleImport()}
      />

      {success ? (
        <div style={{ borderRadius: "14px", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", padding: "12px 14px", fontSize: "12px" }}>
          {success}
        </div>
      ) : null}

      <Card style={baseCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#D40511", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Journée suivie
            </div>
            <div style={{ marginTop: "4px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{formatRuptureDateLabel(selectedDate)}</div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handlePickRelativeDate(1)} style={softPillStyle(false)} disabled={!dashboardData?.availableDates[selectedDateIndex + 1]}>
              Jour précédent
            </button>
            <button type="button" onClick={() => void handlePickRelativeDate(-1)} style={softPillStyle(false)} disabled={!dashboardData?.availableDates[selectedDateIndex - 1]}>
              Jour suivant
            </button>
            {(["equipe", "collaborateurs", "historique"] as const).map((value) => (
              <button key={value} type="button" style={pillButtonStyle(viewMode === value)} onClick={() => setViewMode(value)}>
                {value === "equipe" ? "Vue équipe" : value === "collaborateurs" ? "Vue collaborateurs" : "Stats historiques"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading || !dashboardData ? (
        <EmptyState text="Chargement du module ruptures..." />
      ) : viewMode === "equipe" ? (
        <TeamView morning={dashboardData.morning} fin={dashboardData.fin} />
      ) : viewMode === "collaborateurs" ? (
        <CollaboratorView
          collaboratorRows={dashboardData.collaboratorRows}
          hasSecondImport={Boolean(dashboardData.fin.importRow)}
          detailRows={dashboardData.detailRows}
          employees={dashboardData.employees.filter((employee) => employee.actif)}
          detailEnabled={dashboardData.detailEnabled}
          savingReassign={savingReassign}
          onReassign={(ruptureId, employeeId) => void handleReassign(ruptureId, employeeId)}
        />
      ) : (
        <HistoricalView
          historyRange={historyRange}
          onHistoryRangeChange={(range) => void handleChangeHistoryRange(range)}
          selectedDate={selectedDate}
          historyRows={dashboardData.historyRows}
        />
      )}
    </section>
  );
}
