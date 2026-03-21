"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import { infoAnnouncements, infoCategories, type InfoCategoryId, type InfoItem } from "@/lib/infos-data";

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const theme = moduleThemes.infos;
  const activeCategory = infoCategories.find((category) => category.id === activeCategoryId) ?? infoCategories[0];

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
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="infos"
        title="Informations equipe"
        description="Base documentaire operationnelle pour procedures, securite, RH et outils. Pensee pour retrouver vite l'information utile pendant la journee."
      />

      <KPIRow>
        <KPI moduleKey="infos" value={infoCategories.length} label="Categories" />
        <KPI
          moduleKey="infos"
          value={infoCategories.reduce((sum, category) => sum + category.items.length, 0)}
          label="Documents"
        />
        <KPI moduleKey="infos" value={infoAnnouncements.length} label="Annonces" />
      </KPIRow>

      <Card>
        <Kicker moduleKey="infos" label="Recherche" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Acces rapide document</h2>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex: ouverture, HACCP, commandes..."
          style={{
            marginTop: "10px",
            minHeight: "36px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #dbe3eb",
            padding: "0 12px",
            fontSize: "12px",
          }}
        />
      </Card>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "0.9fr 1.3fr 0.8fr" }}>
        <Card>
          <Kicker moduleKey="infos" label="Categories" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Navigation docs</h2>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {infoCategories.map((category) => {
              const active = category.id === activeCategory.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  style={{
                    textAlign: "left",
                    borderRadius: "10px",
                    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                    background: active ? theme.light : "#fff",
                    padding: "8px 10px",
                  }}
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setSelectedTitle(null);
                  }}
                >
                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{category.label}</strong>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{category.items.length} docs</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="infos" label={activeCategory.label} />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Documents disponibles</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
            <div style={{ display: "grid", gap: "8px" }}>
              {filteredItems.map((item) => {
                const active = selectedItem?.title === item.title;
                return (
                  <button
                    key={item.title}
                    type="button"
                    style={{
                      textAlign: "left",
                      borderRadius: "10px",
                      border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                      background: active ? theme.light : "#fff",
                      padding: "8px 10px",
                    }}
                    onClick={() => setSelectedTitle(item.title)}
                  >
                    <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{item.title}</strong>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{item.description}</span>
                  </button>
                );
              })}
              {filteredItems.length === 0 ? <p style={{ fontSize: "12px", color: "#64748b" }}>Aucun document sur cette recherche.</p> : null}
            </div>

            <div style={{ border: "1px solid #dbe3eb", borderRadius: "12px", padding: "10px", background: "#fff" }}>
              {selectedItem ? (
                <>
                  <Kicker moduleKey="infos" label="Lecture" />
                  <h3 style={{ marginTop: "6px", fontSize: "16px", color: "#0f172a" }}>{selectedItem.title}</h3>
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>{selectedItem.description}</p>
                  <div
                    style={{
                      marginTop: "10px",
                      borderRadius: "10px",
                      border: `1px dashed ${theme.medium}`,
                      background: theme.light,
                      color: theme.color,
                      fontSize: "12px",
                      padding: "10px",
                    }}
                  >
                    Contenu detaille a brancher (PDF / procedure / lien interne).
                  </div>
                </>
              ) : (
                <p style={{ fontSize: "12px", color: "#64748b" }}>Aucun document selectionne.</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="infos" label="Annonces" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Fil manager</h2>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {infoAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  borderRadius: "10px",
                  border: `1px solid ${announcement.important ? "#fecaca" : "#dbe3eb"}`,
                  background: announcement.important ? "#fff1f2" : "#fff",
                  padding: "8px 10px",
                }}
              >
                <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{announcement.title}</strong>
                <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{announcement.date}</span>
                <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>{announcement.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
