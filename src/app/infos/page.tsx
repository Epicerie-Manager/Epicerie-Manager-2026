"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { infoAnnouncements, infoCategories, type InfoCategoryId } from "@/lib/infos-data";

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");

  const activeCategory =
    infoCategories.find((category) => category.id === activeCategoryId) ??
    infoCategories[0];

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return activeCategory.items;
    }

    const normalizedSearch = search.toLowerCase();
    return activeCategory.items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch),
    );
  }, [activeCategory.items, search]);

  return (
    <section className="module-layout module-theme-infos">
      <ModuleHeader
        moduleKey="infos"
        title="Informations equipe"
        description="Base documentaire pour procedures, securite et contacts utiles. Pensee pour retrouver vite l&apos;info pendant le pilotage terrain."
      />

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Categories</p>
          <h2>{infoCategories.length}</h2>
          <p>Procedures, RH, outils et securite au meme endroit.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Documents</p>
          <h2>
            {infoCategories.reduce(
              (sum, category) => sum + category.items.length,
              0,
            )}
          </h2>
          <p>Base initiale issue des maquettes Claude AI.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Annonces</p>
          <h2>{infoAnnouncements.length}</h2>
          <p>Mises a jour manager visibles des l&apos;accueil du module.</p>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Recherche</p>
            <h2>Filtrer les documents</h2>
          </div>
        </div>
        <label className="planning-select-field">
          <span>Mot cle</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex: ouverture, HACCP, commandes..."
            style={{
              minHeight: "48px",
              borderRadius: "16px",
              border: "1px solid #dbe3eb",
              padding: "0 14px",
              background: "#fff",
              color: "#0f172a",
            }}
          />
        </label>
      </article>

      <div className="dashboard-grid dashboard-grid-bottom">
        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Categories</p>
              <h2>Navigation docs</h2>
            </div>
          </div>
          <div className="week-chip-row">
            {infoCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`week-chip${activeCategory.id === category.id ? " week-chip-active" : ""}`}
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Annonces</p>
              <h2>Fil manager</h2>
            </div>
          </div>
          <div className="manager-list">
            {infoAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`manager-item${announcement.important ? " manager-item-red" : ""}`}
              >
                <strong>{announcement.title}</strong>
                <span className="manager-muted">{announcement.date}</span>
                <p className="manager-muted">{announcement.content}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">{activeCategory.label}</p>
            <h2>Documents disponibles</h2>
          </div>
        </div>
        <div className="shortcut-grid">
          {filteredItems.map((item) => (
            <div key={item.title} className="shortcut-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
          {filteredItems.length === 0 ? (
            <div className="shortcut-card">
              <h3>Aucun resultat</h3>
              <p>Aucun document ne correspond a cette recherche.</p>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
