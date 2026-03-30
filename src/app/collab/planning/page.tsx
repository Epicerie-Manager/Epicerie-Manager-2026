"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
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

export default function CollabPlanningPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [activeTab, setActiveTab] = useState<PlanningTab>("Semaine");
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [weekRows, setWeekRows] = useState<CollabPlanningEntry[]>([]);
  const [monthRows, setMonthRows] = useState<CollabPlanningEntry[]>([]);
  const [teamRows, setTeamRows] = useState<Array<Record<string, unknown>>>([]);

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
    void Promise.allSettled([
      getMyWeekPlanning(weekStart, weekEnd),
      getTeamWeekPlanning(weekStart, weekEnd),
    ]).then(([myWeekResult, teamWeekResult]) => {
      setWeekRows(
        myWeekResult.status === "fulfilled"
          ? (myWeekResult.value as CollabPlanningEntry[])
          : [],
      );
      setTeamRows(
        teamWeekResult.status === "fulfilled"
          ? (teamWeekResult.value as Array<Record<string, unknown>>)
          : [],
      );
    });
  }, [profile, weekCursor]);

  useEffect(() => {
    if (!profile) return;
    void getMyMonthPlanning(monthCursor.getFullYear(), monthCursor.getMonth() + 1)
      .then((rows) => setMonthRows(rows as CollabPlanningEntry[]))
      .catch(() => setMonthRows([]));
  }, [monthCursor, profile]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(weekCursor), index)), [weekCursor]);
  const weekdays = weekDays.slice(0, 5);

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
  }, [monthCursor]);

  const monthRowsByDate = useMemo(() => {
    const byDate = new Map<string, CollabPlanningEntry>();
    monthRows.forEach((entry) => byDate.set(getEntryDate(entry), entry));
    return byDate;
  }, [monthRows]);

  const teamNames = useMemo(() => {
    const names = new Map<string, { name: string; entries: Map<string, Record<string, unknown>> }>();
    teamRows.forEach((row) => {
      const employee = row.employees as Record<string, unknown> | null | undefined;
      const name = String(employee?.name ?? "Équipe");
      if (!names.has(name)) names.set(name, { name, entries: new Map() });
      names.get(name)?.entries.set(String(row.date ?? ""), row);
    });
    return Array.from(names.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
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

  if (!profile) return null;

  return (
    <CollabPage>
      <CollabHeader title="Planning" subtitle="Votre semaine, votre mois et l'équipe en un coup d'œil." accent={false} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ flex: 1, minHeight: 40, borderRadius: 14, border: `1px solid ${active ? collabTheme.accent : collabTheme.line}`, background: active ? collabTheme.accentSoft : "#fffaf6", color: active ? collabTheme.accent : collabTheme.muted, fontWeight: 700, cursor: "pointer" }}>
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === "Semaine" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard>
            <SectionTitle
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>◂</button>
                  <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>▸</button>
                </div>
              }
            >
              Semaine du {weekdays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {weekDays.map((day) => {
                const iso = formatIsoDate(day);
                const entry = weekRows.find((row) => getEntryDate(row) === iso);
                const tone = entry ? getShiftTone(entry, profile) : collabTheme.line;
                return (
                  <div key={iso} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 16, background: "#fffaf6" }}>
                    <div style={{ fontSize: 11, color: collabTheme.muted }}>{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{day.getDate()}</div>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: entry ? tone : "transparent", margin: "8px auto 0" }} />
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard>
            <SectionTitle>Résumé</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{summary.workedDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Jours travaillés</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{summary.restDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Repos</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{summary.leaveDays}</div><div style={{ fontSize: 12, color: collabTheme.muted }}>Congé</div></div>
            </div>
          </SectionCard>
          <SectionCard>
            <SectionTitle>Shifts de la semaine</SectionTitle>
            <div style={{ display: "grid", gap: 10 }}>
              {weekRows.length ? weekRows.map((entry, index) => {
                const tone = getShiftTone(entry, profile);
                return (
                  <div key={index} style={{ borderRadius: 18, padding: "12px 14px", background: "#fffaf6", borderLeft: `4px solid ${tone}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{new Date(`${getEntryDate(entry)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>{getShiftDisplayText(entry, profile)}</div>
                  </div>
                );
              }) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucun planning sur cette semaine.</div>}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "Mois" ? (
        <SectionCard>
          <SectionTitle
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>◂</button>
                <button type="button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>▸</button>
              </div>
            }
          >
            {monthCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {monthDays.map((day) => {
              const iso = formatIsoDate(day);
              const entry = monthRowsByDate.get(iso);
              const tone = entry ? getShiftTone(entry, profile) : "transparent";
              return (
                <div key={iso} style={{ minHeight: 66, padding: "8px 6px", borderRadius: 16, background: "#fffaf6", border: `1px solid ${collabTheme.line}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{day.getDate()}</div>
                  <div style={{ height: 8, borderRadius: 999, background: tone, marginTop: 10 }} />
                  <div style={{ marginTop: 8, fontSize: 11, color: collabTheme.muted }}>{entry ? getShiftBadgeLabel(entry, profile) : ""}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: collabTheme.muted }}>Rouge = matin · Ambre = après-midi · Gris = journée · Vert = congé · Beige = repos</div>
        </SectionCard>
      ) : null}

      {activeTab === "Équipe" ? (
        <SectionCard>
          <SectionTitle
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>◂</button>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>▸</button>
              </div>
            }
          >
            Équipe
          </SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px repeat(5, 1fr)", gap: 8, minWidth: 520 }}>
              <div style={{ fontSize: 12, color: collabTheme.muted }}>Collaborateur</div>
              {weekdays.map((day) => <div key={day.toISOString()} style={{ fontSize: 12, color: collabTheme.muted, textAlign: "center" }}>{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>)}
              {teamNames.map((person) => {
                const isMe = person.name === profile.employees?.name;
                return (
                  <>
                    <div key={`${person.name}-label`} style={{ padding: "10px 8px", borderRadius: 14, background: isMe ? collabTheme.accentSoft : "#fffaf6", color: isMe ? collabTheme.accent : collabTheme.text, fontWeight: 700 }}>{person.name}</div>
                    {weekdays.map((day) => {
                      const iso = formatIsoDate(day);
                      const row = person.entries.get(iso) as CollabPlanningEntry | undefined;
                      return (
                        <div key={`${person.name}-${iso}`} style={{ minHeight: 44, borderRadius: 14, background: "#fffaf6", display: "grid", placeItems: "center", color: row ? getShiftTone(row) : collabTheme.muted, fontWeight: 700 }}>
                          {row ? getShiftBadgeLabel(row) : "—"}
                        </div>
                      );
                    })}
                  </>
                );
              })}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <CollabBottomNav />
    </CollabPage>
  );
}


