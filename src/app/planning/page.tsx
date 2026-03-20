"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";

type EmployeeType = "MATIN" | "APREM" | "ETU";
type StatusKey =
  | "PRESENT"
  | "RH"
  | "CP"
  | "MAL"
  | "ABS"
  | "FORM"
  | "X"
  | "CONGE_MAT";

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
  return (
    1 +
    Math.round(
      ((day.getTime() - weekOne.getTime()) / 86400000 -
        3 +
        ((weekOne.getDay() + 6) % 7)) /
        7,
    )
  );
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
    if (cycle[cycleWeekIndex] === dayCode) {
      return "RH";
    }
  }

  return "PRESENT";
}

function getShift(employee: Employee, date: Date) {
  const day = date.getDay();
  if (day === 2) return employee.tuesdayShift;
  if (day === 6 && employee.type === "ETU") return "14h-21h30";
  return employee.standardShift;
}

type EditState = {
  employeeName: string;
  dateIso: string;
  status: StatusKey;
};

export default function PlanningPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(2);
  const [filter, setFilter] = useState<"ALL" | EmployeeType>("ALL");
  const [overrides, setOverrides] = useState<Record<string, { status: StatusKey; customShift?: string }>>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [customShift, setCustomShift] = useState("");

  const monthDays = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: monthDays }, (_, index) => new Date(year, month, index + 1));

  const visibleEmployees = useMemo(() => {
    if (filter === "ALL") return EMPLOYEES;
    return EMPLOYEES.filter((employee) => employee.type === filter);
  }, [filter]);

  const getStatus = (employee: Employee, date: Date): StatusKey => {
    const key = `${employee.name}_${date.toISOString().slice(0, 10)}`;
    return overrides[key]?.status ?? getDefaultStatus(employee, date);
  };

  const getRenderedCell = (employee: Employee, date: Date) => {
    const key = `${employee.name}_${date.toISOString().slice(0, 10)}`;
    const status = getStatus(employee, date);
    if (status !== "PRESENT") {
      return STATUS_LABEL[status];
    }
    return overrides[key]?.customShift ?? getShift(employee, date) ?? "P";
  };

  const morningCount = (date: Date) =>
    EMPLOYEES.filter(
      (employee) => employee.type === "MATIN" && getStatus(employee, date) === "PRESENT",
    ).length;
  const eveningCount = (date: Date) =>
    EMPLOYEES.filter(
      (employee) => employee.type === "APREM" && getStatus(employee, date) === "PRESENT",
    ).length;

  const weekDayDates = dates.filter((date) => date.getDay() !== 0);
  const morningValues = weekDayDates.map((date) => morningCount(date));
  const avgMorning = morningValues.length
    ? Math.round(morningValues.reduce((sum, value) => sum + value, 0) / morningValues.length)
    : 0;
  const minMorning = morningValues.length ? Math.min(...morningValues) : 0;
  const alertDays = morningValues.filter((value) => value < 8).length;
  const morningActive = EMPLOYEES.filter(
    (employee) => employee.type === "MATIN" && employee.active,
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

  return (
    <section className="module-layout module-theme-planning planning-workbench">
      <ModuleHeader
        moduleKey="planning"
        title="Planning manager"
        description="Vue operationnelle inspiree de Claude AI: pilotage mensuel, filtres d'equipe, edition rapide des statuts et lecture immediate des effectifs."
      />

      <div className="planning-toolbar">
        <div className="planning-month-nav">
          <button type="button" className="week-chip" onClick={goPreviousMonth}>
            ←
          </button>
          <strong>
            {MONTHS_FR[month]} {year}
          </strong>
          <button type="button" className="week-chip" onClick={goNextMonth}>
            →
          </button>
        </div>
        <div className="week-chip-row">
          {(["ALL", "MATIN", "APREM", "ETU"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`week-chip${filter === value ? " week-chip-active" : ""}`}
              onClick={() => setFilter(value)}
            >
              {value === "ALL"
                ? "Tous"
                : value === "APREM"
                  ? "Soir"
                  : value === "ETU"
                    ? "Etudiants"
                    : "Matin"}
            </button>
          ))}
        </div>
      </div>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Moyenne matin</p>
          <h2>{avgMorning}</h2>
          <p>Presence moyenne sur les jours ouvrables.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Minimum matin</p>
          <h2>{minMorning}</h2>
          <p>Point bas de couverture sur le mois en cours.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Jours alerte</p>
          <h2>{alertDays}</h2>
          <p>Jours avec moins de 8 presents le matin.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Effectif matin</p>
          <h2>{morningActive}</h2>
          <p>Base active pour pilotage quotidien.</p>
        </article>
      </div>

      <article className="module-card planning-table-module">
        <div className="planning-table-wrap">
          <table className="planning-table planning-table-dense">
            <thead>
              <tr>
                <th>Jour</th>
                {visibleEmployees.map((employee) => (
                  <th key={employee.name}>{employee.name.slice(0, 6)}</th>
                ))}
                <th>MAT</th>
                <th>SOIR</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const day = date.getDay();
                if (day === 0) return null;
                const isAlert = morningCount(date) < 8;
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <tr
                    key={date.toISOString()}
                    className={`${isToday ? "planning-row-today" : ""} ${isAlert ? "planning-row-alert" : ""}`}
                  >
                    <td>
                      <strong>
                        {DAY_CODE[day]} {date.getDate()}
                      </strong>
                    </td>
                    {visibleEmployees.map((employee) => {
                      const status = getStatus(employee, date);
                      const triCaddiePair = TRI_CADDIE_MARCH[day];
                      const hasTri = !!triCaddiePair?.includes(employee.name);
                      return (
                        <td key={`${date.toISOString()}-${employee.name}`}>
                          <button
                            type="button"
                            className={`planning-cell-badge planning-status-${status.toLowerCase()}`}
                            onClick={() => openEdit(employee.name, date, status)}
                            title={`${employee.name} - cliquer pour modifier`}
                          >
                            {getRenderedCell(employee, date)}
                          </button>
                          {hasTri ? <span className="planning-tri-dot">🛒</span> : null}
                        </td>
                      );
                    })}
                    <td>
                      <strong>{morningCount(date)}</strong>
                    </td>
                    <td>
                      <strong>{eveningCount(date)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <div className="planning-layout-grid">
        <article className="module-card">
          <p className="panel-kicker">Tri caddie</p>
          <h2>Rotation mars 2026</h2>
          <div className="status-grid">
            {Object.entries(TRI_CADDIE_MARCH).map(([dayNumber, pair]) => (
              <div key={dayNumber} className="status-row">
                <span>{DAY_CODE[Number(dayNumber)]}</span>
                <strong>{pair.join(" + ")}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="module-card">
          <p className="panel-kicker">Binomes repos</p>
          <h2>Paires fixes</h2>
          <ul>
            {REST_PAIRS.map((pair) => (
              <li key={pair}>{pair}</li>
            ))}
          </ul>
        </article>
      </div>

      {editing ? (
        <div className="planning-modal-overlay" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="planning-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="panel-kicker">Edition rapide</p>
            <h2>
              {editing.employeeName} -{" "}
              {new Date(`${editing.dateIso}T00:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <div className="week-chip-row">
              {(Object.keys(STATUS_LABEL) as StatusKey[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`week-chip${editing.status === status ? " week-chip-active" : ""}`}
                  onClick={() => setEditing({ ...editing, status })}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
            <label className="planning-select-field" style={{ marginTop: 12 }}>
              <span>Horaire personnalise (optionnel)</span>
              <input
                value={customShift}
                onChange={(event) => setCustomShift(event.target.value)}
                placeholder="Ex: 6h-13h30"
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  border: "1px solid #dbe3eb",
                  padding: "0 12px",
                }}
              />
            </label>
            <div className="planning-modal-actions">
              <button type="button" className="week-chip" onClick={() => setEditing(null)}>
                Annuler
              </button>
              <button type="button" className="week-chip week-chip-active" onClick={saveEdit}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
