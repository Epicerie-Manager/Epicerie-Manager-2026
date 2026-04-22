"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Card } from "@/components/ui/card";
import {
  cloneOperations,
  clonePlans,
  DEFAULT_OPERATIONS,
  DEFAULT_PLANS,
  SECTION_THEME,
  type Intervention,
  type InterventionMoment,
  type InterventionStatus,
  type Operation,
  type PlanColumn,
  type RayonPlan,
  type SectionKey,
} from "@/lib/plan-rayon-data";
import { loadPlanRayonState, savePlanRayonState } from "@/lib/plan-rayon-db";
import { colors } from "@/lib/theme";

type TabKey = "gantt" | "tableau" | "calendrier" | "plans" | "masse";

type PlanState = Record<string, RayonPlan>;
type MassPlanCell = { label: string; color: string; rotation: number };
type MassPlanAlley = {
  label: string;
  color: string;
  rotation: number;
  orientation: "horizontal" | "vertical";
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};
type MassPlanLinkedView = {
  viewId: string;
  startRow: number;
  startCol: number;
};
type MassPlanViewState = {
  id: string;
  title: string;
  icon: string;
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  cells: Record<string, MassPlanCell>;
  alleys: Record<string, MassPlanAlley>;
  linkedViews: Record<string, MassPlanLinkedView>;
};
type MassPlanState = {
  activeViewId: string;
  views: Record<string, MassPlanViewState>;
};

const OPS_STORAGE_KEY = "plan-rayon-native-ops-v1";
const PLANS_STORAGE_KEY = "plan-rayon-native-plans-v1";
const MASS_PLAN_STORAGE_KEY = "plan-rayon-native-mass-v1";
const PLAN_RAYON_STORE_KEY = "villebon-2";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTH_LABELS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const MONTH_SHORT_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
const MASS_PLAN_ICON_OPTIONS = ["🏬", "🍬", "🧂", "🌍", "🌿", "🥤", "🛒", "📦", "🧩", "⭐"];
const DEFAULT_MASS_VIEW_ID = "global";
const DEFAULT_PLAN_SECTION_ORDER = Object.keys(DEFAULT_PLANS) as SectionKey[];

const tabItems: Array<{ key: TabKey; label: string }> = [
  { key: "gantt", label: "Planning" },
  { key: "tableau", label: "Tableau" },
  { key: "calendrier", label: "Calendrier" },
  { key: "plans", label: "Plans rayon" },
  { key: "masse", label: "Plan de masse" },
];

function createMassPlanViewState(id: string, title: string, icon: string, overrides?: Partial<Omit<MassPlanViewState, "id" | "title" | "icon">>): MassPlanViewState {
  return {
    id,
    title,
    icon,
    rows: overrides?.rows ?? 8,
    cols: overrides?.cols ?? 12,
    cellWidth: overrides?.cellWidth ?? 88,
    cellHeight: overrides?.cellHeight ?? 72,
    cells: overrides?.cells ?? {},
    alleys: overrides?.alleys ?? {},
    linkedViews: overrides?.linkedViews ?? {},
  };
}

function createDefaultMassPlanState(): MassPlanState {
  return {
    activeViewId: DEFAULT_MASS_VIEW_ID,
    views: {
      [DEFAULT_MASS_VIEW_ID]: createMassPlanViewState(DEFAULT_MASS_VIEW_ID, "Plan global", "🏬"),
    },
  };
}

function getDefaultPlanRayonSnapshot() {
  const operations = cloneOperations(DEFAULT_OPERATIONS);
  return {
    operations,
    plans: clonePlans(DEFAULT_PLANS),
    massPlan: createDefaultMassPlanState(),
    activeOperationId: operations[0]?.id ?? DEFAULT_OPERATIONS[0].id,
  };
}

function normalizeOperationsState(raw: unknown) {
  if (Array.isArray(raw) && raw.length) {
    return {
      operations: raw as Operation[],
      activeOperationId: (raw[0] as Operation | undefined)?.id ?? DEFAULT_OPERATIONS[0].id,
    };
  }

  const fallback = cloneOperations(DEFAULT_OPERATIONS);
  return {
    operations: fallback,
    activeOperationId: fallback[0]?.id ?? DEFAULT_OPERATIONS[0].id,
  };
}

function normalizePlansState(raw: unknown): PlanState {
  if (raw && typeof raw === "object" && Object.keys(raw as object).length) {
    return raw as PlanState;
  }
  return clonePlans(DEFAULT_PLANS);
}

function getOrderedPlanEntries(plans: PlanState): Array<[SectionKey, RayonPlan]> {
  const entries = Object.entries(plans) as Array<[SectionKey, RayonPlan]>;
  const originalIndex = new Map(entries.map(([sectionKey], index) => [sectionKey, index]));

  return [...entries].sort(([leftKey], [rightKey]) => {
    const leftDefaultIndex = DEFAULT_PLAN_SECTION_ORDER.indexOf(leftKey);
    const rightDefaultIndex = DEFAULT_PLAN_SECTION_ORDER.indexOf(rightKey);
    const leftIsDefault = leftDefaultIndex >= 0;
    const rightIsDefault = rightDefaultIndex >= 0;

    if (leftIsDefault && rightIsDefault) {
      return leftDefaultIndex - rightDefaultIndex;
    }

    if (leftIsDefault) return -1;
    if (rightIsDefault) return 1;

    return (originalIndex.get(leftKey) ?? 0) - (originalIndex.get(rightKey) ?? 0);
  });
}

function normalizeMassPlanState(raw: unknown): MassPlanState {
  if (raw && typeof raw === "object") {
    const parsed = raw as MassPlanState | (MassPlanViewState & { rows: number; cols: number });
    if ("views" in parsed && parsed.views) {
      const normalizedViews = Object.fromEntries(
        Object.entries(parsed.views).map(([viewId, view]) => [
          viewId,
          normalizeMassPlanView(view, {
            id: viewId,
            title: view.title ?? "Plan",
            icon: view.icon ?? "🗂️",
            rows: view.rows ?? 8,
            cols: view.cols ?? 12,
            cellWidth: view.cellWidth ?? 88,
            cellHeight: view.cellHeight ?? 72,
          }),
        ]),
      );
      const activeViewId = normalizedViews[parsed.activeViewId] ? parsed.activeViewId : Object.keys(normalizedViews)[0] ?? DEFAULT_MASS_VIEW_ID;
      return {
        activeViewId,
        views: Object.keys(normalizedViews).length ? normalizedViews : createDefaultMassPlanState().views,
      };
    }

    if ("rows" in parsed && parsed?.rows && parsed?.cols) {
      const legacyView = normalizeMassPlanView(parsed, {
        id: DEFAULT_MASS_VIEW_ID,
        title: "Plan global",
        icon: "🏬",
        rows: parsed.rows ?? 8,
        cols: parsed.cols ?? 12,
        cellWidth: parsed.cellWidth ?? 88,
        cellHeight: parsed.cellHeight ?? 72,
      });
      return {
        activeViewId: legacyView.id,
        views: {
          [legacyView.id]: legacyView,
        },
      };
    }
  }

  return createDefaultMassPlanState();
}

function readLocalPlanRayonSnapshot() {
  const fallback = getDefaultPlanRayonSnapshot();
  try {
    const storedOperations = window.localStorage.getItem(OPS_STORAGE_KEY);
    const storedPlans = window.localStorage.getItem(PLANS_STORAGE_KEY);
    const storedMassPlan = window.localStorage.getItem(MASS_PLAN_STORAGE_KEY);

    const normalizedOperations = normalizeOperationsState(storedOperations ? JSON.parse(storedOperations) : null);
    const normalizedPlans = normalizePlansState(storedPlans ? JSON.parse(storedPlans) : null);
    const normalizedMassPlan = normalizeMassPlanState(storedMassPlan ? JSON.parse(storedMassPlan) : null);

    return {
      operations: normalizedOperations.operations,
      plans: normalizedPlans,
      massPlan: normalizedMassPlan,
      activeOperationId: normalizedOperations.activeOperationId,
    };
  } catch {
    return fallback;
  }
}

function normalizeMassPlanView(raw: Partial<MassPlanViewState> & {
  cells?: Record<string, MassPlanCell>;
  alleys?: Record<string, MassPlanAlley | {
    label: string;
    color: string;
    rotation?: number;
    orientation: "horizontal" | "vertical";
    startRow?: number;
    endRow?: number;
    startCol?: number;
    endCol?: number;
    index?: number;
    x?: number;
    y?: number;
  }>;
}, fallback: { id: string; title: string; icon: string; rows: number; cols: number; cellWidth: number; cellHeight: number }): MassPlanViewState {
  const rows = raw.rows ?? fallback.rows;
  const cols = raw.cols ?? fallback.cols;
  const cellWidth = raw.cellWidth ?? fallback.cellWidth;
  const cellHeight = raw.cellHeight ?? fallback.cellHeight;
  const normalizedAlleys = Object.fromEntries(
    Object.entries(raw.alleys ?? {}).map(([key, alley]) => {
      const legacyAlley = alley as {
        label: string;
        color: string;
        rotation?: number;
        orientation: "horizontal" | "vertical";
        startRow?: number;
        endRow?: number;
        startCol?: number;
        endCol?: number;
        index?: number;
        x?: number;
        y?: number;
      };
      return [
        key,
        {
          label: legacyAlley.label,
          color: legacyAlley.color,
          rotation: legacyAlley.rotation ?? 0,
          orientation: legacyAlley.orientation,
          startRow:
            typeof legacyAlley.startRow === "number"
              ? legacyAlley.startRow
              : legacyAlley.orientation === "horizontal"
                ? Math.min(Math.max(0, typeof legacyAlley.index === "number" ? legacyAlley.index : Math.round((legacyAlley.y ?? 0) / (cellHeight + 8))), Math.max(0, rows - 1))
                : 0,
          endRow:
            typeof legacyAlley.endRow === "number"
              ? legacyAlley.endRow
              : legacyAlley.orientation === "horizontal"
                ? Math.min(Math.max(0, typeof legacyAlley.index === "number" ? legacyAlley.index : Math.round((legacyAlley.y ?? 0) / (cellHeight + 8))), Math.max(0, rows - 1))
                : Math.max(0, rows - 1),
          startCol:
            typeof legacyAlley.startCol === "number"
              ? legacyAlley.startCol
              : legacyAlley.orientation === "vertical"
                ? Math.min(Math.max(0, typeof legacyAlley.index === "number" ? legacyAlley.index : Math.round((legacyAlley.x ?? 0) / (cellWidth + 8))), Math.max(0, cols - 1))
                : 0,
          endCol:
            typeof legacyAlley.endCol === "number"
              ? legacyAlley.endCol
              : legacyAlley.orientation === "vertical"
                ? Math.min(Math.max(0, typeof legacyAlley.index === "number" ? legacyAlley.index : Math.round((legacyAlley.x ?? 0) / (cellWidth + 8))), Math.max(0, cols - 1))
                : Math.max(0, cols - 1),
        } satisfies MassPlanAlley,
      ] as const;
    }),
  );

  return createMassPlanViewState(raw.id ?? fallback.id, raw.title ?? fallback.title, raw.icon ?? fallback.icon, {
    rows,
    cols,
    cellWidth,
    cellHeight,
    cells: raw.cells ?? {},
    alleys: normalizedAlleys,
    linkedViews: raw.linkedViews ?? {},
  });
}

function parseISODate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatLongDate(value: string) {
  const date = parseISODate(value);
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

function formatMonthTitle(date: Date) {
  return `${MONTH_LABELS[date.getMonth()].charAt(0).toUpperCase()}${MONTH_LABELS[date.getMonth()].slice(1)} ${date.getFullYear()}`;
}

function formatMonthKey(value: string) {
  const [year, month] = value.split("-");
  return `${MONTH_LABELS[Number(month) - 1].charAt(0).toUpperCase()}${MONTH_LABELS[Number(month) - 1].slice(1)} ${year}`;
}

function addDays(value: string, amount: number) {
  const date = parseISODate(value);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getDaysBetween(start: string, end: string) {
  return Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / 86400000);
}

function getRangeStart(interventions: Intervention[]) {
  const minDate = interventions.reduce((current, item) => (item.start < current ? item.start : current), interventions[0]?.start ?? "2026-05-01");
  const [year, month] = minDate.split("-");
  return `${year}-${month}-01`;
}

function getRangeEnd(interventions: Intervention[]) {
  const maxDate = interventions.reduce((current, item) => (item.end > current ? item.end : current), interventions[0]?.end ?? "2026-06-30");
  const date = parseISODate(`${maxDate.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.toISOString().slice(0, 10);
}

function buildTimelineDays(interventions: Intervention[]) {
  const start = getRangeStart(interventions);
  const end = getRangeEnd(interventions);
  const totalDays = getDaysBetween(start, end) + 1;
  const startDate = parseISODate(start);
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      index,
      date,
      iso: date.toISOString().slice(0, 10),
      day: date.getDate(),
      weekday: date.getDay(),
      weekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

function groupTimelineMonths(days: ReturnType<typeof buildTimelineDays>) {
  const groups: Array<{ key: string; label: string; count: number }> = [];
  days.forEach((day) => {
    const key = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}`;
    const last = groups.at(-1);
    if (!last || last.key !== key) {
      groups.push({ key, label: formatMonthTitle(day.date), count: 1 });
      return;
    }
    last.count += 1;
  });
  return groups;
}

function getOperationSummary(operation: Operation) {
  if (!operation.interventions.length) {
    return "Aucune intervention definie";
  }
  const starts = operation.interventions.map((item) => item.start).sort();
  const ends = operation.interventions.map((item) => item.end).sort();
  const chargedCount = operation.interventions.filter((item) => item.charged).length;
  return `${formatLongDate(starts[0])} → ${formatLongDate(ends.at(-1) ?? ends[0])} · ${operation.interventions.length} interventions${chargedCount ? ` · ${chargedCount} nuits chargees` : ""}`;
}

function getStatusPill(status: InterventionStatus) {
  if (status === "fait") return { label: "Fait", background: "#eaf7ef", color: "#1b8b4b" };
  if (status === "cours") return { label: "En cours", background: "#fff3ee", color: "#ea580c" };
  return { label: "A faire", background: "#f5f7f9", color: "#617286" };
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function slugifySectionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `univers-${Date.now()}`;
}

function getPlanTheme(section: string, plan?: RayonPlan) {
  const preset = Object.prototype.hasOwnProperty.call(SECTION_THEME, section)
    ? SECTION_THEME[section as keyof typeof SECTION_THEME]
    : null;
  if (preset) return preset;
  const color = plan?.columns[0]?.color ?? "#4b5563";
  return {
    color,
    light: hexToRgba(color, 0.14),
    text: "#13243b",
    label: plan?.title ?? "Univers",
    icon: plan?.icon ?? "🧩",
  };
}

function isReplanned(item: Intervention) {
  return item.start !== item.originalStart || item.end !== item.originalEnd;
}

function deepCloneIntervention(item: Intervention): Intervention {
  return { ...item };
}

function createEmptyIntervention(section: SectionKey = "sucree", rayon = ""): Intervention {
  const today = "2026-05-01";
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    start: today,
    end: today,
    originalStart: today,
    originalEnd: today,
    moment: "Nuit",
    section,
    rayon,
    subtitle: "",
    charged: false,
    status: "todo",
    responsibleAuchan: "",
    responsibleSupplier: "",
    notes: "",
  };
}

function NativeOpsModal({
  open,
  operations,
  activeOperationId,
  plans,
  onClose,
  onSwitchOperation,
  onDeleteOperation,
  onSaveOperation,
}: {
  open: boolean;
  operations: Operation[];
  activeOperationId: string;
  plans: PlanState;
  onClose: () => void;
  onSwitchOperation: (operationId: string) => void;
  onDeleteOperation: (operationId: string) => void;
  onSaveOperation: (operation: Operation, existingId: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftInterventions, setDraftInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setDraftName("");
    setDraftInterventions([createEmptyIntervention()]);
  }, [open]);

  if (!open) return null;

  const orderedPlanEntries = getOrderedPlanEntries(plans);

  const rayonOptions = orderedPlanEntries.flatMap(([sectionKey, plan]) =>
    plan.columns.map((column) => ({
      section: sectionKey as SectionKey,
      label: `${plan.title} · ${column.name}`,
      rayon: column.name,
    })),
  );

  function startEditing(operation: Operation) {
    setEditingId(operation.id);
    setDraftName(operation.name);
    setDraftInterventions(operation.interventions.map(deepCloneIntervention));
  }

  function resetDraft() {
    setEditingId(null);
    setDraftName("");
    setDraftInterventions([createEmptyIntervention()]);
  }

  function updateDraftIntervention(id: string, patch: Partial<Intervention>) {
    setDraftInterventions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function saveDraft() {
    const cleanName = draftName.trim();
    const filtered = draftInterventions.filter((item) => item.rayon.trim());
    if (!cleanName || !filtered.length) return;

    const payload: Operation = {
      id: editingId ?? `op-${Date.now()}`,
      name: cleanName,
      locked: false,
      interventions: filtered.map((item) => ({
        ...item,
        originalStart: editingId ? item.originalStart : item.start,
        originalEnd: editingId ? item.originalEnd : item.end,
      })),
    };
    onSaveOperation(payload, editingId);
    resetDraft();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.36)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          borderRadius: 28,
          background: "#ffffff",
          boxShadow: "0 40px 80px rgba(15,23,42,0.24)",
          padding: 24,
          display: "grid",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0a4f98" }}>
              Operations
            </div>
            <h2 style={{ marginTop: 8, fontSize: 28, letterSpacing: "-0.04em", color: "#13243b" }}>Gestion des reimplantations</h2>
            <p style={{ marginTop: 8, color: "#617286", fontSize: 14, lineHeight: 1.6 }}>
              Chaque operation porte son propre planning, ses rayons et ses ajustements locaux.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid #dbe3eb",
              background: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.5fr", gap: 18 }}>
          <Card static style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {operations.map((operation) => {
                const active = operation.id === activeOperationId;
                return (
                  <div
                    key={operation.id}
                    style={{
                      border: `1px solid ${active ? "#bfdbfe" : "#dbe3eb"}`,
                      borderRadius: 16,
                      padding: 12,
                      background: active ? "#edf5ff" : "#fbfcfd",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#13243b" }}>{operation.name}</div>
                        <div style={{ fontSize: 12, color: "#617286", marginTop: 4 }}>
                          {operation.interventions.length} interventions
                        </div>
                      </div>
                      {active ? (
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0a4f98" }}>Active</span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => onSwitchOperation(operation.id)} style={smallButton(active ? "#0a4f98" : "#13243b", active ? "#edf5ff" : "#fff")}>
                        Ouvrir
                      </button>
                      <button type="button" onClick={() => startEditing(operation)} style={smallButton("#13243b", "#fff")}>
                        Editer
                      </button>
                      {!operation.locked ? (
                        <button type="button" onClick={() => onDeleteOperation(operation.id)} style={smallButton("#b91c2e", "#fff1f2")}>
                          Supprimer
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card static style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#13243b" }}>
                  {editingId ? "Edition de l'operation" : "Nouvelle operation"}
                </div>
                <button type="button" onClick={resetDraft} style={smallButton("#617286", "#f8fafc")}>
                  Reinitialiser
                </button>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={labelStyle}>Nom de l'operation</span>
                <input value={draftName} onChange={(event) => setDraftName(event.target.value)} style={inputStyle} placeholder="Ex: Plan de rayon ete 2026" />
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={labelStyle}>Interventions</span>
                <button
                  type="button"
                  onClick={() => setDraftInterventions((current) => [...current, createEmptyIntervention()])}
                  style={smallButton("#0a4f98", "#edf5ff")}
                >
                  + Ajouter
                </button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {draftInterventions.map((item) => (
                  <div key={item.id} style={{ border: "1px solid #dbe3eb", borderRadius: 16, padding: 12, background: "#fbfcfd", display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr)) auto", gap: 8 }}>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={tinyLabelStyle}>Debut</span>
                        <input type="date" value={item.start} onChange={(event) => updateDraftIntervention(item.id, { start: event.target.value })} style={inputStyle} />
                      </label>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={tinyLabelStyle}>Fin</span>
                        <input type="date" value={item.end} onChange={(event) => updateDraftIntervention(item.id, { end: event.target.value })} style={inputStyle} />
                      </label>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={tinyLabelStyle}>Moment</span>
                        <select value={item.moment} onChange={(event) => updateDraftIntervention(item.id, { moment: event.target.value as InterventionMoment })} style={inputStyle}>
                          <option value="Jour">Jour</option>
                          <option value="Nuit">Nuit</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={tinyLabelStyle}>Rayon</span>
                        <select
                          value={`${item.section}|${item.rayon}`}
                          onChange={(event) => {
                            const [section, rayon] = event.target.value.split("|");
                            updateDraftIntervention(item.id, { section: section as SectionKey, rayon });
                          }}
                          style={inputStyle}
                        >
                          <option value={`${item.section}|${item.rayon}`}>{item.rayon || "Choisir un rayon"}</option>
                          {rayonOptions.map((option) => (
                            <option key={`${option.section}-${option.rayon}`} value={`${option.section}|${option.rayon}`}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => setDraftInterventions((current) => current.filter((candidate) => candidate.id !== item.id))}
                        style={smallButton("#b91c2e", "#fff1f2")}
                      >
                        ×
                      </button>
                    </div>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={tinyLabelStyle}>Sous-titre</span>
                      <input value={item.subtitle} onChange={(event) => updateDraftIntervention(item.id, { subtitle: event.target.value })} style={inputStyle} placeholder="Precision du chantier" />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#617286" }}>
                      <input
                        type="checkbox"
                        checked={item.charged}
                        onChange={(event) => updateDraftIntervention(item.id, { charged: event.target.checked })}
                      />
                      Nuit chargee
                    </label>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "end", gap: 10 }}>
                <button type="button" onClick={resetDraft} style={smallButton("#617286", "#fff")}>
                  Annuler
                </button>
                <button type="button" onClick={saveDraft} style={smallButton("#0a4f98", "#edf5ff")}>
                  Enregistrer
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function smallButton(color: string, background: string): CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${color}22`,
    background,
    color,
    minHeight: 34,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
}

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 40,
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid #dbe3eb",
  padding: "0 12px",
  fontSize: 13,
  color: "#13243b",
  background: "#fff",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 72,
  padding: "10px 12px",
  lineHeight: 1.45,
  resize: "vertical",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#617286",
};

const tinyLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#94a3b8",
};

export function NativePlanRayon() {
  const [activeTab, setActiveTab] = useState<TabKey>("gantt");
  const [operations, setOperations] = useState<Operation[]>(() => cloneOperations(DEFAULT_OPERATIONS));
  const [plans, setPlans] = useState<PlanState>(() => clonePlans(DEFAULT_PLANS));
  const [activeOperationId, setActiveOperationId] = useState(DEFAULT_OPERATIONS[0].id);
  const [hydrated, setHydrated] = useState(false);
  const [showOpsModal, setShowOpsModal] = useState(false);
  const [massPlan, setMassPlan] = useState<MassPlanState>(() => createDefaultMassPlanState());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFinishInitialHydrationRef = useRef(false);
  const shouldSkipNextRemoteSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromStorage() {
      const localSnapshot = readLocalPlanRayonSnapshot();

      if (!cancelled) {
        setOperations(localSnapshot.operations);
        setPlans(localSnapshot.plans);
        setMassPlan(localSnapshot.massPlan);
        setActiveOperationId(localSnapshot.activeOperationId);
      }

      const remoteSnapshot = await loadPlanRayonState(PLAN_RAYON_STORE_KEY);

      if (cancelled) return;

      if (remoteSnapshot) {
        const normalizedRemote = {
          ...normalizeOperationsState(remoteSnapshot.operations),
          plans: normalizePlansState(remoteSnapshot.plans),
          massPlan: normalizeMassPlanState(remoteSnapshot.mass_plan),
        };

        setOperations(normalizedRemote.operations);
        setPlans(normalizedRemote.plans);
        setMassPlan(normalizedRemote.massPlan);
        setActiveOperationId(normalizedRemote.activeOperationId);
      }

      didFinishInitialHydrationRef.current = true;
      setHydrated(true);
    }

    void hydrateFromStorage();

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(operations));
    window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
    window.localStorage.setItem(MASS_PLAN_STORAGE_KEY, JSON.stringify(massPlan));

    if (!didFinishInitialHydrationRef.current) {
      return;
    }

    if (shouldSkipNextRemoteSaveRef.current) {
      shouldSkipNextRemoteSaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void savePlanRayonState(PLAN_RAYON_STORE_KEY, {
        operations,
        plans,
        mass_plan: massPlan,
      });
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [operations, plans, massPlan, hydrated]);

  const activeOperation = operations.find((item) => item.id === activeOperationId) ?? operations[0];
  const interventions = activeOperation?.interventions ?? [];
  const timelineDays = buildTimelineDays(interventions);
  const monthGroups = groupTimelineMonths(timelineDays);
  const totalDone = interventions.filter((item) => item.status === "fait").length;
  const totalDoing = interventions.filter((item) => item.status === "cours").length;
  const totalTodo = interventions.filter((item) => item.status === "todo").length;
  const chargedCount = interventions.filter((item) => item.charged).length;
  const showReimplantationMeta = activeTab === "gantt" || activeTab === "tableau" || activeTab === "calendrier";

  function updateIntervention(interventionId: string, patch: Partial<Intervention>) {
    setOperations((current) =>
      current.map((operation) =>
        operation.id !== activeOperation.id
          ? operation
          : {
              ...operation,
              interventions: operation.interventions.map((intervention) =>
                intervention.id === interventionId ? { ...intervention, ...patch } : intervention,
              ),
            },
      ),
    );
  }

  function saveOperation(operation: Operation, existingId: string | null) {
    setOperations((current) => {
      if (existingId) {
        return current.map((item) => (item.id === existingId ? operation : item));
      }
      return [...current, operation];
    });
    setActiveOperationId(operation.id);
  }

  function deleteOperation(operationId: string) {
    setOperations((current) => {
      const next = current.filter((item) => item.id !== operationId);
      if (next.length && activeOperationId === operationId) {
        setActiveOperationId(next[0].id);
      }
      return next.length ? next : cloneOperations(DEFAULT_OPERATIONS);
    });
  }

  function resetPlan(section: SectionKey) {
    setPlans((current) => ({
      ...current,
      [section]: clonePlans(DEFAULT_PLANS)[section] ?? {
        ...current[section],
        columns: [],
      },
    }));
  }

  function updatePlanColumn(section: SectionKey, columnId: string, patch: Partial<PlanColumn>) {
    setPlans((current) => ({
      ...current,
      [section]: {
        ...current[section],
        columns: current[section].columns.map((column) =>
          column.id === columnId ? { ...column, ...patch } : column,
        ),
      },
    }));
  }

  function removePlanColumn(section: SectionKey, columnId: string) {
    setPlans((current) => ({
      ...current,
      [section]: {
        ...current[section],
        columns: current[section].columns.filter((column) => column.id !== columnId),
      },
    }));
  }

  function addPlanColumn(section: SectionKey, color: string) {
    setPlans((current) => ({
      ...current,
      [section]: {
        ...current[section],
        columns: [
          ...current[section].columns,
          {
            id: `${section}-${Date.now()}`,
            name: "Nouvelle colonne",
            color,
            cells: ["Produit 1", "Produit 2"],
          },
        ],
      },
    }));
  }

  function movePlanColumn(section: SectionKey, columnId: string, direction: "left" | "right") {
    setPlans((current) => {
      const columns = [...current[section].columns];
      const index = columns.findIndex((item) => item.id === columnId);
      if (index < 0) return current;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= columns.length) return current;
      const [column] = columns.splice(index, 1);
      columns.splice(targetIndex, 0, column);
      return {
        ...current,
        [section]: {
          ...current[section],
          columns,
        },
      };
    });
  }

  function addPlanSection(title: string, subtitle: string, color: string, icon: string) {
    const keyBase = slugifySectionKey(title);
    setPlans((current) => {
      let key = keyBase;
      let index = 2;
      while (current[key]) {
        key = `${keyBase}-${index}`;
        index += 1;
      }
      return {
        ...current,
        [key]: {
          title,
          subtitle,
          icon,
          columns: [
            {
              id: `${key}-0`,
              name: "Nouveau rayon",
              color,
              cells: ["Produit 1", "Produit 2"],
            },
          ],
        },
      };
    });
  }

  function addPlanCell(section: SectionKey, columnId: string) {
    const column = plans[section].columns.find((item) => item.id === columnId);
    if (!column) return;
    updatePlanColumn(section, columnId, { cells: [...column.cells, "Nouveau"] });
  }

  function updatePlanCell(section: SectionKey, columnId: string, index: number, value: string) {
    const column = plans[section].columns.find((item) => item.id === columnId);
    if (!column) return;
    const nextCells = [...column.cells];
    nextCells[index] = value;
    updatePlanColumn(section, columnId, { cells: nextCells });
  }

  function removePlanCell(section: SectionKey, columnId: string, index: number) {
    const column = plans[section].columns.find((item) => item.id === columnId);
    if (!column) return;
    updatePlanColumn(section, columnId, { cells: column.cells.filter((_, cellIndex) => cellIndex !== index) });
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 16,
        paddingTop: 18,
        width: "calc(100vw - 40px)",
        marginLeft: "calc(50% - 50vw + 20px)",
      }}
    >
      <ModuleHeader
        moduleKey="planriz"
        title="Plan de rayon"
        description="Module natif pour piloter les reimplantations, suivre les interventions et maintenir les plans de rayons directement dans l'application."
        kicker="Implantation"
        showModuleKeyBadge={false}
      />

      <Card static style={{ padding: 16, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabItems.map((item) => {
              const active = item.key === activeTab;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    minHeight: 40,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: `1px solid ${active ? "#bfdbfe" : "#dbe3eb"}`,
                    background: active ? "#edf5ff" : "#ffffff",
                    color: active ? "#0a4f98" : "#617286",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <Card static style={{ padding: 20, background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: activeTab === "plans" ? "#0a4f98" : "#d71920" }}>
                {activeTab === "plans" ? "Structure des rayons" : activeTab === "masse" ? "Plan de masse" : "Planning reimplantation"}
              </div>
              <h2 style={{ marginTop: 8, fontSize: 40, letterSpacing: "-0.06em", color: "#13243b" }}>
                {activeTab === "plans" ? "Organisation des rayons" : activeTab === "masse" ? "Plan de masse magasin" : activeOperation.name}
              </h2>
              <p style={{ marginTop: 10, color: "#617286", fontSize: 15, lineHeight: 1.7 }}>
                {activeTab === "plans"
                  ? "Le plan rayon sert a structurer durablement les familles et les colonnes. Les operations de reimplantation viennent ensuite se brancher sur cette base."
                  : activeTab === "masse"
                    ? "Ajuste la grille du magasin, puis place les elements issus des plans de rayons pour construire le plan de masse."
                    : getOperationSummary(activeOperation)}
              </p>
            </div>
            {showReimplantationMeta ? (
              <div style={{ display: "grid", gap: 12, justifyItems: "end" }}>
                <button type="button" onClick={() => setShowOpsModal(true)} style={smallButton("#13243b", "#ffffff")}>
                  Réimplantation
                </button>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "end" }}>
                  {[
                    { label: `${totalDone} fait${totalDone > 1 ? "s" : ""}`, background: "#edf5ff", color: "#0a4f98" },
                    { label: `${totalDoing} en cours`, background: "#fff3ee", color: "#ea580c" },
                    { label: `${chargedCount} nuits chargees`, background: "#ffe8ec", color: "#d71920" },
                  ].map((pill) => (
                    <span
                      key={pill.label}
                      style={{
                        minHeight: 36,
                        padding: "0 14px",
                        borderRadius: 999,
                        background: pill.background,
                        color: pill.color,
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        {activeTab === "gantt" ? (
          <NativeGanttView interventions={interventions} timelineDays={timelineDays} monthGroups={monthGroups} plans={plans} onUpdateIntervention={updateIntervention} />
        ) : null}

        {activeTab === "tableau" ? (
          <NativeTableView interventions={interventions} plans={plans} onUpdateIntervention={updateIntervention} />
        ) : null}

        {activeTab === "calendrier" ? (
          <NativeCalendarView interventions={interventions} plans={plans} onUpdateIntervention={updateIntervention} />
        ) : null}

        {activeTab === "plans" ? (
          <NativePlansView
            plans={plans}
            onAddColumn={addPlanColumn}
            onMoveColumn={movePlanColumn}
            onResetPlan={resetPlan}
            onAddSection={addPlanSection}
            onUpdateColumn={updatePlanColumn}
            onRemoveColumn={removePlanColumn}
            onAddCell={addPlanCell}
            onUpdateCell={updatePlanCell}
            onRemoveCell={removePlanCell}
          />
        ) : null}

        {activeTab === "masse" ? (
          <NativeMassPlanView
            plans={plans}
            massPlan={massPlan}
            onChangeMassPlan={setMassPlan}
          />
        ) : null}
      </Card>

      <NativeOpsModal
        open={showOpsModal}
        operations={operations}
        activeOperationId={activeOperationId}
        plans={plans}
        onClose={() => setShowOpsModal(false)}
        onSwitchOperation={(operationId) => {
          setActiveOperationId(operationId);
          setShowOpsModal(false);
        }}
        onDeleteOperation={deleteOperation}
        onSaveOperation={saveOperation}
      />
    </section>
  );
}

function NativeGanttView({
  interventions,
  timelineDays,
  monthGroups,
  plans,
  onUpdateIntervention,
}: {
  interventions: Intervention[];
  timelineDays: ReturnType<typeof buildTimelineDays>;
  monthGroups: ReturnType<typeof groupTimelineMonths>;
  plans: PlanState;
  onUpdateIntervention: (interventionId: string, patch: Partial<Intervention>) => void;
}) {
  const [hoveredInterventionId, setHoveredInterventionId] = useState<string | null>(null);
  const [hoveredDayIso, setHoveredDayIso] = useState<string | null>(null);
  const fixedColumns = [
    { key: "moment", label: "Moment", width: 72 },
    { key: "date", label: "Date", width: 110 },
    { key: "rayon", label: "Rayon", width: 270 },
    { key: "auchan", label: "Pers. Auchan", width: 170 },
    { key: "fournisseur", label: "Pers. Fournisseur", width: 190 },
    { key: "notes", label: "Notes", width: 210 },
  ];
  const dayWidth = 28;
  const gridTemplateColumns = `${fixedColumns.map((column) => `${column.width}px`).join(" ")} repeat(${timelineDays.length}, ${dayWidth}px)`;

  return (
    <Card static style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflow: "auto" }}>
        <div style={{ minWidth: fixedColumns.reduce((sum, item) => sum + item.width, 0) + timelineDays.length * dayWidth }}>
          <div style={{ display: "grid", gridTemplateColumns, borderBottom: "1px solid #dbe3eb", background: "#f8fafc" }}>
            {fixedColumns.map((column) => (
              <div key={column.key} style={headerCellStyle}>
                {column.label}
              </div>
            ))}
            {monthGroups.map((group) => (
              <div key={group.key} style={{ ...headerCellStyle, gridColumn: `span ${group.count}`, textAlign: "center", fontSize: 11, color: "#13243b" }}>
                {group.label}
              </div>
            ))}

            {fixedColumns.map((column) => (
              <div key={`${column.key}-empty`} style={{ ...headerCellStyle, borderTop: "1px solid #dbe3eb" }} />
            ))}
            {timelineDays.map((day) => (
              <div
                key={day.iso}
                style={{
                  ...headerCellStyle,
                  borderTop: "1px solid #dbe3eb",
                  padding: "6px 0",
                  textAlign: "center",
                  background: day.weekend ? "#fbfdff" : "#f8fafc",
                  color: day.weekend ? "#aab3be" : "#617286",
                }}
              >
                {day.day}
              </div>
            ))}
          </div>

          {interventions.map((item, rowIndex) => {
            const section = getPlanTheme(item.section, plans[item.section]);
            const startOffset = getDaysBetween(timelineDays[0]?.iso ?? item.start, item.start);
            const endOffset = getDaysBetween(timelineDays[0]?.iso ?? item.start, item.end);
            const span = Math.max(1, endOffset - startOffset + 1);
            const rowHovered = hoveredInterventionId === item.id;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredInterventionId(item.id)}
                onMouseLeave={() => setHoveredInterventionId((current) => (current === item.id ? null : current))}
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  borderBottom: "1px solid #eef2f7",
                  background: rowHovered ? "#eef6ff" : rowIndex % 2 ? "#fcfdff" : "#fff",
                }}
              >
                <div style={bodyCellStyle}>
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7",
                      color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00",
                    }}
                  >
                    {item.moment}
                  </span>
                </div>
                <div style={bodyCellStyle}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#13243b" }}>
                    {item.start === item.end ? formatShortDate(item.start) : `${formatShortDate(item.start)} → ${formatShortDate(item.end)}`}
                  </div>
                  {isReplanned(item) ? <div style={{ fontSize: 10, fontWeight: 800, color: "#b26b00", marginTop: 4 }}>Replanifie</div> : null}
                </div>
                <div style={bodyCellStyle}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: section.light, color: section.text, fontSize: 10, fontWeight: 800 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: section.color, display: "inline-block" }} />
                      {section.label}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "#13243b" }}>{item.rayon}</div>
                    {item.subtitle ? <div style={{ fontSize: 10.5, lineHeight: 1.45, color: "#617286" }}>{item.subtitle}</div> : null}
                  </div>
                </div>
                <div style={bodyCellStyle}>
                  <input value={item.responsibleAuchan} onChange={(event) => onUpdateIntervention(item.id, { responsibleAuchan: event.target.value })} placeholder="Auchan..." style={inputStyle} />
                </div>
                <div style={bodyCellStyle}>
                  <input value={item.responsibleSupplier} onChange={(event) => onUpdateIntervention(item.id, { responsibleSupplier: event.target.value })} placeholder="Fournisseur..." style={inputStyle} />
                </div>
                <div style={bodyCellStyle}>
                  <textarea
                    value={item.notes}
                    onChange={(event) => onUpdateIntervention(item.id, { notes: event.target.value })}
                    placeholder="Notes..."
                    style={textareaStyle}
                  />
                </div>

                {timelineDays.map((day, dayIndex) => {
                  const isStart = dayIndex === startOffset;
                  const isInside = dayIndex >= startOffset && dayIndex <= endOffset;
                  const dayHovered = hoveredDayIso === day.iso;
                  return (
                    <div
                      key={`${item.id}-${day.iso}`}
                      onMouseEnter={() => {
                        setHoveredInterventionId(item.id);
                        setHoveredDayIso(day.iso);
                      }}
                      onMouseLeave={() => {
                        setHoveredInterventionId((current) => (current === item.id ? null : current));
                        setHoveredDayIso((current) => (current === day.iso ? null : current));
                      }}
                      style={{
                        position: "relative",
                        minHeight: 78,
                        borderLeft: "1px solid #f1f5f9",
                        background:
                          rowHovered && dayHovered
                            ? "rgba(10,79,152,0.12)"
                            : rowHovered
                              ? "rgba(10,79,152,0.05)"
                              : dayHovered
                                ? "rgba(10,79,152,0.08)"
                                : day.weekend
                                  ? "rgba(15,23,42,0.015)"
                                  : undefined,
                      }}
                    >
                      {isStart ? (
                        <div
                          style={{
                            position: "absolute",
                            left: 2,
                            top: 12,
                            width: `calc(${span * dayWidth}px - 6px)`,
                            minWidth: 24,
                            minHeight: 50,
                            borderRadius: 16,
                            background: section.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                            boxShadow: "0 10px 20px rgba(15,23,42,0.14)",
                            zIndex: 1,
                            overflow: "hidden",
                          }}
                        />
                      ) : null}
                      {item.charged && isInside ? (
                        <div
                          style={{
                            position: "absolute",
                            inset: "6px 2px 6px",
                            borderRadius: 18,
                            border: "2px dashed rgba(215,25,32,0.25)",
                            pointerEvents: "none",
                          }}
                        />
                      ) : null}
                      {rowHovered ? (
                        <div
                          style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            width: 2,
                            background: "rgba(10,79,152,0.22)",
                            pointerEvents: "none",
                          }}
                        />
                      ) : null}
                      {dayHovered ? (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderLeft: "1px solid rgba(10,79,152,0.24)",
                            borderRight: "1px solid rgba(10,79,152,0.24)",
                            pointerEvents: "none",
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
    </Card>
  );
}

function NativeTableView({
  interventions,
  plans,
  onUpdateIntervention,
}: {
  interventions: Intervention[];
  plans: PlanState;
  onUpdateIntervention: (interventionId: string, patch: Partial<Intervention>) => void;
}) {
  const totalDone = interventions.filter((item) => item.status === "fait").length;
  const totalDoing = interventions.filter((item) => item.status === "cours").length;
  const totalTodo = interventions.filter((item) => item.status === "todo").length;
  const progress = interventions.length ? Math.round((totalDone / interventions.length) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        {[
          { label: "Total", value: interventions.length, color: "#13243b", background: "#f8fafc" },
          { label: "A faire", value: totalTodo, color: "#617286", background: "#f8fafc" },
          { label: "En cours", value: totalDoing, color: "#ea580c", background: "#fff3ee" },
          { label: "Faits", value: totalDone, color: "#1b8b4b", background: "#eaf7ef" },
        ].map((item) => (
          <Card key={item.label} static style={{ padding: 18, background: item.background }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: colors.muted }}>{item.label}</div>
          </Card>
        ))}
      </div>

      <Card static style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 8, background: "#ecf0f4" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1b8b4b, #4dd17a)" }} />
        </div>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Rayon", "Date", "Etat", "Pers. Auchan", "Pers. Fournisseur", "Notes"].map((cell) => (
                  <th key={cell} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#617286", borderBottom: "1px solid #dbe3eb" }}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interventions.map((item) => {
                const section = getPlanTheme(item.section, plans[item.section]);
                const statusPill = getStatusPill(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: section.light, color: section.text, fontSize: 10, fontWeight: 800 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: section.color, display: "inline-block" }} />
                          {section.label}
                        </span>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#13243b" }}>{item.rayon}</div>
                        {item.subtitle ? <div style={{ fontSize: 11, color: "#617286" }}>{item.subtitle}</div> : null}
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#13243b" }}>
                        {item.start === item.end ? formatShortDate(item.start) : `${formatShortDate(item.start)} → ${formatShortDate(item.end)}`}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7", color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00" }}>
                          {item.moment}
                        </span>
                        {isReplanned(item) ? <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "#fff7e7", color: "#8b5a00" }}>Replanifie</span> : null}
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <select value={item.status} onChange={(event) => onUpdateIntervention(item.id, { status: event.target.value as InterventionStatus })} style={{ ...inputStyle, background: statusPill.background, color: statusPill.color, fontWeight: 800 }}>
                        <option value="todo">A faire</option>
                        <option value="cours">En cours</option>
                        <option value="fait">Fait</option>
                      </select>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <input value={item.responsibleAuchan} onChange={(event) => onUpdateIntervention(item.id, { responsibleAuchan: event.target.value })} placeholder="Auchan..." style={inputStyle} />
                    </td>
                    <td style={{ padding: "14px" }}>
                      <input value={item.responsibleSupplier} onChange={(event) => onUpdateIntervention(item.id, { responsibleSupplier: event.target.value })} placeholder="Fournisseur..." style={inputStyle} />
                    </td>
                    <td style={{ padding: "14px" }}>
                      <textarea
                        value={item.notes}
                        onChange={(event) => onUpdateIntervention(item.id, { notes: event.target.value })}
                        placeholder="Notes..."
                        style={textareaStyle}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NativeCalendarView({
  interventions,
  plans,
  onUpdateIntervention,
}: {
  interventions: Intervention[];
  plans: PlanState;
  onUpdateIntervention: (interventionId: string, patch: Partial<Intervention>) => void;
}) {
  const grouped = interventions.reduce<Record<string, Intervention[]>>((accumulator, item) => {
    const key = item.start.slice(0, 7);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {Object.entries(grouped).map(([monthKey, items]) => (
        <div key={monthKey} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d71920" }}>{formatMonthKey(monthKey)}</span>
            <div style={{ height: 1, background: "#dbe3eb", flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#617286" }}>{items.length} interventions</span>
          </div>
          {items.map((item) => {
            const section = getPlanTheme(item.section, plans[item.section]);
            const statusPill = getStatusPill(item.status);
            return (
              <Card key={item.id} static style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "6px 1.2fr 1.3fr 220px", minHeight: 150 }}>
                  <div style={{ background: section.color }} />
                  <div style={{ padding: 18, display: "grid", alignContent: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#617286" }}>
                      {DAY_LABELS[parseISODate(item.start).getDay()]}{item.start !== item.end ? ` → ${DAY_LABELS[parseISODate(item.end).getDay()]}` : ""}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#13243b" }}>
                      {parseISODate(item.start).getDate()} {MONTH_SHORT_LABELS[parseISODate(item.start).getMonth()]}
                      {item.start !== item.end ? ` → ${parseISODate(item.end).getDate()} ${MONTH_SHORT_LABELS[parseISODate(item.end).getMonth()]}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: item.moment === "Nuit" ? "#f1eeff" : "#fff7e7", color: item.moment === "Nuit" ? "#6741e8" : "#8b6a00" }}>{item.moment}</span>
                      {item.charged ? <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "#ffe8ec", color: "#d71920" }}>Chargee</span> : null}
                      {isReplanned(item) ? <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "#fff7e7", color: "#8b5a00" }}>Replanifie</span> : null}
                    </div>
                  </div>
                  <div style={{ padding: 18, display: "grid", alignContent: "center", gap: 8 }}>
                    <span style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: section.light, color: section.text, fontSize: 10, fontWeight: 800 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: section.color, display: "inline-block" }} />
                      {section.label}
                    </span>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#13243b" }}>{item.rayon}</div>
                    {item.subtitle ? <div style={{ fontSize: 12, color: "#617286", lineHeight: 1.6 }}>{item.subtitle}</div> : null}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: statusPill.background, color: statusPill.color }}>{statusPill.label}</span>
                    </div>
                  </div>
                  <div style={{ padding: 18, background: "#f8fafc", borderLeft: "1px solid #dbe3eb", display: "grid", gap: 10 }}>
                    <div>
                      <div style={tinyLabelStyle}>Responsable Auchan</div>
                      <input value={item.responsibleAuchan} onChange={(event) => onUpdateIntervention(item.id, { responsibleAuchan: event.target.value })} placeholder="Non assigne" style={{ ...inputStyle, marginTop: 4 }} />
                    </div>
                    <div>
                      <div style={tinyLabelStyle}>Responsable fournisseur</div>
                      <input value={item.responsibleSupplier} onChange={(event) => onUpdateIntervention(item.id, { responsibleSupplier: event.target.value })} placeholder="Non assigne" style={{ ...inputStyle, marginTop: 4 }} />
                    </div>
                    <div>
                      <div style={tinyLabelStyle}>Notes</div>
                      <textarea
                        value={item.notes}
                        onChange={(event) => onUpdateIntervention(item.id, { notes: event.target.value })}
                        placeholder="Ajouter une note"
                        style={{ ...textareaStyle, marginTop: 4, minHeight: 88 }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function NativePlansView({
  plans,
  onAddColumn,
  onMoveColumn,
  onResetPlan,
  onAddSection,
  onUpdateColumn,
  onRemoveColumn,
  onAddCell,
  onUpdateCell,
  onRemoveCell,
}: {
  plans: PlanState;
  onAddColumn: (section: SectionKey, color: string) => void;
  onMoveColumn: (section: SectionKey, columnId: string, direction: "left" | "right") => void;
  onResetPlan: (section: SectionKey) => void;
  onAddSection: (title: string, subtitle: string, color: string, icon: string) => void;
  onUpdateColumn: (section: SectionKey, columnId: string, patch: Partial<PlanColumn>) => void;
  onRemoveColumn: (section: SectionKey, columnId: string) => void;
  onAddCell: (section: SectionKey, columnId: string) => void;
  onUpdateCell: (section: SectionKey, columnId: string, index: number, value: string) => void;
  onRemoveCell: (section: SectionKey, columnId: string, index: number) => void;
}) {
  const iconOptions = ["🧩", "🥤", "🍷", "🍬", "🧂", "🌍", "🌿", "🛒", "📦", "🥫"];
  const [newColumnColors, setNewColumnColors] = useState<Record<string, string>>({
    sucree: "#607080",
    salee: "#607080",
    pdm: "#607080",
    bio: "#607080",
  });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionSubtitle, setNewSectionSubtitle] = useState("");
  const [newSectionColor, setNewSectionColor] = useState("#0a4f98");
  const [newSectionIcon, setNewSectionIcon] = useState("🧩");
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const orderedPlanEntries = getOrderedPlanEntries(plans);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card static style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#13243b" }}>Univers rayons</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#617286" }}>
              {isEditUnlocked
                ? "Mode edition actif. Tu peux ajouter, deplacer, recolorer ou supprimer."
                : "Mode verrouille. Deverrouille d'abord pour modifier l'organisation."}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 220px 240px 72px 44px auto", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setIsEditUnlocked((current) => !current)}
              style={smallButton(isEditUnlocked ? "#b91c2e" : "#0a4f98", isEditUnlocked ? "#fff1f2" : "#edf5ff")}
            >
              {isEditUnlocked ? "Verrouiller" : "Deverrouiller"}
            </button>
            <input value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="Nom de l'univers" style={{ ...inputStyle, opacity: isEditUnlocked ? 1 : 0.6 }} disabled={!isEditUnlocked} />
            <input value={newSectionSubtitle} onChange={(event) => setNewSectionSubtitle(event.target.value)} placeholder="Sous-titre / contenu" style={{ ...inputStyle, opacity: isEditUnlocked ? 1 : 0.6 }} disabled={!isEditUnlocked} />
            <select value={newSectionIcon} onChange={(event) => setNewSectionIcon(event.target.value)} style={{ ...inputStyle, opacity: isEditUnlocked ? 1 : 0.6, padding: "0 10px" }} disabled={!isEditUnlocked}>
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <input type="color" value={newSectionColor} onChange={(event) => setNewSectionColor(event.target.value)} style={{ width: 44, height: 40, border: "1px solid #dbe3eb", borderRadius: 10, background: "#fff", cursor: isEditUnlocked ? "pointer" : "not-allowed", opacity: isEditUnlocked ? 1 : 0.6 }} disabled={!isEditUnlocked} />
            <button
              type="button"
              onClick={() => {
                const title = newSectionTitle.trim();
                if (!title) return;
                onAddSection(title, newSectionSubtitle.trim(), newSectionColor, newSectionIcon);
                setNewSectionTitle("");
                setNewSectionSubtitle("");
                setNewSectionColor("#0a4f98");
                setNewSectionIcon("🧩");
              }}
              style={{ ...smallButton("#0a4f98", "#edf5ff"), opacity: isEditUnlocked ? 1 : 0.45 }}
              disabled={!isEditUnlocked}
            >
              + Ajouter un univers
            </button>
          </div>
        </div>
      </Card>

      {orderedPlanEntries.map(([sectionKey, plan]) => {
        const section = sectionKey as SectionKey;
        const theme = getPlanTheme(section, plan);
        return (
          <Card key={section} static style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: theme.light, display: "grid", placeItems: "center", fontSize: 22 }}>
                  {theme.icon}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#13243b" }}>{plan.title}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#617286" }}>{plan.subtitle}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="color"
                  value={newColumnColors[section] ?? "#607080"}
                  onChange={(event) => setNewColumnColors((current) => ({ ...current, [section]: event.target.value }))}
                  style={{ width: 40, height: 36, border: "1px solid #dbe3eb", borderRadius: 10, background: "#fff", cursor: isEditUnlocked ? "pointer" : "not-allowed", opacity: isEditUnlocked ? 1 : 0.6 }}
                  title="Couleur de la nouvelle colonne"
                  disabled={!isEditUnlocked}
                />
                <button type="button" onClick={() => onAddColumn(section, newColumnColors[section] ?? "#607080")} style={{ ...smallButton("#0a4f98", "#edf5ff"), opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                  + Colonne
                </button>
                <button type="button" onClick={() => onResetPlan(section)} style={{ ...smallButton("#617286", "#fff"), opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                  Reinitialiser
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16, alignItems: "start" }}>
              {plan.columns.map((column) => (
                <div key={column.id} style={{ border: "1px solid #dbe3eb", borderRadius: 18, overflow: "visible", background: "#fbfcfd" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: column.color, padding: "12px 10px 10px", overflow: "visible", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
                    <button type="button" onClick={() => onMoveColumn(section, column.id, "left")} style={{ ...smallButton("#fff", "rgba(0,0,0,0.16)"), border: "none", minWidth: 32, opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                      ←
                    </button>
                    <input
                      value={column.name}
                      onChange={(event) => onUpdateColumn(section, column.id, { name: event.target.value })}
                      style={{
                        flex: 1,
                        minHeight: 34,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(255,255,255,0.12)",
                        padding: "0 10px",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        opacity: isEditUnlocked ? 1 : 0.9,
                      }}
                      disabled={!isEditUnlocked}
                    />
                    <input
                      type="color"
                      value={column.color}
                      onChange={(event) => onUpdateColumn(section, column.id, { color: event.target.value })}
                      style={{ width: 36, height: 34, border: "1px solid rgba(255,255,255,0.24)", borderRadius: 10, background: "rgba(255,255,255,0.12)", cursor: isEditUnlocked ? "pointer" : "not-allowed", opacity: isEditUnlocked ? 1 : 0.6 }}
                      title="Modifier la couleur du rayon"
                      disabled={!isEditUnlocked}
                    />
                    <button type="button" onClick={() => onMoveColumn(section, column.id, "right")} style={{ ...smallButton("#fff", "rgba(0,0,0,0.16)"), border: "none", minWidth: 32, opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditUnlocked) return;
                        if (!window.confirm(`Supprimer le rayon "${column.name}" ?`)) return;
                        onRemoveColumn(section, column.id);
                      }}
                      style={{ ...smallButton("#fff", "rgba(0,0,0,0.16)"), border: "none", opacity: isEditUnlocked ? 1 : 0.45 }}
                      disabled={!isEditUnlocked}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 8, padding: 12 }}>
                    {column.cells.map((cell, index) => (
                      <div key={`${column.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                        <input value={cell} onChange={(event) => onUpdateCell(section, column.id, index, event.target.value)} style={{ ...inputStyle, opacity: isEditUnlocked ? 1 : 0.75 }} disabled={!isEditUnlocked} />
                        <button type="button" onClick={() => onRemoveCell(section, column.id, index)} style={{ ...smallButton("#b91c2e", "#fff1f2"), opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                          ×
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onAddCell(section, column.id)} style={{ ...smallButton(theme.text, theme.light), opacity: isEditUnlocked ? 1 : 0.45 }} disabled={!isEditUnlocked}>
                      + Ajouter un element
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function NativeMassPlanView({
  plans,
  massPlan,
  onChangeMassPlan,
}: {
  plans: PlanState;
  massPlan: MassPlanState;
  onChangeMassPlan: Dispatch<SetStateAction<MassPlanState>>;
}) {
  const [selectedMassItem, setSelectedMassItem] = useState<
    | { label: string; color: string; rotation?: number; kind: "cell" }
    | { label: string; color: string; rotation?: number; kind: "alley"; orientation: "horizontal" | "vertical" }
    | { kind: "view"; viewId: string }
    | null
  >(null);
  const [selectedTarget, setSelectedTarget] = useState<
    | { kind: "cell"; key: string }
    | { kind: "alley"; key: string }
    | { kind: "view"; key: string }
    | null
  >(null);
  const [hoveredTarget, setHoveredTarget] = useState<
    | { kind: "cell"; key: string }
    | { kind: "alley"; key: string }
    | { kind: "view"; key: string }
    | null
  >(null);
  const [selectedAlleyCells, setSelectedAlleyCells] = useState<string[]>([]);
  const [draggingLinkedViewKey, setDraggingLinkedViewKey] = useState<string | null>(null);
  const [armedLinkedViewKey, setArmedLinkedViewKey] = useState<string | null>(null);
  const [expandedMassSections, setExpandedMassSections] = useState<Record<SectionKey, boolean>>({
    sucree: true,
    salee: false,
    pdm: false,
    bio: false,
  });
  const [alleyDraft, setAlleyDraft] = useState("Allée");
  const [newMassViewTitle, setNewMassViewTitle] = useState("");
  const [newMassViewIcon, setNewMassViewIcon] = useState("🏬");
  const orderedPlanEntries = getOrderedPlanEntries(plans);

  const activeMassView = massPlan.views[massPlan.activeViewId] ?? Object.values(massPlan.views)[0] ?? createMassPlanViewState(DEFAULT_MASS_VIEW_ID, "Plan global", "🏬");
  const massViewTabs = Object.values(massPlan.views);

  const sectionPaletteGroups = orderedPlanEntries.map(([sectionKey, plan]) => ({
    sectionKey,
    title: plan.title,
    subtitle: plan.subtitle,
    theme: getPlanTheme(sectionKey, plan),
    groups: plan.columns.map((column) => ({
      rayon: column.name,
      color: column.color,
      items: column.cells,
    })),
  }));

  const paletteGroups = sectionPaletteGroups.flatMap((section) => section.groups);

  const placedKeys = new Set(Object.values(activeMassView.cells).map((cell) => `${cell.label}__${cell.color}`));
  const selectedCell = selectedTarget?.kind === "cell" ? activeMassView.cells[selectedTarget.key] ?? null : null;
  const selectedAlley = selectedTarget?.kind === "alley" ? activeMassView.alleys[selectedTarget.key] ?? null : null;
  const selectedLinkedView = selectedTarget?.kind === "view" ? activeMassView.linkedViews[selectedTarget.key] ?? null : null;
  const gridGap = 2;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const canvasWidth = activeMassView.cols * activeMassView.cellWidth + Math.max(0, activeMassView.cols - 1) * gridGap;
  const canvasHeight = activeMassView.rows * activeMassView.cellHeight + Math.max(0, activeMassView.rows - 1) * gridGap;

  useEffect(() => {
    setSelectedMassItem(null);
    setSelectedTarget(null);
    setHoveredTarget(null);
    setSelectedAlleyCells([]);
    setDraggingLinkedViewKey(null);
    setArmedLinkedViewKey(null);
  }, [massPlan.activeViewId]);

  function updateActiveMassView(updater: (view: MassPlanViewState) => MassPlanViewState) {
    onChangeMassPlan((current) => {
      const activeViewId = current.views[current.activeViewId] ? current.activeViewId : Object.keys(current.views)[0] ?? DEFAULT_MASS_VIEW_ID;
      const currentView = current.views[activeViewId] ?? createMassPlanViewState(DEFAULT_MASS_VIEW_ID, "Plan global", "🏬");
      return {
        ...current,
        activeViewId,
        views: {
          ...current.views,
          [activeViewId]: updater(currentView),
        },
      };
    });
  }

  function addMassView() {
    const cleanTitle = newMassViewTitle.trim();
    if (!cleanTitle) return;
    const viewIdBase = slugifySectionKey(cleanTitle);
    const viewId = massPlan.views[viewIdBase] ? `${viewIdBase}-${Date.now()}` : viewIdBase;
    const nextView = createMassPlanViewState(viewId, cleanTitle, newMassViewIcon, {
      rows: activeMassView.rows,
      cols: activeMassView.cols,
      cellWidth: activeMassView.cellWidth,
      cellHeight: activeMassView.cellHeight,
    });
    onChangeMassPlan((current) => ({
      activeViewId: viewId,
      views: {
        ...current.views,
        [viewId]: nextView,
      },
    }));
    setNewMassViewTitle("");
    setNewMassViewIcon("🏬");
  }

  function switchMassView(viewId: string) {
    onChangeMassPlan((current) => ({
      ...current,
      activeViewId: viewId,
    }));
  }

  function createAlleyKey() {
    return `alley-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function createLinkedViewKey() {
    return `linked-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getTrackPosition(index: number, size: number) {
    return index * (size + gridGap);
  }

  function getAlleyBox(alley: { orientation: "horizontal" | "vertical"; startRow: number; endRow: number; startCol: number; endCol: number }) {
    const left = getTrackPosition(alley.startCol, activeMassView.cellWidth);
    const top = getTrackPosition(alley.startRow, activeMassView.cellHeight);
    const width = (alley.endCol - alley.startCol + 1) * activeMassView.cellWidth + Math.max(0, alley.endCol - alley.startCol) * gridGap;
    const height = (alley.endRow - alley.startRow + 1) * activeMassView.cellHeight + Math.max(0, alley.endRow - alley.startRow) * gridGap;
    if (alley.orientation === "vertical") {
      return { left, top, width, height };
    }
    return {
      left,
      top,
      width,
      height,
    };
  }

  function getLinkedViewSize(viewId: string) {
    const linkedView = massPlan.views[viewId];
    if (!linkedView) return { rows: 1, cols: 1 };
    const occupiedRows: number[] = [];
    const occupiedCols: number[] = [];

    Object.keys(linkedView.cells).forEach((key) => {
      const [row, col] = key.split("-").map(Number);
      occupiedRows.push(row);
      occupiedCols.push(col);
    });

    Object.values(linkedView.alleys).forEach((alley) => {
      occupiedRows.push(alley.startRow, alley.endRow);
      occupiedCols.push(alley.startCol, alley.endCol);
    });

    if (!occupiedRows.length || !occupiedCols.length) {
      return {
        rows: Math.max(1, linkedView.rows),
        cols: Math.max(1, linkedView.cols),
        minRow: 0,
        minCol: 0,
      };
    }

    const minRow = Math.min(...occupiedRows);
    const maxRow = Math.max(...occupiedRows);
    const minCol = Math.min(...occupiedCols);
    const maxCol = Math.max(...occupiedCols);

    return {
      rows: Math.max(1, maxRow - minRow + 1),
      cols: Math.max(1, maxCol - minCol + 1),
      minRow,
      minCol,
    };
  }

  function getLinkedViewBox(linkedView: MassPlanLinkedView) {
    const sourceView = massPlan.views[linkedView.viewId];
    const size = getLinkedViewSize(linkedView.viewId);
    return {
      left: getTrackPosition(linkedView.startCol, activeMassView.cellWidth),
      top: getTrackPosition(linkedView.startRow, activeMassView.cellHeight),
      width: size.cols * activeMassView.cellWidth + Math.max(0, size.cols - 1) * gridGap,
      height: size.rows * activeMassView.cellHeight + Math.max(0, size.rows - 1) * gridGap,
      sourceView,
      sourceOffsetRow: size.minRow,
      sourceOffsetCol: size.minCol,
      sourceRows: size.rows,
      sourceCols: size.cols,
    };
  }

  function moveLinkedViewToPointer(placementKey: string, clientX: number, clientY: number) {
    if (activeMassView.id !== DEFAULT_MASS_VIEW_ID) return;
    const canvas = canvasRef.current;
    const linkedView = activeMassView.linkedViews[placementKey];
    if (!canvas || !linkedView) return;
    const rect = canvas.getBoundingClientRect();
    const size = getLinkedViewSize(linkedView.viewId);
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    const col = Math.round(relativeX / (activeMassView.cellWidth + gridGap));
    const row = Math.round(relativeY / (activeMassView.cellHeight + gridGap));
    const boundedCol = Math.max(0, Math.min(col, Math.max(0, activeMassView.cols - size.cols)));
    const boundedRow = Math.max(0, Math.min(row, Math.max(0, activeMassView.rows - size.rows)));

    updateActiveMassView((current) => ({
      ...current,
      linkedViews: {
        ...current.linkedViews,
        [placementKey]: {
          ...linkedView,
          startRow: boundedRow,
          startCol: boundedCol,
        },
      },
    }));
  }

  function startLinkedViewDrag(placementKey: string, clientX: number, clientY: number) {
    setSelectedTarget({ kind: "view", key: placementKey });
    setDraggingLinkedViewKey(placementKey);
    moveLinkedViewToPointer(placementKey, clientX, clientY);

    const handleMove = (event: MouseEvent) => {
      moveLinkedViewToPointer(placementKey, event.clientX, event.clientY);
    };
    const handleUp = () => {
      setDraggingLinkedViewKey((current) => (current === placementKey ? null : current));
      setArmedLinkedViewKey((current) => (current === placementKey ? null : current));
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  function isCellInsideAlley(row: number, col: number) {
    return Object.values(activeMassView.alleys).some(
      (alley) =>
        row >= alley.startRow &&
        row <= alley.endRow &&
        col >= alley.startCol &&
        col <= alley.endCol,
    );
  }

  function isRayonHeaderCell(cell: { label: string; color: string }) {
    return paletteGroups.some((group) => group.rayon === cell.label && group.color === cell.color);
  }

  function toggleMassSection(section: SectionKey) {
    setExpandedMassSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function getCellLabelStyle(label: string, isHeader: boolean, rotation = 0): CSSProperties {
    const normalizedLength = label.trim().length;
    const isVertical = rotation % 180 !== 0;
    const availableWidth = isVertical ? activeMassView.cellHeight : activeMassView.cellWidth;
    let fontSize = isHeader ? (isVertical ? 13 : 12) : isVertical ? 12 : 11;

    if (normalizedLength > (isVertical ? 14 : 12) || availableWidth < (isVertical ? 84 : 92)) {
      fontSize -= 1;
    }
    if (normalizedLength > (isVertical ? 20 : 18) || availableWidth < (isVertical ? 72 : 78)) {
      fontSize -= 1;
    }
    if (normalizedLength > (isVertical ? 26 : 24) || availableWidth < (isVertical ? 62 : 68)) {
      fontSize -= 1;
    }

    return {
      fontSize: Math.max(isHeader ? (isVertical ? 10 : 8) : isVertical ? 9 : 7, fontSize),
      fontWeight: isHeader ? 900 : 800,
      lineHeight: 1.15,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center",
      whiteSpace: "normal",
      textTransform: isHeader ? "uppercase" : "none",
      letterSpacing: isHeader ? "0.03em" : "normal",
      wordBreak: "break-word",
      textWrap: "balance",
      maxWidth: "100%",
    };
  }

  function getSelectionBounds(keys: string[]) {
    const coordinates = keys.map((key) => {
      const [row, col] = key.split("-").map(Number);
      return { row, col };
    });
    const rows = coordinates.map((item) => item.row);
    const cols = coordinates.map((item) => item.col);
    return {
      minRow: Math.min(...rows),
      maxRow: Math.max(...rows),
      minCol: Math.min(...cols),
      maxCol: Math.max(...cols),
      coordinates,
    };
  }

  function canBuildAlley(orientation: "horizontal" | "vertical") {
    if (!selectedAlleyCells.length) return false;
    const bounds = getSelectionBounds(selectedAlleyCells);
    if (orientation === "vertical") {
      return bounds.minCol === bounds.maxCol && bounds.coordinates.length === bounds.maxRow - bounds.minRow + 1;
    }
    return bounds.minRow === bounds.maxRow && bounds.coordinates.length === bounds.maxCol - bounds.minCol + 1;
  }

  function buildAlleyFromSelection(orientation: "horizontal" | "vertical") {
    if (!canBuildAlley(orientation)) return;
    const bounds = getSelectionBounds(selectedAlleyCells);
    const alleyKey = createAlleyKey();
    updateActiveMassView((current) => {
      const nextCells = { ...current.cells };
      selectedAlleyCells.forEach((key) => {
        delete nextCells[key];
      });
      return {
        ...current,
        cells: nextCells,
        alleys: {
          ...current.alleys,
          [alleyKey]: {
            label: alleyDraft || "Allée",
            color: "#475569",
            rotation: orientation === "vertical" ? 90 : 0,
            orientation,
            startRow: bounds.minRow,
            endRow: bounds.maxRow,
            startCol: bounds.minCol,
            endCol: bounds.maxCol,
          },
        },
      };
    });
    setSelectedMassItem({ label: alleyDraft || "Allée", color: "#475569", rotation: orientation === "vertical" ? 90 : 0, kind: "alley", orientation });
    setSelectedTarget({ kind: "alley", key: alleyKey });
    setSelectedAlleyCells([]);
  }

  function placeMassItem(cellKey: string) {
    const [row, col] = cellKey.split("-").map(Number);

    if (selectedMassItem?.kind === "alley") {
      if (isCellInsideAlley(row, col)) return;
      setSelectedAlleyCells((current) =>
        current.includes(cellKey) ? current.filter((key) => key !== cellKey) : [...current, cellKey],
      );
      setSelectedTarget(null);
      return;
    }

    if (selectedMassItem?.kind === "view" && activeMassView.id === DEFAULT_MASS_VIEW_ID) {
      const sourceView = massPlan.views[selectedMassItem.viewId];
      if (!sourceView) return;
      const size = getLinkedViewSize(selectedMassItem.viewId);
      const placementKey = createLinkedViewKey();
      const boundedRow = Math.min(row, Math.max(0, activeMassView.rows - size.rows));
      const boundedCol = Math.min(col, Math.max(0, activeMassView.cols - size.cols));
      updateActiveMassView((current) => ({
        ...current,
        linkedViews: {
          ...current.linkedViews,
          [placementKey]: {
            viewId: selectedMassItem.viewId,
            startRow: boundedRow,
            startCol: boundedCol,
        },
      },
    }));
    setSelectedMassItem(null);
    setArmedLinkedViewKey(null);
    setSelectedTarget({ kind: "view", key: placementKey });
    return;
  }

    if (!selectedMassItem) {
      if (selectedTarget?.kind === "view" && activeMassView.id === DEFAULT_MASS_VIEW_ID) {
        const linkedView = activeMassView.linkedViews[selectedTarget.key];
        if (!linkedView) return;
        const sourceView = massPlan.views[linkedView.viewId];
        if (!sourceView) return;
        const size = getLinkedViewSize(linkedView.viewId);
        const boundedRow = Math.min(row, Math.max(0, activeMassView.rows - size.rows));
        const boundedCol = Math.min(col, Math.max(0, activeMassView.cols - size.cols));
        updateActiveMassView((current) => ({
          ...current,
          linkedViews: {
            ...current.linkedViews,
            [selectedTarget.key]: {
              ...linkedView,
              startRow: boundedRow,
              startCol: boundedCol,
            },
          },
        }));
        return;
      }
      if (activeMassView.cells[cellKey]) {
        setSelectedTarget({ kind: "cell", key: cellKey });
      } else {
        setSelectedTarget(null);
      }
      return;
    }
    if (selectedMassItem.kind !== "cell") return;
    updateActiveMassView((current) => ({
      ...current,
      cells: {
        ...current.cells,
        [cellKey]: {
          label: selectedMassItem.label,
          color: selectedMassItem.color,
          rotation: selectedMassItem.rotation ?? 0,
        },
      },
    }));
    setSelectedTarget({ kind: "cell", key: cellKey });
  }

  function clearSelectedTarget() {
    if (selectedAlleyCells.length) {
      setSelectedAlleyCells([]);
      return;
    }
    if (!selectedTarget) return;
    updateActiveMassView((current) => {
      if (selectedTarget.kind === "view") {
        const nextLinkedViews = { ...current.linkedViews };
        delete nextLinkedViews[selectedTarget.key];
        return { ...current, linkedViews: nextLinkedViews };
      }
      if (selectedTarget.kind === "cell") {
        const nextCells = { ...current.cells };
        delete nextCells[selectedTarget.key];
        return { ...current, cells: nextCells };
      }
      const nextAlleys = { ...current.alleys };
      delete nextAlleys[selectedTarget.key];
      return { ...current, alleys: nextAlleys };
    });
    setSelectedTarget(null);
  }

  function duplicateTarget(target: { kind: "cell"; key: string } | { kind: "alley"; key: string }) {
    if (target.kind === "cell") {
      const targetCell = activeMassView.cells[target.key];
      if (!targetCell) return;
      setSelectedMassItem({
        label: targetCell.label,
        color: targetCell.color,
        rotation: targetCell.rotation,
        kind: "cell",
      });
      setSelectedTarget(target);
      return;
    }
    const targetAlley = activeMassView.alleys[target.key];
    if (!targetAlley) return;
    setSelectedMassItem({
      label: targetAlley.label,
      color: targetAlley.color,
      rotation: targetAlley.rotation,
      kind: "alley",
      orientation: targetAlley.orientation,
    });
    setSelectedTarget(target);
  }

  function duplicateLinkedViewTarget(target: { kind: "view"; key: string }) {
    const linkedView = activeMassView.linkedViews[target.key];
    if (!linkedView) return;
    setSelectedMassItem({ kind: "view", viewId: linkedView.viewId });
    setSelectedTarget(target);
  }

  function rotateTarget(target: { kind: "cell"; key: string } | { kind: "alley"; key: string }) {
    if (target.kind === "cell") {
      const targetCell = activeMassView.cells[target.key];
      if (!targetCell) return;
      updateActiveMassView((current) => ({
        ...current,
        cells: {
          ...current.cells,
          [target.key]: {
            ...targetCell,
            rotation: ((targetCell.rotation ?? 0) + 90) % 180,
          },
        },
      }));
      setSelectedTarget(target);
      return;
    }
    const targetAlley = activeMassView.alleys[target.key];
    if (!targetAlley) return;
    updateActiveMassView((current) => ({
      ...current,
      alleys: {
        ...current.alleys,
        [target.key]: {
          ...targetAlley,
          rotation: ((targetAlley.rotation ?? 0) + 90) % 180,
        },
      },
    }));
    setSelectedTarget(target);
  }

  function removeTarget(target: { kind: "cell"; key: string } | { kind: "alley"; key: string }) {
    updateActiveMassView((current) => {
      if (target.kind === "cell") {
        const nextCells = { ...current.cells };
        delete nextCells[target.key];
        return { ...current, cells: nextCells };
      }
      const nextAlleys = { ...current.alleys };
      delete nextAlleys[target.key];
      return { ...current, alleys: nextAlleys };
    });
    if (selectedTarget?.kind === target.kind && selectedTarget.key === target.key) {
      setSelectedTarget(null);
    }
    if (hoveredTarget?.kind === target.kind && hoveredTarget.key === target.key) {
      setHoveredTarget(null);
    }
  }

  function duplicateSelectedTarget() {
    if (selectedCell) {
      duplicateTarget({ kind: "cell", key: selectedTarget!.key });
      return;
    }
    if (selectedAlley) {
      duplicateTarget({ kind: "alley", key: selectedTarget!.key });
      return;
    }
    if (selectedTarget?.kind === "view" && selectedLinkedView) {
      duplicateLinkedViewTarget(selectedTarget);
    }
  }

  function rotateSelectedTarget() {
    if (selectedTarget?.kind === "cell" && selectedCell) {
      rotateTarget(selectedTarget);
      return;
    }
    if (selectedTarget?.kind === "alley" && selectedAlley) {
      rotateTarget(selectedTarget);
    }
  }

  function removeLinkedViewTarget(target: { kind: "view"; key: string }) {
    updateActiveMassView((current) => {
      const nextLinkedViews = { ...current.linkedViews };
      delete nextLinkedViews[target.key];
      return { ...current, linkedViews: nextLinkedViews };
    });
    if (armedLinkedViewKey === target.key) {
      setArmedLinkedViewKey(null);
    }
    if (selectedTarget?.kind === "view" && selectedTarget.key === target.key) {
      setSelectedTarget(null);
    }
    if (hoveredTarget?.kind === "view" && hoveredTarget.key === target.key) {
      setHoveredTarget(null);
    }
  }

  function updateGrid<K extends "rows" | "cols" | "cellWidth" | "cellHeight">(key: K, value: number) {
    updateActiveMassView((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Card static style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#13243b" }}>
            {activeMassView.icon} {activeMassView.title}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#617286" }}>
            Regle la grille puis place les rayons, les produits et les allees. En mode allee, selectionne plusieurs cases contigues puis fusionne-les en une seule allee.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={duplicateSelectedTarget} disabled={!selectedCell && !selectedAlley && !selectedLinkedView} style={{ ...smallButton("#0a4f98", "#edf5ff"), opacity: selectedCell || selectedAlley || selectedLinkedView ? 1 : 0.45 }}>
            Dupliquer
          </button>
          <button type="button" onClick={rotateSelectedTarget} disabled={!selectedCell && !selectedAlley} style={{ ...smallButton("#13243b", "#fff"), opacity: selectedCell || selectedAlley ? 1 : 0.45 }}>
            Rotation
          </button>
          <button type="button" onClick={clearSelectedTarget} disabled={!selectedCell && !selectedAlley && !selectedLinkedView && !selectedAlleyCells.length} style={{ ...smallButton("#b91c2e", "#fff1f2"), opacity: selectedCell || selectedAlley || selectedLinkedView || selectedAlleyCells.length ? 1 : 0.45 }}>
            Supprimer
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedMassItem(null);
              setSelectedAlleyCells([]);
              setSelectedTarget(null);
            }}
            style={smallButton("#617286", "#fff")}
          >
            Deselectionner
          </button>
          <button type="button" onClick={() => updateActiveMassView((current) => ({ ...current, cells: {}, alleys: {} }))} style={smallButton("#b91c2e", "#fff1f2")}>
            Vider le plan
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {massViewTabs.map((view) => {
            const active = view.id === massPlan.activeViewId;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => switchMassView(view.id)}
                style={{
                  minHeight: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "#bfdbfe" : "#dbe3eb"}`,
                  background: active ? "#edf5ff" : "#ffffff",
                  color: active ? "#0a4f98" : "#475569",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {view.icon} {view.title}
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fbfcfd", display: "grid", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#617286" }}>
            Nouvelle grille
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px auto", gap: 10 }}>
            <input
              value={newMassViewTitle}
              onChange={(event) => setNewMassViewTitle(event.target.value)}
              style={inputStyle}
              placeholder="Ex: Epicerie sucrée"
            />
            <select value={newMassViewIcon} onChange={(event) => setNewMassViewIcon(event.target.value)} style={inputStyle}>
              {MASS_PLAN_ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <button type="button" onClick={addMassView} style={smallButton("#0a4f98", "#edf5ff")}>
              + Grille
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fbfcfd", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#617286" }}>
              Reglages de grille
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={tinyLabelStyle}>Colonnes</span>
                <input type="number" min={4} max={50} value={activeMassView.cols} onChange={(event) => updateGrid("cols", Math.min(50, Math.max(4, Number(event.target.value) || 4)))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={tinyLabelStyle}>Lignes</span>
                <input type="number" min={4} max={24} value={activeMassView.rows} onChange={(event) => updateGrid("rows", Math.min(24, Math.max(4, Number(event.target.value) || 4)))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={tinyLabelStyle}>Largeur colonne</span>
                <input type="number" min={30} max={180} value={activeMassView.cellWidth} onChange={(event) => updateGrid("cellWidth", Math.max(30, Number(event.target.value) || 30))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={tinyLabelStyle}>Hauteur ligne</span>
                <input type="number" min={30} max={180} value={activeMassView.cellHeight} onChange={(event) => updateGrid("cellHeight", Math.max(30, Number(event.target.value) || 30))} style={inputStyle} />
              </label>
            </div>
          </div>

          {activeMassView.id === DEFAULT_MASS_VIEW_ID && massViewTabs.filter((view) => view.id !== DEFAULT_MASS_VIEW_ID).length ? (
            <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fbfcfd", display: "grid", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#617286" }}>
                Plans détaillés
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {massViewTabs.filter((view) => view.id !== DEFAULT_MASS_VIEW_ID).map((view) => {
                  const selected = selectedMassItem?.kind === "view" && selectedMassItem.viewId === view.id;
                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setSelectedMassItem({ kind: "view", viewId: view.id })}
                      style={{
                        minHeight: 40,
                        borderRadius: 12,
                        border: `1px solid ${selected ? "#93c5fd" : "#dbe3eb"}`,
                        background: selected ? "#edf5ff" : "#ffffff",
                        color: selected ? "#0a4f98" : "#13243b",
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: "left",
                        padding: "0 12px",
                        cursor: "pointer",
                      }}
                    >
                      {view.icon} {view.title}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "#617286" }}>
                Sélectionne un plan détaillé puis clique dans la grille globale pour le positionner. Ensuite, reclique ailleurs pour le déplacer.
              </div>
            </div>
          ) : null}

          <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fbfcfd", display: "grid", gap: 10, alignContent: "start", maxHeight: 680, overflow: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#617286" }}>
              Palette rayon
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {sectionPaletteGroups.map((section) => {
                const expanded = expandedMassSections[section.sectionKey];
                return (
                  <div
                    key={section.sectionKey}
                    style={{
                      border: `1px solid ${section.theme.color}25`,
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#ffffff",
                      boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleMassSection(section.sectionKey)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom: expanded ? `1px solid ${section.theme.color}20` : "none",
                        background: `linear-gradient(135deg, ${section.theme.light}, #ffffff 70%)`,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            background: section.theme.color,
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 16,
                            boxShadow: `0 10px 18px ${section.theme.color}30`,
                          }}
                        >
                          {section.theme.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#13243b" }}>{section.theme.label}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: "#617286" }}>{section.groups.length} rayons</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: section.theme.color }}>{expanded ? "−" : "+"}</div>
                    </button>

                    {expanded ? (
                      <div style={{ display: "grid", gap: 10, padding: 12 }}>
                        {section.groups.map((group, index) => {
                          const rayonPlaced = placedKeys.has(`${group.rayon}__${group.color}`);
                          const rayonActive = selectedMassItem?.kind === "cell" && selectedMassItem.label === group.rayon && selectedMassItem.color === group.color;
                          return (
                            <div
                              key={`${section.sectionKey}-${group.rayon}-${index}`}
                              style={{
                                border: `1px solid ${group.color}28`,
                                borderRadius: 14,
                                padding: 10,
                                background: `linear-gradient(180deg, ${group.color}10, #ffffff 65%)`,
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (rayonPlaced) return;
                                  setSelectedMassItem({ label: group.rayon, color: group.color, rotation: 0, kind: "cell" });
                                }}
                                style={{
                                  borderRadius: 12,
                                  border: `1px solid ${rayonActive ? group.color : rayonPlaced ? "#cbd5e1" : `${group.color}55`}`,
                                  background: rayonActive ? group.color : rayonPlaced ? "#f1f5f9" : group.color,
                                  color: rayonPlaced ? "#94a3b8" : "#ffffff",
                                  minHeight: 38,
                                  padding: "0 12px",
                                  fontSize: 12,
                                  fontWeight: 900,
                                  cursor: rayonPlaced ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  justifyContent: "flex-start",
                                  boxShadow: rayonPlaced ? "none" : `0 10px 18px ${group.color}22`,
                                }}
                              >
                                {group.rayon}
                              </button>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {group.items.map((item, itemIndex) => {
                                  const active = selectedMassItem?.kind === "cell" && selectedMassItem.label === item && selectedMassItem.color === group.color;
                                  const placed = placedKeys.has(`${item}__${group.color}`);
                                  return (
                                    <button
                                      key={`${group.rayon}-${item}-${itemIndex}`}
                                      type="button"
                                      onClick={() => {
                                        if (placed) return;
                                        setSelectedMassItem({ label: item, color: group.color, rotation: 0, kind: "cell" });
                                      }}
                                      style={{
                                        borderRadius: 999,
                                        border: `1px solid ${active ? group.color : placed ? "#cbd5e1" : `${group.color}30`}`,
                                        background: active ? `${group.color}22` : placed ? "#f1f5f9" : "#fff",
                                        color: placed ? "#94a3b8" : "#13243b",
                                        minHeight: 32,
                                        padding: "0 10px",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: placed ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        opacity: placed ? 0.55 : 1,
                                      }}
                                    >
                                      <span style={{ width: 8, height: 8, borderRadius: 999, background: group.color, display: "inline-block", boxShadow: `0 0 0 3px ${group.color}18` }} />
                                      {item}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fbfcfd", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#617286" }}>
              Palette allees
            </div>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={tinyLabelStyle}>Libelle allee</span>
              <input value={alleyDraft} onChange={(event) => setAlleyDraft(event.target.value)} style={inputStyle} placeholder="Ex: Allee centrale" />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedMassItem({ label: alleyDraft || "Allée", color: "#475569", rotation: 0, kind: "alley", orientation: "horizontal" })}
                style={smallButton("#475569", selectedMassItem?.kind === "alley" && selectedMassItem.orientation === "horizontal" ? "#e2e8f0" : "#fff")}
              >
                Allee horizontale
              </button>
              <button
                type="button"
                onClick={() => setSelectedMassItem({ label: alleyDraft || "Allée", color: "#475569", rotation: 90, kind: "alley", orientation: "vertical" })}
                style={smallButton("#475569", selectedMassItem?.kind === "alley" && selectedMassItem.orientation === "vertical" ? "#e2e8f0" : "#fff")}
              >
                Allee verticale
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                onClick={() => buildAlleyFromSelection("vertical")}
                disabled={!canBuildAlley("vertical")}
                style={{ ...smallButton("#475569", "#fff"), opacity: canBuildAlley("vertical") ? 1 : 0.45 }}
              >
                Fusionner en allee verticale
              </button>
              <button
                type="button"
                onClick={() => buildAlleyFromSelection("horizontal")}
                disabled={!canBuildAlley("horizontal")}
                style={{ ...smallButton("#475569", "#fff"), opacity: canBuildAlley("horizontal") ? 1 : 0.45 }}
              >
                Fusionner en allee horizontale
              </button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#617286" }}>
              Selectionne un type d'allee, clique sur plusieurs cases d'une meme colonne ou d'une meme ligne, puis fusionne la selection en une allee unique.
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #dbe3eb", borderRadius: 18, padding: 14, background: "#fff", overflow: "auto" }}>
          <div
            ref={canvasRef}
            style={{
              position: "relative",
              width: canvasWidth,
              minWidth: canvasWidth,
              minHeight: canvasHeight,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${activeMassView.cols}, ${activeMassView.cellWidth}px)`,
                gridTemplateRows: `repeat(${activeMassView.rows}, ${activeMassView.cellHeight}px)`,
                gap: gridGap,
                width: canvasWidth,
                minWidth: canvasWidth,
              }}
            >
              {Array.from({ length: activeMassView.rows }, (_, row) =>
                Array.from({ length: activeMassView.cols }, (_, col) => {
                  const key = `${row}-${col}`;
                  const cell = activeMassView.cells[key];
                  const isHeader = cell ? isRayonHeaderCell(cell) : false;
                  return (
                    <div
                      key={`cell-${key}`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        const mouseEvent = event as unknown as React.MouseEvent<HTMLDivElement>;
                        mouseEvent.stopPropagation();
                        placeMassItem(key);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        placeMassItem(key);
                      }}
                      onMouseEnter={() => {
                        if (cell) setHoveredTarget({ kind: "cell", key });
                      }}
                      onMouseLeave={() => {
                        setHoveredTarget((current) =>
                          current?.kind === "cell" && current.key === key ? null : current,
                        );
                      }}
                      style={{
                        minHeight: activeMassView.cellHeight,
                        borderRadius: 0,
                        border: selectedTarget?.kind === "cell" && selectedTarget.key === key
                          ? "2px solid #0a4f98"
                          : selectedAlleyCells.includes(key)
                            ? "2px solid #475569"
                            : cell
                              ? `1.5px solid ${cell.color}55`
                              : "1px dashed #cbd5e1",
                        background: isCellInsideAlley(row, col)
                          ? "#e2e8f0"
                          : selectedAlleyCells.includes(key)
                            ? "rgba(71,85,105,0.10)"
                            : cell
                              ? isHeader
                                ? `linear-gradient(160deg, ${cell.color}, ${cell.color}dd)`
                                : `linear-gradient(180deg, ${cell.color}26, ${cell.color}12)`
                              : "#f8fafc",
                        color: cell && isHeader ? "#ffffff" : "#13243b",
                        padding: 8,
                        cursor: selectedMassItem || cell || isCellInsideAlley(row, col) ? "pointer" : "default",
                        display: "grid",
                        alignContent: "center",
                        justifyItems: "center",
                        gap: 6,
                        textAlign: "center",
                        position: "relative",
                        overflow: "visible",
                        zIndex: hoveredTarget?.kind === "cell" && hoveredTarget.key === key ? 8 : 1,
                        boxShadow: cell
                          ? isHeader
                            ? `0 14px 24px ${cell.color}30`
                            : `0 10px 20px ${cell.color}18`
                          : "none",
                      }}
                    >
                      {cell && (hoveredTarget?.kind === "cell" && hoveredTarget.key === key) ? (
                        <div
                          style={{
                            position: "absolute",
                            top: -18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: 4,
                            zIndex: 12,
                            padding: 4,
                            borderRadius: 12,
                            border: "1px solid #dbe3eb",
                            background: "#ffffff",
                            boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateTarget({ kind: "cell", key });
                            }}
                            style={massActionButtonStyle}
                          >
                            Dup
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              rotateTarget({ kind: "cell", key });
                            }}
                            style={massActionButtonStyle}
                          >
                            Rot
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeTarget({ kind: "cell", key });
                            }}
                            style={{ ...massActionButtonStyle, color: "#b91c2e" }}
                          >
                            ×
                          </button>
                        </div>
                      ) : null}
                      {cell ? (
                        <>
                          <span
                            style={getCellLabelStyle(cell.label, isHeader, cell.rotation ?? 0)}
                          >
                            {cell.label}
                          </span>
                        </>
                      ) : isCellInsideAlley(row, col) ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: "transparent" }}>.</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>
                          {selectedMassItem?.kind === "cell" ? "Placer ici" : selectedMassItem?.kind === "alley" ? "Sélection" : selectedMassItem?.kind === "view" ? "Poser plan" : `Case ${row + 1}-${col + 1}`}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>

            {activeMassView.id === DEFAULT_MASS_VIEW_ID
              ? Object.entries(activeMassView.linkedViews).map(([placementKey, linkedView]) => {
                  const box = getLinkedViewBox(linkedView);
                  const sourceView = box.sourceView;
                  if (!sourceView) return null;
                  const linkedAccent = Object.values(sourceView.cells)[0]?.color ?? "#0a4f98";
                  const isSelected = selectedTarget?.kind === "view" && selectedTarget.key === placementKey;
                  return (
                    <div
                      key={placementKey}
                      role="button"
                      tabIndex={0}
                      onMouseDown={(event) => {
                        if (armedLinkedViewKey !== placementKey) return;
                        if (event.button !== 0) return;
                        if ((event.target as HTMLElement).closest("button")) return;
                        event.preventDefault();
                        event.stopPropagation();
                        startLinkedViewDrag(placementKey, event.clientX, event.clientY);
                      }}
                      onClick={(event) => {
                        const mouseEvent = event as unknown as React.MouseEvent<HTMLDivElement>;
                        mouseEvent.stopPropagation();
                        setSelectedTarget({ kind: "view", key: placementKey });
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        setSelectedTarget({ kind: "view", key: placementKey });
                      }}
                      onMouseEnter={() => setHoveredTarget({ kind: "view", key: placementKey })}
                      onMouseLeave={() => {
                        setHoveredTarget((current) => (current?.kind === "view" && current.key === placementKey ? null : current));
                      }}
                      style={{
                        position: "absolute",
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        borderRadius: 0,
                        outline: isSelected ? `3px solid ${linkedAccent}` : `2px solid ${hexToRgba(linkedAccent, 0.82)}`,
                        outlineOffset: 3,
                        background: "#ffffff",
                        boxShadow: isSelected ? `0 16px 28px ${hexToRgba(linkedAccent, 0.16)}` : "none",
                        overflow: "visible",
                        zIndex: draggingLinkedViewKey === placementKey ? 16 : hoveredTarget?.kind === "view" && hoveredTarget.key === placementKey ? 10 : 5,
                        cursor: armedLinkedViewKey === placementKey ? "grab" : "default",
                      }}
                    >
                      {(hoveredTarget?.kind === "view" && hoveredTarget.key === placementKey) ? (
                        <div
                          style={{
                            position: "absolute",
                            top: -18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: 4,
                            zIndex: 12,
                            padding: 4,
                            borderRadius: 12,
                            border: "1px solid #dbe3eb",
                            background: "#ffffff",
                            boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setArmedLinkedViewKey((current) => (current === placementKey ? null : placementKey));
                            }}
                            style={{
                              ...massActionButtonStyle,
                              color: armedLinkedViewKey === placementKey ? "#0a4f98" : massActionButtonStyle.color,
                              background: armedLinkedViewKey === placementKey ? "#edf5ff" : massActionButtonStyle.background,
                            }}
                          >
                            Dép
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateLinkedViewTarget({ kind: "view", key: placementKey });
                            }}
                            style={massActionButtonStyle}
                          >
                            Dup
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeLinkedViewTarget({ kind: "view", key: placementKey });
                            }}
                            style={{ ...massActionButtonStyle, color: "#b91c2e" }}
                          >
                            ×
                          </button>
                        </div>
                      ) : null}
                      <div style={{ position: "relative", width: "100%", height: "100%", boxSizing: "border-box" }}>
                        {Array.from({ length: box.sourceRows }, (_, sourceRow) =>
                          Array.from({ length: box.sourceCols }, (_, sourceCol) => (
                            <div
                              key={`${placementKey}-bg-${sourceRow}-${sourceCol}`}
                              style={{
                                position: "absolute",
                                left: sourceCol * (activeMassView.cellWidth + gridGap),
                                top: sourceRow * (activeMassView.cellHeight + gridGap),
                                width: activeMassView.cellWidth,
                                height: activeMassView.cellHeight,
                                borderRadius: 0,
                                border: `1px solid ${hexToRgba(linkedAccent, 0.22)}`,
                                background: "#ffffff",
                                boxSizing: "border-box",
                              }}
                            />
                          )),
                        )}
                        {Object.entries(sourceView.cells).map(([sourceKey, sourceCell]) => {
                          const [rawRow, rawCol] = sourceKey.split("-").map(Number);
                          const sourceRow = rawRow - (box.sourceOffsetRow ?? 0);
                          const sourceCol = rawCol - (box.sourceOffsetCol ?? 0);
                          if (sourceRow < 0 || sourceCol < 0 || sourceRow >= box.sourceRows || sourceCol >= box.sourceCols) {
                            return null;
                          }
                          const sourceHeader = isRayonHeaderCell(sourceCell);
                          return (
                            <div
                              key={`${placementKey}-${sourceKey}`}
                              style={{
                                position: "absolute",
                                left: sourceCol * (activeMassView.cellWidth + gridGap),
                                top: sourceRow * (activeMassView.cellHeight + gridGap),
                                width: activeMassView.cellWidth,
                                height: activeMassView.cellHeight,
                                borderRadius: 0,
                                border: `1.5px solid ${sourceCell.color}55`,
                                background: sourceHeader
                                  ? `linear-gradient(160deg, ${sourceCell.color}, ${sourceCell.color}dd)`
                                  : `linear-gradient(180deg, ${sourceCell.color}26, ${sourceCell.color}12)`,
                                color: sourceHeader ? "#ffffff" : "#13243b",
                                display: "grid",
                                placeItems: "center",
                                padding: 8,
                                textAlign: "center",
                                overflow: "hidden",
                                boxShadow: sourceHeader ? `0 10px 20px ${sourceCell.color}28` : `0 8px 16px ${sourceCell.color}16`,
                              }}
                            >
                              <span style={getCellLabelStyle(sourceCell.label, sourceHeader, sourceCell.rotation ?? 0)}>
                                {sourceCell.label}
                              </span>
                            </div>
                          );
                        })}
                        {Object.entries(sourceView.alleys).map(([alleyKey, sourceAlley]) => {
                          const startRow = sourceAlley.startRow - (box.sourceOffsetRow ?? 0);
                          const endRow = sourceAlley.endRow - (box.sourceOffsetRow ?? 0);
                          const startCol = sourceAlley.startCol - (box.sourceOffsetCol ?? 0);
                          const endCol = sourceAlley.endCol - (box.sourceOffsetCol ?? 0);
                          if (startRow < 0 || startCol < 0 || endRow >= box.sourceRows || endCol >= box.sourceCols) {
                            return null;
                          }
                          return (
                            <div
                              key={`${placementKey}-${alleyKey}`}
                              style={{
                                position: "absolute",
                                left: startCol * (activeMassView.cellWidth + gridGap),
                                top: startRow * (activeMassView.cellHeight + gridGap),
                                width: (endCol - startCol + 1) * activeMassView.cellWidth + Math.max(0, endCol - startCol) * gridGap,
                                height: (endRow - startRow + 1) * activeMassView.cellHeight + Math.max(0, endRow - startRow) * gridGap,
                                borderRadius: 0,
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#334155",
                                display: "grid",
                                placeItems: "center",
                                padding: 6,
                                boxSizing: "border-box",
                                boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  transform: `rotate(${sourceAlley.rotation ?? 0}deg)`,
                                }}
                              >
                                {sourceAlley.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              : null}

            {Object.entries(activeMassView.alleys).map(([alleyKey, alley]) => {
              const box = getAlleyBox(alley);
              const isSelected = selectedTarget?.kind === "alley" && selectedTarget.key === alleyKey;
              return (
                <div
                  key={alleyKey}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    const mouseEvent = event as unknown as React.MouseEvent<HTMLDivElement>;
                    mouseEvent.stopPropagation();
                    setSelectedTarget({ kind: "alley", key: alleyKey });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setSelectedTarget({ kind: "alley", key: alleyKey });
                  }}
                  onMouseEnter={() => setHoveredTarget({ kind: "alley", key: alleyKey })}
                  onMouseLeave={() => {
                    setHoveredTarget((current) =>
                      current?.kind === "alley" && current.key === alleyKey ? null : current,
                    );
                  }}
                  style={{
                    position: "absolute",
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                    borderRadius: 0,
                    border: isSelected ? "2px solid #334155" : "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    boxShadow: isSelected ? "0 10px 24px rgba(51,65,85,0.14)" : "0 4px 14px rgba(15,23,42,0.08)",
                    display: "grid",
                    placeItems: "center",
                    padding: 6,
                    cursor: "pointer",
                    overflow: "visible",
                    zIndex: hoveredTarget?.kind === "alley" && hoveredTarget.key === alleyKey ? 8 : 4,
                  }}
                >
                  {(hoveredTarget?.kind === "alley" && hoveredTarget.key === alleyKey) ? (
                    <div
                      style={{
                        position: "absolute",
                        top: -18,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 4,
                        zIndex: 12,
                        padding: 4,
                        borderRadius: 12,
                        border: "1px solid #dbe3eb",
                        background: "#ffffff",
                        boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          duplicateTarget({ kind: "alley", key: alleyKey });
                        }}
                        style={massActionButtonStyle}
                      >
                        Dup
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          rotateTarget({ kind: "alley", key: alleyKey });
                        }}
                        style={massActionButtonStyle}
                      >
                        Rot
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeTarget({ kind: "alley", key: alleyKey });
                        }}
                        style={{ ...massActionButtonStyle, color: "#b91c2e" }}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <span
                    style={{
                      fontSize: alley.orientation === "vertical" ? 16 : 18,
                      fontWeight: 900,
                      letterSpacing: "0.04em",
                      lineHeight: 1.1,
                      transform: alley.orientation === "vertical" ? "translate(-50%, -50%) rotate(90deg)" : "none",
                      transformOrigin: "center center",
                      whiteSpace: "nowrap",
                      textTransform: "uppercase",
                      position: "absolute",
                      top: alley.orientation === "vertical" ? "50%" : "50%",
                      left: alley.orientation === "vertical" ? "50%" : "50%",
                    }}
                  >
                    {alley.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

const headerCellStyle: CSSProperties = {
  padding: "10px 8px",
  borderRight: "1px solid #dbe3eb",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#617286",
};

const bodyCellStyle: CSSProperties = {
  padding: 10,
  borderRight: "1px solid #eef2f7",
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  minHeight: 78,
};

const massActionButtonStyle: CSSProperties = {
  minWidth: 28,
  height: 24,
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(255,255,255,0.94)",
  color: "#334155",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 6px",
  boxShadow: "0 4px 12px rgba(15,23,42,0.10)",
};
