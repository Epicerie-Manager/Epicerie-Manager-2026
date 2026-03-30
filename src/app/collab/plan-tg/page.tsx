"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabCardStyle, collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import { loadTgDefaultAssignments, loadTgRayons, loadTgWeekPlans, syncTgFromSupabase } from "@/lib/tg-store";
import type { TgDefaultAssignment, TgRayon, TgWeekPlanRow } from "@/lib/tg-data";

type PlanView = "mine" | "all";

type CollabTgRow = {
  rayon: string;
  family: string;
  order: number;
  responsable: string;
  tgResponsible: string;
  tgProduct: string;
  tgQuantity: string;
  tgMechanic: string;
  gbProduct: string;
};

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getCurrentIsoWeek(date = new Date()) {
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

function getWeekDateRangeLabel(date = new Date()) {
  const current = new Date(date);
  const day = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - day);
  const start = new Date(current);
  const end = new Date(current);
  end.setDate(start.getDate() + 6);
  const week = getCurrentIsoWeek(start);
  const startLabel = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Sem. ${week} · du ${startLabel} au ${endLabel}`;
}

function getCurrentWeekRows(plans: TgWeekPlanRow[]) {
  const currentWeek = String(getCurrentIsoWeek()).padStart(2, "0");
  const matches = plans.filter((row) => String(row.weekId ?? "").startsWith(`${currentWeek} `));
  if (matches.length) return matches;
  return plans.filter((row) => String(row.weekId ?? "").startsWith(`${currentWeek}`));
}

function buildRows(plans: TgWeekPlanRow[], rayons: TgRayon[], assignments: TgDefaultAssignment[]) {
  const rayonMap = new Map(
    rayons.map((rayon, index) => [
      rayon.rayon,
      {
        family: rayon.family,
        order: Number(rayon.order ?? index + 1),
      },
    ]),
  );
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.rayon, assignment.employee]));

  return getCurrentWeekRows(plans)
    .map((row) => {
      const rayonMeta = rayonMap.get(row.rayon);
      return {
        rayon: row.rayon,
        family: rayonMeta?.family ?? row.family ?? "Sale",
        order: rayonMeta?.order ?? 999,
        responsable: assignmentMap.get(row.rayon) ?? row.defaultResponsible ?? row.tgResponsible ?? "",
        tgResponsible: row.tgResponsible ?? "",
        tgProduct: row.tgProduct ?? "",
        tgQuantity: row.tgQuantity ?? "",
        tgMechanic: row.tgMechanic ?? "",
        gbProduct: row.gbProduct ?? "",
      } as CollabTgRow;
    })
    .sort((a, b) => a.order - b.order || a.rayon.localeCompare(b.rayon, "fr"));
}

function TgLine({
  label,
  value,
  tone,
}: {
  label: "TG" | "GB";
  value: string;
  tone: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, alignItems: "start" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 20,
          borderRadius: 999,
          background: `${tone}14`,
          color: tone,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <div style={{ fontSize: 13, lineHeight: 1.45, color: value ? collabTheme.text : collabTheme.muted }}>
        {value || "Aucun contenu prévu"}
      </div>
    </div>
  );
}

function TgCard({ row, highlight }: { row: CollabTgRow; highlight: boolean }) {
  const familyTone = row.family === "Sucre" ? collabTheme.gold : collabTheme.green;
  const tgDetails = [row.tgProduct, row.tgQuantity, row.tgMechanic].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        ...collabCardStyle({
          padding: "14px 14px 12px",
          boxShadow: "none",
          borderColor: highlight ? `${collabTheme.accent}55` : collabTheme.line,
          background: highlight ? "#fff6f6" : "#fffdfb",
        }),
      }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ ...collabSerifTitleStyle({ fontSize: 21 }) }}>{row.rayon}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>
            Resp. base : <strong style={{ color: collabTheme.text }}>{row.responsable || "Non attribué"}</strong>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "end" }}>
          <span
            style={{
              borderRadius: 999,
              padding: "5px 9px",
              background: `${familyTone}14`,
              color: familyTone,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {row.family}
          </span>
          {highlight ? (
            <span
              style={{
                borderRadius: 999,
                padding: "5px 9px",
                background: collabTheme.accent,
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Affecté
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <TgLine label="TG" value={tgDetails} tone={collabTheme.accent} />
        <TgLine label="GB" value={row.gbProduct} tone={collabTheme.blue} />
      </div>
    </div>
  );
}

export default function CollabPlanTgPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [activeView, setActiveView] = useState<PlanView>("mine");
  const [rows, setRows] = useState<CollabTgRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const nextProfile = await getCollabProfile();
      if (!nextProfile || nextProfile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (cancelled) return;
      setProfile(nextProfile);

      await syncTgFromSupabase();
      if (cancelled) return;

      const nextRows = buildRows(loadTgWeekPlans(), loadTgRayons(), loadTgDefaultAssignments());
      setRows(nextRows);
    };

    void load().catch(() => router.replace("/collab/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const collabName = normalizeName(profile?.employees?.name);
  const myRows = useMemo(
    () =>
      rows.filter((row) =>
        [row.responsable, row.tgResponsible].some((value) => normalizeName(value) === collabName),
      ),
    [collabName, rows],
  );

  const visibleRows = activeView === "mine" ? myRows : rows;

  if (!profile) return null;

  return (
    <CollabPage>
      <CollabHeader title="Plan TG/GB" subtitle={getWeekDateRangeLabel()} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { id: "mine", label: "Mes rayons" },
          { id: "all", label: "Vue d’ensemble" },
        ].map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id as PlanView)}
              style={{
                minHeight: 40,
                borderRadius: 14,
                border: `1px solid ${active ? collabTheme.accent : collabTheme.line}`,
                background: active ? collabTheme.card : "rgba(255,255,255,0.4)",
                color: active ? collabTheme.accent : collabTheme.muted,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: collabTheme.muted }}>
          {activeView === "mine"
            ? "Retrouvez les rayons qui vous sont affectés cette semaine pour savoir quoi remplir et où intervenir en TG ou en GB."
            : "Vue complète du magasin pour prendre le relais rapidement si un collègue est absent."}
        </div>
      </SectionCard>

      <div style={{ display: "grid", gap: 12 }}>
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <TgCard
              key={`${row.rayon}-${row.family}`}
              row={row}
              highlight={[row.responsable, row.tgResponsible].some((value) => normalizeName(value) === collabName)}
            />
          ))
        ) : (
          <SectionCard>
            <div style={{ ...collabSerifTitleStyle({ fontSize: 22 }) }}>
              {activeView === "mine" ? "Aucun rayon affecté" : "Aucun plan en cours"}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: collabTheme.muted }}>
              {activeView === "mine"
                ? "Aucun rayon n’est encore rattaché à votre profil pour la semaine en cours."
                : "Le plan TG/GB n’est pas encore disponible pour la semaine en cours."}
            </div>
          </SectionCard>
        )}
      </div>

      <CollabBottomNav />
    </CollabPage>
  );
}
