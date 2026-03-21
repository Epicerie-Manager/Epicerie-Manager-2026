"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { tgEntries, tgWeeks } from "@/lib/tg-data";

type FamilyFilter = "ALL" | "Sale" | "Sucre";

export default function PlanTgPage() {
  const [activeWeekId, setActiveWeekId] = useState(tgWeeks[0]?.id ?? "");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("ALL");
  const [search, setSearch] = useState("");

  const activeWeek = tgWeeks.find((week) => week.id === activeWeekId) ?? tgWeeks[0];

  const weekEntries = useMemo(() => {
    return tgEntries
      .filter((entry) => entry.weekId === activeWeek.id)
      .filter((entry) => (familyFilter === "ALL" ? true : entry.family === familyFilter))
      .filter((entry) => {
        if (!search.trim()) return true;
        const normalized = search.toLowerCase();
        return (
          entry.rayon.toLowerCase().includes(normalized) ||
          entry.product.toLowerCase().includes(normalized) ||
          entry.manager.toLowerCase().includes(normalized)
        );
      });
  }, [activeWeek.id, familyFilter, search]);

  const groupedRayons = Array.from(new Set(weekEntries.map((entry) => entry.rayon))).map(
    (rayon) => ({
      rayon,
      entries: weekEntries.filter((entry) => entry.rayon === rayon),
    }),
  );

  const tgCount = weekEntries.filter((entry) => entry.type === "TG").length;
  const gbCount = weekEntries.filter((entry) => entry.type === "GB").length;
  const managers = Array.from(new Set(weekEntries.map((entry) => entry.manager)));

  return (
    <section className="module-layout module-theme-tg tg-workbench">
      <ModuleHeader
        moduleKey="plantg"
        title="Plan TG / GB"
        description="Pilotage TG actif par semaine, rayon et responsable. Lecture rapide des mecaniques et priorites terrain."
      />

      <article className="module-card">
        <div className="tg-toolbar">
          <div className="week-chip-row">
            {tgWeeks.map((week) => (
              <button
                key={week.id}
                type="button"
                className={`week-chip${activeWeek.id === week.id ? " week-chip-active" : ""}`}
                onClick={() => setActiveWeekId(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>
          <div className="tg-toolbar-right">
            <div className="week-chip-row">
              {(["ALL", "Sale", "Sucre"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`week-chip${familyFilter === value ? " week-chip-active" : ""}`}
                  onClick={() => setFamilyFilter(value)}
                >
                  {value === "ALL" ? "Tous rayons" : value}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Recherche rayon / produit / responsable..."
              className="infos-search"
            />
          </div>
        </div>
      </article>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Semaine active</p>
          <h2>{activeWeek.label}</h2>
          <p>Navigation manager sur periode courante.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Lignes TG</p>
          <h2>{tgCount}</h2>
          <p>Actions tete de gondole prioritaires.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Lignes GB</p>
          <h2>{gbCount}</h2>
          <p>Complements gondoles basses visibles.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Responsables</p>
          <h2>{managers.length}</h2>
          <p>{managers.join(", ") || "-"}</p>
        </article>
      </div>

      <div className="tg-grid">
        {groupedRayons.map(({ rayon, entries }) => (
          <article key={rayon} className="tg-card">
            <div className="tg-card-head">
              <div>
                <p className="panel-kicker">{entries[0]?.family ?? "Rayon"}</p>
                <h2>{rayon}</h2>
              </div>
              <div className="tg-badges">
                <span className="mini-badge mini-badge-tg">
                  {entries.filter((entry) => entry.type === "TG").length} TG
                </span>
                <span className="mini-badge mini-badge-gb">
                  {entries.filter((entry) => entry.type === "GB").length} GB
                </span>
              </div>
            </div>

            <div className="tg-entry-list">
              {entries.map((entry, index) => (
                <div key={`${entry.product}-${index}`} className="tg-entry-row">
                  <div className="tg-entry-top">
                    <span
                      className={`mini-badge ${
                        entry.type === "TG"
                          ? "mini-badge-tg-solid"
                          : "mini-badge-gb-solid"
                      }`}
                    >
                      {entry.type}
                    </span>
                    <strong>{entry.product}</strong>
                  </div>
                  <div className="tg-entry-meta">
                    <span>Resp. {entry.manager}</span>
                    {entry.quantity ? <span>Qte {entry.quantity}</span> : null}
                    {entry.mechanic ? <span>{entry.mechanic}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {groupedRayons.length === 0 ? (
        <article className="module-card">
          <div className="absences-empty">
            Aucun resultat sur cette combinaison semaine/filtre/recherche.
          </div>
        </article>
      ) : null}
    </section>
  );
}
