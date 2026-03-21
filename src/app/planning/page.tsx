"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import { type AbsenceRequest } from "@/lib/absences-data";
import { getAbsencesUpdatedEventName, loadAbsenceRequests } from "@/lib/absences-store";

type EmployeeType = "MATIN" | "APREM" | "ETU";
type StatusKey = "PRESENT" | "RH" | "CP" | "MAL" | "ABS" | "FORM" | "X" | "CONGE_MAT";

type Employee = {
  name: string;
  type: EmployeeType;
  standardShift: string | null;
  tuesdayShift: string | null;
  note: string;
  active: boolean;
};

const MONTHS_FR = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const DAY_CODE = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"] as const;

const EMPLOYEES: Employee[] = [
  { name: "ABDOU", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Coordo", active: true },
  { name: "CECILE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "KAMAR", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Conge mat.", active: false },
  { name: "YASSINE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "WASIM", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "JEREMY", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "KAMEL", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "PASCALE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "MOHCINE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "LIYAKATH", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "KHANH", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "ROSALIE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "JAMAA", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "EL HASSANE", type: "MATIN", standardShift: "3h50-11h20", tuesdayShift: "3h00-10h30", note: "Employee", active: true },
  { name: "MASSIMO", type: "APREM", standardShift: "14h-21h30", tuesdayShift: "12h-19h30", note: "Employee", active: true },
  { name: "DILAXSHAN", type: "APREM", standardShift: "14h-21h30", tuesdayShift: "12h-19h30", note: "Employee", active: true },
  { name: "YLEANA", type: "ETU", standardShift: null, tuesdayShift: null, note: "Etudiant", active: true },
  { name: "MOUNIR", type: "ETU", standardShift: null, tuesdayShift: null, note: "Etudiant", active: true },
  { name: "MAHIN", type: "ETU", standardShift: null, tuesdayShift: null, note: "Etudiant", active: true },
  { name: "MOHAMED", type: "ETU", standardShift: null, tuesdayShift: null, note: "Etudiant", active: true },
  { name: "ACHRAF", type: "ETU", standardShift: null, tuesdayShift: null, note: "Etudiant", active: true },
];

const WEEKLY_REST_CYCLE: Record<string, string[]> = {
  ABDOU: ["VEN", "VEN", "VEN", "VEN", "VEN"],
  CECILE: ["MER", "MER", "MER", "MER", "SAM"],
  MASSIMO: ["JEU", "JEU", "JEU", "JEU", "JEU"],
  DILAXSHAN: ["SAM", "MER", "MER", "MER", "MER"],
  KAMAR: ["MAR", "MAR", "MAR", "MAR", "MAR"],
  YASSINE: ["JEU", "JEU", "JEU", "JEU", "SAM"],
  WASIM: ["VEN", "VEN", "SAM", "VEN", "VEN"],
  JEREMY: ["VEN", "VEN", "VEN", "SAM", "VEN"],
  KAMEL: ["SAM", "MAR", "MAR", "MAR", "MAR"],
  PASCALE: ["SAM", "LUN", "LUN", "LUN", "LUN"],
  MOHCINE: ["MER", "MER", "MER", "SAM", "MER"],
  LIYAKATH: ["LUN", "LUN", "SAM", "LUN", "LUN"],
  KHANH: ["JEU", "JEU", "JEU", "JEU", "SAM"],
  ROSALIE: ["JEU", "SAM", "JEU", "JEU", "JEU"],
  JAMAA: ["MER", "MER", "SAM", "MER", "MER"],
  "EL HASSANE": ["VEN", "SAM", "VEN", "VEN", "VEN"],
};

const TRI_CADDIE_MARCH: Record<number, string[]> = {
  1: ["CECILE", "WASIM"],
  2: ["ROSALIE", "JAMAA"],
  3: ["JEREMY", "KAMEL"],
  4: ["EL HASSANE", "LIYAKATH"],
  5: ["KHANH", "YASSINE"],
  6: ["MOHCINE", "PASCALE"],
};

const REST_PAIRS = [
  "ROSALIE + JEREMY",
  "KHANH + CECILE",
  "MOHCINE + KAMEL",
  "EL HASSANE + JAMAA",
  "WASIM + LIYAKATH",
  "MOHAMED + PASCALE",
];

const STATUS_LABEL: Record<StatusKey, string> = {
  PRESENT: "P",
  RH: "RH",
  CP: "CP",
  MAL: "MAL",
  ABS: "ABS",
  FORM: "FOR",
  X: "X",
  CONGE_MAT: "C.M",
};

function getIsoWeek(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 3 - ((day.getDay() + 6) % 7));
  const weekOne = new Date(day.getFullYear(), 0, 4);
  return 1 + Math.round(((day.getTime() - weekOne.getTime()) / 86400000 - 3 + ((weekOne.getDay() + 6) % 7)) / 7);
}

function getDefaultStatus(employee: Employee, date: Date): StatusKey {
  const day = date.getDay();
  if (day === 0) return "X";
  if (employee.type === "ETU") return day === 6 ? "PRESENT" : "X";
  if (!employee.active) return "CONGE_MAT";

  const cycle = WEEKLY_REST_CYCLE[employee.name];
  if (cycle) {
    const cycleWeekIndex = (getIsoWeek(date) - 1) % 5;
    const dayCode = DAY_CODE[day];
    if (cycle[cycleWeekIndex] === dayCode) return "RH";
  }
  return "PRESENT";
}

function getShift(employee: Employee, date: Date) {
  const day = date.getDay();
  if (day === 2) return employee.tuesdayShift;
  if (day === 6 && employee.type === "ETU") return "14h-21h30";
  return employee.standardShift;
}

function mapAbsenceTypeToStatus(type: AbsenceRequest["type"]): StatusKey {
  if (type === "CP") return "CP";
  if (type === "MAL") return "MAL";
  if (type === "CONGE_MAT") return "CONGE_MAT";
  if (type === "FORM") return "FORM";
  return "ABS";
}

type EditState = {
  employeeName: string;
  dateIso: string;
  status: StatusKey;
};

const STATUS_STYLE: Record<StatusKey, React.CSSProperties> = {
  PRESENT: { background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" },
  RH: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  CP: { background: "#fffbeb", color: "#a16207", border: "1px solid #fde68a" },
  MAL: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" },
  ABS: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" },
  FORM: { background: "#e0f2fe", color: "#075985", border: "1px solid #bae6fd" },
  X: { background: "#e2e8f0", color: "#475569", border: "1px solid #cbd5e1" },
  CONGE_MAT: { background: "#ede9fe", color: "#5b21b6", border: "1px solid #ddd6fe" },
};

export default function PlanningPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(2);
  const [filter, setFilter] = useState<"ALL" | EmployeeType>("ALL");
  const [overrides, setOverrides] = useState<Record<string, { status: StatusKey; customShift?: string }>>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [customShift, setCustomShift] = useState("");
  const [approvedAbsences, setApprovedAbsences] = useState<AbsenceRequest[]>([]);

  const theme = moduleThemes.planning;

  useEffect(() => {
    const refreshAbsences = () => {
      const requests = loadAbsenceRequests().filter((request) => request.status === "APPROUVE");
      setApprovedAbsences(requests);
    };

    refreshAbsences();
    const eventName = getAbsencesUpdatedEventName();
    window.addEventListener(eventName, refreshAbsences);
    window.addEventListener("focus", refreshAbsences);
    return () => {
      window.removeEventListener(eventName, refreshAbsences);
      window.removeEventListener("focus", refreshAbsences);
    };
  }, []);

  const monthDays = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: monthDays }, (_, index) => new Date(year, month, index + 1));

  const visibleEmployees = useMemo(() => {
    if (filter === "ALL") return EMPLOYEES;
    return EMPLOYEES.filter((employee) => employee.type === filter);
  }, [filter]);

  const getStatus = (employee: Employee, date: Date): StatusKey => {
    const key = `${employee.name}_${date.toISOString().slice(0, 10)}`;
    if (overrides[key]?.status) return overrides[key].status;

    const dateIso = date.toISOString().slice(0, 10);
    const matchedAbsence = approvedAbsences.find(
      (request) => request.employee === employee.name && request.startDate <= dateIso && request.endDate >= dateIso,
    );

    if (matchedAbsence) return mapAbsenceTypeToStatus(matchedAbsence.type);
    return getDefaultStatus(employee, date);
  };

  const getRenderedCell = (employee: Employee, date: Date) => {
    const key = `${employee.name}_${date.toISOString().slice(0, 10)}`;
    const status = getStatus(employee, date);
    if (status !== "PRESENT") return STATUS_LABEL[status];
    return overrides[key]?.customShift ?? getShift(employee, date) ?? "P";
  };

  const morningCount = (date: Date) =>
    EMPLOYEES.filter((employee) => employee.type === "MATIN" && getStatus(employee, date) === "PRESENT").length;

  const eveningCount = (date: Date) =>
    EMPLOYEES.filter((employee) => employee.type === "APREM" && getStatus(employee, date) === "PRESENT").length;

  const weekDayDates = dates.filter((date) => date.getDay() !== 0);
  const morningValues = weekDayDates.map((date) => morningCount(date));
  const avgMorning = morningValues.length
    ? Math.round(morningValues.reduce((sum, value) => sum + value, 0) / morningValues.length)
    : 0;
  const minMorning = morningValues.length ? Math.min(...morningValues) : 0;
  const alertDays = morningValues.filter((value) => value < 8).length;
  const approvedThisMonth = approvedAbsences.filter(
    (absence) => absence.startDate <= `${year}-${String(month + 1).padStart(2, "0")}-31` && absence.endDate >= `${year}-${String(month + 1).padStart(2, "0")}-01`,
  ).length;

  const goPreviousMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((current) => current - 1);
      return;
    }
    setMonth((current) => current - 1);
  };

  const goNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((current) => current + 1);
      return;
    }
    setMonth((current) => current + 1);
  };

  const openEdit = (employeeName: string, date: Date, status: StatusKey) => {
    const key = `${employeeName}_${date.toISOString().slice(0, 10)}`;
    setCustomShift(overrides[key]?.customShift ?? "");
    setEditing({
      employeeName,
      dateIso: date.toISOString().slice(0, 10),
      status,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const key = `${editing.employeeName}_${editing.dateIso}`;
    setOverrides((current) => ({
      ...current,
      [key]: {
        status: editing.status,
        customShift: customShift.trim() || undefined,
      },
    }));
    setEditing(null);
    setCustomShift("");
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
    background: active ? theme.medium : "#fff",
    color: active ? theme.color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  });

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="planning"
        title="Planning manager"
        description="Vue operationnelle: pilotage mensuel, filtres d'equipe, edition rapide des statuts et lecture immediate des effectifs."
      />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" style={chipStyle(false)} onClick={goPreviousMonth}>←</button>
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>
              {MONTHS_FR[month]} {year}
            </strong>
            <button type="button" style={chipStyle(false)} onClick={goNextMonth}>→</button>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["ALL", "MATIN", "APREM", "ETU"] as const).map((value) => (
              <button key={value} type="button" style={chipStyle(filter === value)} onClick={() => setFilter(value)}>
                {value === "ALL" ? "Tous" : value === "APREM" ? "Soir" : value === "ETU" ? "Etudiants" : "Matin"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <KPIRow>
        <KPI moduleKey="planning" value={avgMorning} label="Moyenne matin" />
        <KPI moduleKey="planning" value={minMorning} label="Minimum matin" />
        <KPI moduleKey="planning" value={alertDays} label="Jours alerte" />
        <KPI moduleKey="planning" value={approvedThisMonth} label="Absences approuvees" />
      </KPIRow>

      <Card>
        <Kicker moduleKey="planning" label="Planning mensuel" />
        <div style={{ overflowX: "auto", marginTop: "10px" }}>
          <table style={{ width: "100%", minWidth: "980px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, background: "#fff", zIndex: 2, textAlign: "left", borderBottom: "1px solid #dbe3eb", padding: "8px", fontSize: "11px", color: "#64748b" }}>Jour</th>
                {visibleEmployees.map((employee) => (
                  <th key={employee.name} style={{ textAlign: "center", borderBottom: "1px solid #dbe3eb", padding: "8px", fontSize: "11px", color: "#64748b" }}>
                    {employee.name.slice(0, 6)}
                  </th>
                ))}
                <th style={{ textAlign: "center", borderBottom: "1px solid #dbe3eb", padding: "8px", fontSize: "11px", color: "#64748b" }}>MAT</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #dbe3eb", padding: "8px", fontSize: "11px", color: "#64748b" }}>SOIR</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const day = date.getDay();
                if (day === 0) return null;
                const isAlert = morningCount(date) < 8;
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <tr key={date.toISOString()} style={{ background: isToday ? "#eff6ff" : isAlert ? "#fffbeb" : "transparent" }}>
                    <td style={{ position: "sticky", left: 0, background: isToday ? "#eff6ff" : isAlert ? "#fffbeb" : "#fff", zIndex: 1, borderBottom: "1px solid #e2e8f0", padding: "7px 8px", fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>
                      {DAY_CODE[day]} {date.getDate()}
                    </td>
                    {visibleEmployees.map((employee) => {
                      const status = getStatus(employee, date);
                      const triCaddiePair = TRI_CADDIE_MARCH[day];
                      const hasTri = !!triCaddiePair?.includes(employee.name);
                      return (
                        <td key={`${date.toISOString()}-${employee.name}`} style={{ borderBottom: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => openEdit(employee.name, date, status)}
                            title={`${employee.name} - cliquer pour modifier`}
                            style={{
                              ...STATUS_STYLE[status],
                              borderRadius: "8px",
                              minHeight: "26px",
                              minWidth: "48px",
                              padding: "2px 6px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            {getRenderedCell(employee, date)}
                          </button>
                          {hasTri ? <span style={{ display: "inline-block", marginLeft: "4px", fontSize: "10px" }}>🛒</span> : null}
                        </td>
                      );
                    })}
                    <td style={{ borderBottom: "1px solid #e2e8f0", textAlign: "center", padding: "6px", fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>{morningCount(date)}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", textAlign: "center", padding: "6px", fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>{eveningCount(date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <Kicker moduleKey="planning" label="Tri caddie" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Rotation mars 2026</h2>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {Object.entries(TRI_CADDIE_MARCH).map(([dayNumber, pair]) => (
              <div key={dayNumber} style={{ border: "1px solid #dbe3eb", borderRadius: "10px", background: "#fff", padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>{DAY_CODE[Number(dayNumber)]}</span>
                <strong style={{ fontSize: "12px", color: "#0f172a" }}>{pair.join(" + ")}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="planning" label="Binomes repos" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Paires fixes</h2>
          <ul style={{ marginTop: "10px", paddingLeft: "18px", color: "#64748b", fontSize: "12px", lineHeight: 1.65 }}>
            {REST_PAIRS.map((pair) => (
              <li key={pair}>{pair}</li>
            ))}
          </ul>
        </Card>
      </div>

      {editing ? (
        <div
          role="presentation"
          onClick={() => setEditing(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            zIndex: 140,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(560px, 92vw)", background: "#fff", borderRadius: "16px", border: "1px solid #dbe3eb", padding: "16px" }}
          >
            <Kicker moduleKey="planning" label="Edition rapide" />
            <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>
              {editing.employeeName} - {" "}
              {new Date(`${editing.dateIso}T00:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
              {(Object.keys(STATUS_LABEL) as StatusKey[]).map((status) => (
                <button key={status} type="button" style={chipStyle(editing.status === status)} onClick={() => setEditing({ ...editing, status })}>
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>

            <label style={{ display: "grid", gap: "4px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
              <span>Horaire personnalise (optionnel)</span>
              <input
                value={customShift}
                onChange={(event) => setCustomShift(event.target.value)}
                placeholder="Ex: 6h-13h30"
                style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button type="button" style={chipStyle(false)} onClick={() => setEditing(null)}>Annuler</button>
              <button type="button" style={chipStyle(true)} onClick={saveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
