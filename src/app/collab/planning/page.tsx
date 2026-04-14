"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabCardStyle, collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import { isRhEmployeeCoordinatorRole } from "@/lib/rh-status";
import {
  endOfWeek,
  formatIsoDate,
  getEntryDate,
  getMyMonthPlanning,
  getMyWeekPlanning,
  getShiftBadgeLabel,
  getShiftCategory,
  getShiftDisplayText,
  getShiftTone,
  getTeamWeekPlanning,
  startOfWeek,
  type CollabPlanningEntry,
} from "@/lib/collab-data";

const tabs = ["Semaine", "Mois", "Équipe"] as const;
type PlanningTab = (typeof tabs)[number];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekNumber(date: Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const week1 = new Date(target.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

function formatWeekRange(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Semaine ${getWeekNumber(start)} · du ${startLabel} au ${endLabel}`;
}

function getWeekTitle(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Du ${startLabel} au ${endLabel}`;
}

function getTeamDayLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

function getTeamDayDateLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function getStatusBadge(date: Date) {
  const today = new Date();
  const compare = new Date(date);
  today.setHours(0, 0, 0, 0);
  compare.setHours(0, 0, 0, 0);
  if (compare.getTime() < today.getTime()) return { label: "Passé", bg: collabTheme.black, color: "#ffffff" };
  if (compare.getTime() === today.getTime()) return { label: "En cours", bg: collabTheme.accent, color: "#ffffff" };
  return { label: "À venir", bg: collabTheme.amberBg, color: collabTheme.amber };
}

function getMonthShortLabel(entry: CollabPlanningEntry | undefined, profile: CollabProfile | null) {
  if (!entry) return "";
  const category = getShiftCategory(entry, profile);
  if (category === "matin") return "M";
  if (category === "apresmidi") return "AM";
  if (category === "conge") return "CP";
  if (category === "repos") return "RH";
  return getShiftBadgeLabel(entry, profile);
}

function getTeamCellBackground(label: string) {
  if (label === "M") return "#eef4ff";
  if (label === "AM") return "#fff1df";
  if (label === "CP") return "#ebfbf1";
  if (label === "RH") return "#f4eee6";
  if (label === "×") return "#f1ece5";
  if (label === "Abs") return "#fff0f1";
  return "#fbf8f3";
}

function normalizeEmployeeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getEmployeeShiftRank(type: unknown) {
  const upper = String(type ?? "").toUpperCase();
  if (upper.includes("APRES")) return 1;
  if (upper.includes("ETUD")) return 2;
  return 0;
}

function compareTeamPeople(
  left: { name: string; type: unknown; observation: unknown },
  right: { name: string; type: unknown; observation: unknown },
) {
  const leftShift = getEmployeeShiftRank(left.type);
  const rightShift = getEmployeeShiftRank(right.type);
  if (leftShift !== rightShift) return leftShift - rightShift;

  const leftIsCoordinator =
    isRhEmployeeCoordinatorRole(left.observation, String(left.type ?? "")) ||
    ["ABDOU", "MASSIMO"].includes(normalizeEmployeeName(left.name));
  const rightIsCoordinator =
    isRhEmployeeCoordinatorRole(right.observation, String(right.type ?? "")) ||
    ["ABDOU", "MASSIMO"].includes(normalizeEmployeeName(right.name));
  if (leftIsCoordinator !== rightIsCoordinator) return leftIsCoordinator ? -1 : 1;

  return left.name.localeCompare(right.name, "fr");
}

export default function CollabPlanningPage() {
  const router = useRouter();
  const teamScrollRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [activeTab, setActiveTab] = useState<PlanningTab>("Semaine");
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [weekRows, setWeekRows] = useState<CollabPlanningEntry[]>([]);
  const [monthRows, setMonthRows] = useState<CollabPlanningEntry[]>([]);
  const [teamRows, setTeamRows] = useState<Array<Record<string, unknown>>>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [teamScrollLeft, setTeamScrollLeft] = useState(0);

  useEffect(() => {
    void getCollabProfile()
      .then((nextProfile) => {
        if (!nextProfile || nextProfile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        setProfile(nextProfile);
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    const weekStart = formatIsoDate(startOfWeek(weekCursor));
    const weekEnd = formatIsoDate(endOfWeek(weekCursor));
    void Promise.allSettled([getMyWeekPlanning(weekStart, weekEnd), getTeamWeekPlanning(weekStart, weekEnd)]).then(
      ([myWeekResult, teamWeekResult]) => {
        setWeekRows(myWeekResult.status === "fulfilled" ? (myWeekResult.value as CollabPlanningEntry[]) : []);
        setTeamRows(teamWeekResult.status === "fulfilled" ? (teamWeekResult.value as Array<Record<string, unknown>>) : []);
        setLastRefreshAt(new Date());
      },
    );
  }, [profile, weekCursor]);

  useEffect(() => {
    if (!profile) return;
    void getMyMonthPlanning(monthCursor.getFullYear(), monthCursor.getMonth() + 1)
      .then((rows) => {
        setMonthRows(rows as CollabPlanningEntry[]);
        setLastRefreshAt(new Date());
      })
      .catch(() => setMonthRows([]));
  }, [monthCursor, profile]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(weekCursor), index)), [weekCursor]);
  const displayDays = weekDays;

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prefix = (firstDay.getDay() + 6) % 7;
    const leading = Array.from({ length: prefix }, (_, index) => new Date(year, month, index - prefix + 1));
    const current = Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
    return [...leading, ...current];
  }, [monthCursor]);

  const monthRowsByDate = useMemo(() => {
    const byDate = new Map<string, CollabPlanningEntry>();
    monthRows.forEach((entry) => byDate.set(getEntryDate(entry), entry));
    return byDate;
  }, [monthRows]);

  const teamNames = useMemo(() => {
    const names = new Map<
      string,
      {
        name: string;
        type: unknown;
        observation: unknown;
        entries: Map<string, Record<string, unknown>>;
      }
    >();
    teamRows.forEach((row) => {
      const employee = row.employees as Record<string, unknown> | null | undefined;
      const name = String(employee?.name ?? "Équipe");
      if (!names.has(name)) {
        names.set(name, {
          name,
          type: employee?.type ?? null,
          observation: employee?.observation ?? null,
          entries: new Map(),
        });
      }
      names.get(name)?.entries.set(String(row.date ?? ""), row);
    });
    return Array.from(names.values()).sort(compareTeamPeople);
  }, [teamRows]);

  const summary = useMemo(() => {
    const worked = weekRows.filter((entry) => ["matin", "apresmidi", "journee"].includes(getShiftCategory(entry, profile)));
    const repos = weekRows.filter((entry) => getShiftCategory(entry, profile) === "repos").length;
    const conges = weekRows.filter((entry) => getShiftCategory(entry, profile) === "conge").length;
    return {
      workedDays: worked.length,
      restDays: repos,
      leaveDays: conges,
    };
  }, [profile, weekRows]);

  const weekRangeLabel = useMemo(
    () => formatWeekRange(weekDays[0], weekDays[6]),
    [weekDays],
  );
  const monthLabel = useMemo(
    () => monthCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    [monthCursor],
  );
  const weekTitle = useMemo(
    () => getWeekTitle(weekDays[0], weekDays[6]),
    [weekDays],
  );

  if (!profile) return null;

  return (
    <CollabPage>
      <CollabHeader
        title="Planning"
        subtitle={
          activeTab === "Mois"
            ? monthLabel
            : weekRangeLabel
        }
        showRefresh
        lastRefreshAt={lastRefreshAt}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                minHeight: 38,
                borderRadius: 14,
                border: `1px solid ${active ? collabTheme.card : collabTheme.line}`,
                background: active ? collabTheme.card : "rgba(255,255,255,0.35)",
                color: active ? collabTheme.black : "#9c8a79",
                fontWeight: active ? 700 : 600,
                cursor: "pointer",
                textTransform: "uppercase",
                fontSize: 12,
                letterSpacing: "0.08em",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === "Semaine" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${collabTheme.line}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ ...collabSerifTitleStyle({ fontSize: 16 }) }}>Mon planning</div>
                <div style={{ marginTop: 3, fontSize: 12, color: collabTheme.muted }}>{weekRangeLabel}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${collabTheme.line}`, background: "#fffaf6", color: collabTheme.text, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  ‹
                </button>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${collabTheme.line}`, background: "#fffaf6", color: collabTheme.text, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  ›
                </button>
              </div>
            </div>
            <div style={{ padding: "0 14px 6px" }}>
              {weekRows.length ? weekRows.map((entry, index) => {
                const date = new Date(`${getEntryDate(entry)}T12:00:00`);
                const badge = getStatusBadge(date);
                return (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "3px 1fr auto", gap: 10, alignItems: "center", padding: "12px 0", borderTop: `1px solid ${collabTheme.line}` }}>
                    <div style={{ width: 3, alignSelf: "stretch", borderRadius: 999, background: getShiftTone(entry, profile) }} />
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.08em", color: collabTheme.muted, textTransform: "uppercase" }}>
                        {date.toLocaleDateString("fr-FR", { weekday: "short" })} {date.getDate()}
                        {badge.label === "En cours" ? " — aujourd’hui" : ""}
                      </div>
                      <div style={{ ...collabSerifTitleStyle({ fontSize: 24, marginTop: 3 }) }}>{getShiftDisplayText(entry, profile)}</div>
                    </div>
                    <span style={{ borderRadius: 999, padding: "6px 10px", background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                  </div>
                );
              }) : <div style={{ padding: "18px 0", color: collabTheme.muted, fontSize: 13 }}>Aucun planning sur cette semaine.</div>}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle>Résumé</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
              <div><div style={{ ...collabSerifTitleStyle({ fontSize: 24 }) }}>{summary.workedDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Jours travaillés</div></div>
              <div><div style={{ ...collabSerifTitleStyle({ fontSize: 24 }) }}>{summary.restDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Repos</div></div>
              <div><div style={{ ...collabSerifTitleStyle({ fontSize: 24 }) }}>{summary.leaveDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Congé</div></div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "Mois" ? (
        <SectionCard>
          <SectionTitle
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${collabTheme.line}`,
                    background: "#fffaf6",
                    color: collabTheme.text,
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${collabTheme.line}`,
                    background: "#fffaf6",
                    color: collabTheme.text,
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ›
                </button>
              </div>
            }
          >
            {monthLabel}
          </SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7 }}>
            {monthDays.map((day, index) => {
              const iso = formatIsoDate(day);
              const entry = monthRowsByDate.get(iso);
              const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
              const isToday = iso === formatIsoDate(new Date());
              const label = getMonthShortLabel(entry, profile);
              const tone = entry ? getShiftTone(entry, profile) : "transparent";
              return (
                <div
                  key={`${iso}-${index}`}
                  style={{
                    minHeight: 70,
                    borderRadius: 14,
                    padding: "7px 6px",
                    background: isToday ? collabTheme.black : isCurrentMonth ? "#fbf8f3" : "rgba(255,255,255,0.45)",
                    border: `1px solid ${isToday ? collabTheme.black : collabTheme.line}`,
                    color: isToday ? "#ffffff" : isCurrentMonth ? collabTheme.text : "#b9aa9a",
                  }}
                >
                  <div style={{ fontSize: 11, textTransform: "uppercase", color: isToday ? "rgba(255,255,255,0.75)" : collabTheme.muted }}>
                    {day.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 2)}
                  </div>
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 19, color: isToday ? "#ffffff" : isCurrentMonth ? collabTheme.text : "#b9aa9a", marginTop: 4 }) }}>{day.getDate()}</div>
                  <div style={{ marginTop: 8, height: 4, borderRadius: 999, background: tone }} />
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: isToday ? "#ffffff" : tone === "transparent" ? collabTheme.muted : tone }}>{label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, fontSize: 12, color: collabTheme.muted }}>
            <span><span style={{ color: "#D40511" }}>■</span> Matin</span>
            <span><span style={{ color: "#d97706" }}>■</span> Après-midi</span>
            <span><span style={{ color: "#16a34a" }}>■</span> Congé</span>
            <span><span style={{ color: "#c7b9a3" }}>■</span> RH</span>
            <span><span style={{ color: "#d6cdc1" }}>■</span> Non travaillé</span>
            <span><span style={{ color: "#1a1410" }}>■</span> aujourd’hui</span>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "Équipe" ? (
        <SectionCard>
          <SectionTitle
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${collabTheme.line}`, background: "#fffaf6", color: collabTheme.text, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  ‹
                </button>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${collabTheme.line}`, background: "#fffaf6", color: collabTheme.text, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  ›
                </button>
              </div>
            }
          >
            Vue équipe
          </SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                position: "sticky",
                top: 8,
                zIndex: 4,
                marginTop: -4,
                paddingBottom: 10,
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(255,250,246,0.98) 0%, rgba(255,250,246,0.94) 84%, rgba(255,250,246,0) 100%)",
              }}
            >
              <div
                style={{
                  width: "max-content",
                  minWidth: 540,
                  transform: `translateX(-${teamScrollLeft}px)`,
                  willChange: "transform",
                }}
              >
                <div
                  style={{
                    ...collabCardStyle({
                      padding: "12px 10px 10px",
                      background: "rgba(255,250,246,0.96)",
                      boxShadow: "0 10px 24px rgba(80,50,30,0.08)",
                    }),
                  }}
                >
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 18 }) }}>Semaine {getWeekNumber(weekDays[0])}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: collabTheme.muted }}>{weekTitle}</div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "104px repeat(7, 58px)",
                      gap: 6,
                      marginTop: 12,
                      alignItems: "start",
                    }}
                  >
                    <div style={{ fontSize: 10, color: collabTheme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nom</div>
                    {displayDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        style={{
                          display: "grid",
                          gap: 3,
                          justifyItems: "center",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 10, color: collabTheme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {getTeamDayLabel(day)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: collabTheme.text }}>
                          {getTeamDayDateLabel(day)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={teamScrollRef}
              onScroll={(event) => setTeamScrollLeft(event.currentTarget.scrollLeft)}
              style={{ overflowX: "auto" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "104px repeat(7, 58px)", gap: 6, minWidth: 540 }}>
              {teamNames.map((person) => {
                const isMe = person.name === profile.employees?.name;
                return [
                  <div
                    key={`${person.name}-label`}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 12,
                      background: "#fbf8f3",
                      color: isMe ? collabTheme.accent : collabTheme.text,
                      border: `1px solid ${isMe ? collabTheme.accent : collabTheme.line}`,
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {person.name}
                  </div>,
                  ...displayDays.map((day) => {
                    const iso = formatIsoDate(day);
                    const row = person.entries.get(iso) as CollabPlanningEntry | undefined;
                    const label = row ? getMonthShortLabel(row, profile) : "—";
                    const detail =
                      row && (label === "M" || label === "AM")
                        ? getShiftDisplayText(row, profile)
                        : "";
                    return (
                      <div
                        key={`${person.name}-${iso}`}
                        style={{
                          ...collabCardStyle({
                            minHeight: 48,
                            boxShadow: "none",
                            background: getTeamCellBackground(label),
                            display: "grid",
                            placeItems: "center",
                            padding: "4px 2px",
                            borderRadius: 12,
                          }),
                        }}
                      >
                        <span style={{ color: row ? getShiftTone(row, profile) : collabTheme.muted, fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                          {label}
                        </span>
                        {detail ? (
                          <span style={{ marginTop: 3, color: collabTheme.muted, fontSize: 8, lineHeight: 1.1, textAlign: "center" }}>
                            {detail.replace("h20", "h").replace("h30", "h30")}
                          </span>
                        ) : null}
                      </div>
                    );
                  }),
                ];
              })}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <CollabBottomNav />
    </CollabPage>
  );
}

