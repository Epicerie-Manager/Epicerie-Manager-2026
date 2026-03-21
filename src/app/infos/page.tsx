"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  infoAnnouncements,
  infoCategories,
  type InfoCategoryId,
  type InfoItem,
} from "@/lib/infos-data";

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const activeCategory =
    infoCategories.find((category) => category.id === activeCategoryId) ??
    infoCategories[0];

  const filteredItems = useMemo(() => {
    if (!search.trim()) return activeCategory.items;
    const normalized = search.toLowerCase();
    return activeCategory.items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [activeCategory.items, search]);

  const selectedItem: InfoItem | undefined =
    filteredItems.find((item) => item.title === selectedTitle) ?? filteredItems[0];

  return (
    <section className="module-layout module-theme-infos infos-workbench">
      <ModuleHeader
        moduleKey="infos"
        title="Informations equipe"
        description="Base documentaire operationnelle pour procedures, securite, RH et outils. Pensee pour retrouver vite l&apos;information utile pendant la journee."
      />

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Categories</p>
          <h2>{infoCategories.length}</h2>
          <p>Organisation claire par domaine manager.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Documents</p>
          <h2>
            {infoCategories.reduce(
              (sum, category) => sum + category.items.length,
              0,
            )}
          </h2>
          <p>Base de reference pour l&apos;equipe.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Annonces</p>
          <h2>{infoAnnouncements.length}</h2>
          <p>Mises a jour manager et points de vigilance.</p>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Recherche</p>
            <h2>Acces rapide document</h2>
          </div>
        </div>
        <label className="planning-select-field">
          <span>Mot cle</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex: ouverture, HACCP, commandes..."
            className="infos-search"
          />
        </label>
      </article>

      <div className="infos-layout">
        <article className="module-card infos-sidebar">
          <p className="panel-kicker">Categories</p>
          <h2>Navigation docs</h2>
          <div className="infos-category-list">
            {infoCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`infos-category-button${category.id === activeCategory.id ? " infos-category-button-active" : ""}`}
                onClick={() => {
                  setActiveCategoryId(category.id);
                  setSelectedTitle(null);
                }}
              >
                <strong>{category.label}</strong>
                <span>{category.items.length} docs</span>
              </button>
            ))}
          </div>
        </article>

        <article className="module-card infos-main">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">{activeCategory.label}</p>
              <h2>Documents disponibles</h2>
            </div>
          </div>
          <div className="infos-content-grid">
            <div className="infos-document-list">
              {filteredItems.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className={`infos-document-button${selectedItem?.title === item.title ? " infos-document-button-active" : ""}`}
                  onClick={() => setSelectedTitle(item.title)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
              {filteredItems.length === 0 ? (
                <div className="absences-empty">Aucun document sur cette recherche.</div>
              ) : null}
            </div>
            <div className="infos-preview-card">
              {selectedItem ? (
                <>
                  <p className="panel-kicker">Lecture</p>
                  <h3>{selectedItem.title}</h3>
                  <p>{selectedItem.description}</p>
                  <div className="infos-preview-placeholder">
                    Contenu detaille a brancher (PDF / procedure / lien interne).
                  </div>
                  <button type="button" className="week-chip week-chip-active">
                    Ouvrir le document
                  </button>
                </>
              ) : (
                <div className="absences-empty">Aucun document selectionne.</div>
              )}
            </div>
          </div>
        </article>

        <article className="module-card infos-announcements">
          <p className="panel-kicker">Annonces</p>
          <h2>Fil manager</h2>
          <div className="infos-announcement-list">
            {infoAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`infos-announcement${announcement.important ? " infos-announcement-important" : ""}`}
              >
                <strong>{announcement.title}</strong>
                <span className="manager-muted">{announcement.date}</span>
                <p className="manager-muted">{announcement.content}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
