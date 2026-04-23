"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Operation } from "@/lib/plan-rayon-data";
import {
  buildPlanRayonPackages,
  buildPlanRayonTimelineDaysForMonth,
  formatPlanRayonMonthKey,
  formatPlanRayonShortDate,
  getPlanRayonDaysBetween,
  getPlanRayonOperationSummary,
  getPlanRayonStatusPill,
  getPlanRayonTheme,
  groupPlanRayonPackagesByMonth,
  isPlanRayonReplanned,
  loadPlanRayonExportSnapshot,
  parsePlanRayonISODate,
  PLAN_RAYON_DAY_LABELS,
  PLAN_RAYON_MONTH_SHORT_LABELS,
  type PlanRayonPackage,
  type PlanRayonSnapshot,
} from "@/lib/plan-rayon-export";

type PlanRayonPrintPageClientProps = {
  documentType: "gantt" | "calendar";
  operationId: string;
};

const PACKAGE_PANEL_COLORS = ["#eef6ff", "#fff7db", "#f3efff", "#eefbf2"];

function PrintPageShell({
  title,
  subtitle,
  rightLabel,
  children,
}: {
  title: string;
  subtitle: string;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        minHeight: "270mm",
        display: "grid",
        alignContent: "start",
        gap: 12,
        paddingBottom: 8,
        breakAfter: "page",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#d71920",
            }}
          >
            {title}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#617286" }}>{subtitle}</div>
        </div>
        {rightLabel ? (
          <div style={{ fontSize: 11, color: "#617286", fontWeight: 700 }}>{rightLabel}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PackageCard({
  item,
  plans,
  compact = false,
}: {
  item: PlanRayonPackage;
  plans: PlanRayonSnapshot["plans"];
  compact?: boolean;
}) {
  const primary = item.interventions[0];
  const theme = getPlanRayonTheme(primary.section, plans[primary.section]);
  const status = getPlanRayonStatusPill(primary.status);

  return (
    <article
      style={{
        border: "1px solid #dbe3eb",
        borderRadius: 18,
        overflow: "hidden",
        background: "#fff",
        breakInside: "avoid",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "6px 1fr" : "6px 1fr 1.35fr",
          minHeight: compact ? 118 : 138,
        }}
      >
        <div style={{ background: theme.color }} />
        <div style={{ padding: compact ? 14 : 16, display: "grid", alignContent: "center", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#617286" }}>
            {PLAN_RAYON_DAY_LABELS[parsePlanRayonISODate(item.start).getDay()]}
            {item.start !== item.end ? ` → ${PLAN_RAYON_DAY_LABELS[parsePlanRayonISODate(item.end).getDay()]}` : ""}
          </div>
          <div style={{ fontSize: compact ? 16 : 18, fontWeight: 800, color: "#13243b" }}>
            {parsePlanRayonISODate(item.start).getDate()}{" "}
            {PLAN_RAYON_MONTH_SHORT_LABELS[parsePlanRayonISODate(item.start).getMonth()]}
            {item.start !== item.end
              ? ` → ${parsePlanRayonISODate(item.end).getDate()} ${PLAN_RAYON_MONTH_SHORT_LABELS[parsePlanRayonISODate(item.end).getMonth()]}`
              : ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7",
                color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00",
              }}
            >
              {item.moment}
            </span>
            {item.charged ? (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  background: "#ffe8ec",
                  color: "#d71920",
                }}
              >
                Chargée
              </span>
            ) : null}
            {item.replanned ? (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  background: "#fff7e7",
                  color: "#8b5a00",
                }}
              >
                Replanifiée
              </span>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <div style={{ padding: 16, display: "grid", alignContent: "center", gap: 7 }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                background: theme.light,
                color: theme.text,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: theme.color,
                  display: "inline-block",
                }}
              />
              {item.sectionLabels.join(" + ")}
            </span>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#13243b" }}>
              {item.count > 1 ? `${item.count} rayons / même phase` : primary.rayon}
            </div>
            <div style={{ fontSize: 11, color: "#617286", lineHeight: 1.45 }}>
              {item.count > 1 ? item.rayonLabels.join(" · ") : primary.subtitle || "—"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "4px 9px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  background: status.background,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
            </div>
            {item.count > 1 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 4,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                {item.interventions.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "grid",
                      gap: 3,
                      paddingBottom: 6,
                      borderBottom: "1px dashed #dbe3eb",
                      fontSize: 10.5,
                      color: "#475569",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#13243b" }}>{entry.rayon}</div>
                    {entry.subtitle ? (
                      <div style={{ fontSize: 10, color: "#617286", lineHeight: 1.4 }}>{entry.subtitle}</div>
                    ) : null}
                    <div>
                      <strong>Auchan :</strong> {entry.responsibleAuchan || "—"}
                    </div>
                    <div>
                      <strong>Fournisseur :</strong> {entry.responsibleSupplier || "—"}
                    </div>
                    <div>
                      <strong>Notes :</strong> {entry.notes || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 4, marginTop: 4, fontSize: 10.5, color: "#475569" }}>
                <div>
                  <strong>Auchan :</strong> {primary.responsibleAuchan || "—"}
                </div>
                <div>
                  <strong>Fournisseur :</strong> {primary.responsibleSupplier || "—"}
                </div>
                <div>
                  <strong>Notes :</strong> {primary.notes || "—"}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function GanttPackageOverview({
  operation,
  plans,
}: {
  operation: Operation;
  plans: PlanRayonSnapshot["plans"];
}) {
  const packages = useMemo(() => buildPlanRayonPackages(operation.interventions, plans), [operation.interventions, plans]);

  return (
    <PrintPageShell
      title="Planning réimplantation"
      subtitle={getPlanRayonOperationSummary(operation)}
      rightLabel={`${packages.length} phases`}
    >
      <div
        style={{
          border: "1px solid #dbe3eb",
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#13243b" }}>{operation.name}</div>
          <div style={{ fontSize: 13, color: "#617286", lineHeight: 1.6 }}>
            Vue globale condensée : les rayons qui partagent la même fenêtre de dates sont assemblés dans une
            même phase pour tenir sur une lecture chantier plus claire.
          </div>
        </div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {packages.map((item, index) => (
            <div
              key={item.id}
              style={{
                borderRadius: 18,
                border: "1px solid #dbe3eb",
                background: PACKAGE_PANEL_COLORS[index % PACKAGE_PANEL_COLORS.length],
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#617286" }}>
                    Phase {index + 1}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#13243b" }}>
                    {formatPlanRayonShortDate(item.start)}
                    {item.start !== item.end ? ` → ${formatPlanRayonShortDate(item.end)}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#0a4f98" }}>
                  {item.count} rayon{item.count > 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.sectionLabels.map((label) => (
                  <span
                    key={label}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      background: "#ffffffb5",
                      color: "#13243b",
                      border: "1px solid rgba(148,163,184,0.28)",
                    }}
                  >
                    {label}
                  </span>
                ))}
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7",
                    color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00",
                  }}
                >
                  {item.moment}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.55 }}>{item.rayonLabels.join(" · ")}</div>
            </div>
          ))}
        </div>
      </div>
    </PrintPageShell>
  );
}

function GanttMonthSheet({
  operation,
  monthKey,
  items,
  plans,
}: {
  operation: Operation;
  monthKey: string;
  items: PlanRayonPackage[];
  plans: PlanRayonSnapshot["plans"];
}) {
  const timelineDays = useMemo(() => buildPlanRayonTimelineDaysForMonth(monthKey), [monthKey]);
  const fixedColumns = [
    { key: "phase", label: "Phase", width: 64 },
    { key: "dates", label: "Dates", width: 120 },
    { key: "rayons", label: "Rayons regroupés", width: 300 },
    { key: "details", label: "Repères", width: 140 },
  ];
  const dayWidth = 18;
  const totalWidth = fixedColumns.reduce((sum, item) => sum + item.width, 0) + timelineDays.length * dayWidth;

  return (
    <PrintPageShell
      title={`Planning mensuel · ${formatPlanRayonMonthKey(monthKey)}`}
      subtitle={`${operation.name} · ${items.length} phase${items.length > 1 ? "s" : ""} sur le mois`}
      rightLabel={`${timelineDays.length} jours`}
    >
      <div
        style={{
          border: "1px solid #dbe3eb",
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div style={{ minWidth: totalWidth }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${fixedColumns.map((column) => `${column.width}px`).join(" ")} repeat(${timelineDays.length}, ${dayWidth}px)`,
              background: "#f8fafc",
              borderBottom: "1px solid #dbe3eb",
            }}
          >
            {fixedColumns.map((column) => (
              <div
                key={column.key}
                style={{
                  padding: "10px 8px",
                  borderRight: "1px solid #dbe3eb",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#617286",
                }}
              >
                {column.label}
              </div>
            ))}
            {timelineDays.map((day) => (
              <div
                key={day.iso}
                style={{
                  padding: "8px 0",
                  textAlign: "center",
                  borderRight: "1px solid #eef2f7",
                  background: day.weekend ? "#fbfdff" : "#f8fafc",
                  color: day.weekend ? "#aab3be" : "#617286",
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                <div>{PLAN_RAYON_DAY_LABELS[day.weekday]}</div>
                <div style={{ marginTop: 2 }}>{day.day}</div>
              </div>
            ))}
          </div>

          {items.map((item, index) => {
            const section = getPlanRayonTheme(item.interventions[0].section, plans[item.interventions[0].section]);
            const monthStart = timelineDays[0]?.iso ?? item.start;
            const startOffset = Math.max(0, getPlanRayonDaysBetween(monthStart, item.start));
            const endOffset = Math.min(timelineDays.length - 1, getPlanRayonDaysBetween(monthStart, item.end));
            const span = Math.max(1, endOffset - startOffset + 1);
            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `${fixedColumns.map((column) => `${column.width}px`).join(" ")} repeat(${timelineDays.length}, ${dayWidth}px)`,
                  borderBottom: "1px solid #eef2f7",
                  background: index % 2 ? "#fcfdff" : "#fff",
                }}
              >
                <div style={{ padding: 10, borderRight: "1px solid #eef2f7", fontSize: 11, fontWeight: 800, color: "#13243b" }}>
                  P{index + 1}
                </div>
                <div style={{ padding: 10, borderRight: "1px solid #eef2f7", fontSize: 11, color: "#13243b", fontWeight: 800 }}>
                  {formatPlanRayonShortDate(item.start)}
                  {item.start !== item.end ? ` → ${formatPlanRayonShortDate(item.end)}` : ""}
                </div>
                <div style={{ padding: 10, borderRight: "1px solid #eef2f7", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        width: "fit-content",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: section.light,
                        color: section.text,
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: section.color, display: "inline-block" }} />
                      {item.sectionLabels.join(" + ")}
                    </span>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 800,
                        background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7",
                        color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00",
                      }}
                    >
                      {item.moment}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.45 }}>{item.rayonLabels.join(" · ")}</div>
                </div>
                <div style={{ padding: 10, borderRight: "1px solid #eef2f7", display: "grid", alignContent: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "#617286" }}>{item.count} rayon{item.count > 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 10, color: "#617286" }}>
                    {item.charged ? "Nuit chargée" : "Standard"}
                    {item.replanned ? " · Replanifiée" : ""}
                  </div>
                </div>
                {timelineDays.map((day, dayIndex) => {
                  const isStart = dayIndex === startOffset;
                  return (
                    <div
                      key={`${item.id}-${day.iso}`}
                      style={{
                        position: "relative",
                        minHeight: 60,
                        borderLeft: "1px solid #f1f5f9",
                        background: day.weekend ? "rgba(15,23,42,0.015)" : undefined,
                      }}
                    >
                      {isStart ? (
                        <div
                          style={{
                            position: "absolute",
                            left: 2,
                            top: 9,
                            width: `calc(${span * dayWidth}px - 4px)`,
                            minWidth: 18,
                            minHeight: 36,
                            borderRadius: 14,
                            background: section.color,
                            boxShadow: "0 8px 16px rgba(15,23,42,0.10)",
                            zIndex: 1,
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </PrintPageShell>
  );
}

function GanttPrintDocument({ operation, plans }: { operation: Operation; plans: PlanRayonSnapshot["plans"] }) {
  const packages = useMemo(() => buildPlanRayonPackages(operation.interventions, plans), [operation.interventions, plans]);
  const groupedByMonth = useMemo(() => groupPlanRayonPackagesByMonth(packages), [packages]);
  const monthEntries = useMemo(() => Object.entries(groupedByMonth), [groupedByMonth]);

  return (
    <div style={{ display: "grid", gap: 0 }}>
      <GanttPackageOverview operation={operation} plans={plans} />
      {monthEntries.map(([monthKey, items]) => (
        <GanttMonthSheet key={monthKey} operation={operation} monthKey={monthKey} items={items} plans={plans} />
      ))}
    </div>
  );
}

function CalendarPrintSheet({ operation, plans }: { operation: Operation; plans: PlanRayonSnapshot["plans"] }) {
  const packages = useMemo(() => buildPlanRayonPackages(operation.interventions, plans), [operation.interventions, plans]);
  const grouped = useMemo(() => groupPlanRayonPackagesByMonth(packages), [packages]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d71920" }}>
            Calendrier réimplantation
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 28, lineHeight: 1.1, color: "#13243b" }}>{operation.name}</h1>
          <div style={{ marginTop: 6, fontSize: 12, color: "#617286" }}>{getPlanRayonOperationSummary(operation)}</div>
        </div>
        <div style={{ fontSize: 11, color: "#617286", fontWeight: 700 }}>{operation.interventions.length} interventions</div>
      </div>

      {Object.entries(grouped).map(([monthKey, items]) => (
        <div key={monthKey} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d71920" }}>
              {formatPlanRayonMonthKey(monthKey)}
            </span>
            <div style={{ height: 1, background: "#dbe3eb", flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#617286" }}>{items.length} phases</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {items.map((item) => (
              <PackageCard key={item.id} item={item} plans={plans} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlanRayonPrintPageClient({ documentType, operationId }: PlanRayonPrintPageClientProps) {
  const printStartedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<PlanRayonSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      const nextSnapshot = await loadPlanRayonExportSnapshot();
      if (!mounted) return;
      setSnapshot(nextSnapshot);
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const operation = useMemo(
    () => snapshot?.operations.find((item) => item.id === operationId) ?? snapshot?.operations[0] ?? null,
    [snapshot, operationId],
  );

  useEffect(() => {
    if (!operation) return;
    document.title =
      documentType === "gantt"
        ? `Export planning reimplantation - ${operation.name}`
        : `Export calendrier reimplantation - ${operation.name}`;
  }, [documentType, operation]);

  useEffect(() => {
    if (printStartedRef.current) return;
    if (!snapshot || !operation) return;
    printStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [snapshot, operation]);

  if (!snapshot || !operation) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", padding: 12 }}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: 10mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>
      {documentType === "calendar" ? (
        <CalendarPrintSheet operation={operation} plans={snapshot.plans} />
      ) : (
        <GanttPrintDocument operation={operation} plans={snapshot.plans} />
      )}
    </div>
  );
}
