"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import {
  type InfoAnnouncement,
  type InfoAnnouncementPriority,
  type InfoCategoryId,
  type InfoDocumentAttachment,
  type InfoItem,
} from "@/lib/infos-data";
import {
  getInfosUpdatedEventName,
  loadInfoAnnouncements,
  loadInfoCategories,
  saveInfoAnnouncements,
  saveInfoCategories,
} from "@/lib/infos-store";

const FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx";
const PRIORITY_META: Record<InfoAnnouncementPriority, { label: string; border: string; bg: string; text: string }> = {
  urgent: { label: "Urgent", border: "#fecaca", bg: "#fff1f2", text: "#9f1239" },
  important: { label: "Important", border: "#fde68a", bg: "#fffbeb", text: "#92400e" },
  normal: { label: "Info", border: "#dbeafe", bg: "#eff6ff", text: "#1e40af" },
};

function toId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function todayLabel() {
  return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function fileToAttachment(file: File): Promise<InfoDocumentAttachment> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(() => loadInfoCategories());
  const [announcements, setAnnouncements] = useState(() => loadInfoAnnouncements());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState("");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<InfoAnnouncementPriority>("normal");

  const theme = moduleThemes.infos;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  useEffect(() => {
    const refresh = () => {
      setCategories(loadInfoCategories());
      setAnnouncements(loadInfoAnnouncements());
    };

    refresh();
    const eventName = getInfosUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, []);

  const filteredItems = useMemo(() => {
    if (!activeCategory) return [];
    if (!search.trim()) return activeCategory.items;
    const normalized = search.toLowerCase();
    return activeCategory.items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [activeCategory, search]);

  const selectedItem: InfoItem | undefined =
    filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0];

  const allDocumentCount = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );

  const categoriesWithDocsCount = useMemo(
    () => categories.filter((category) => category.items.length > 0).length,
    [categories],
  );

  async function handleAddDocument() {
    const title = docTitle.trim();
    const description = docDescription.trim();
    setDocError("");

    if (!title || !description) {
      setDocError("Le titre et le resume sont obligatoires.");
      return;
    }

    if (!activeCategory) return;

    setDocBusy(true);
    try {
      const attachment = docFile ? await fileToAttachment(docFile) : undefined;
      const nextItem: InfoItem = {
        id: toId("doc"),
        title,
        description,
        attachment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextCategories = categories.map((category) =>
        category.id === activeCategory.id ? { ...category, items: [nextItem, ...category.items] } : category,
      );
      setCategories(nextCategories);
      saveInfoCategories(nextCategories);

      setDocTitle("");
      setDocDescription("");
      setDocFile(null);
      setSelectedItemId(nextItem.id);
    } catch {
      setDocError("Le fichier est trop lourd ou illisible. Essaie un document plus leger.");
    } finally {
      setDocBusy(false);
    }
  }

  function removeDocument(itemId: string) {
    if (!activeCategory) return;
    const nextCategories = categories.map((category) =>
      category.id === activeCategory.id
        ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
        : category,
    );
    setCategories(nextCategories);
    saveInfoCategories(nextCategories);
    if (selectedItemId === itemId) setSelectedItemId(null);
  }

  function addAnnouncement() {
    const title = announcementTitle.trim();
    const content = announcementContent.trim();
    if (!title || !content) return;

    const next: InfoAnnouncement = {
      id: toId("announcement"),
      date: todayLabel(),
      title,
      content,
      priority: announcementPriority,
    };
    const nextAnnouncements = [next, ...announcements];
    setAnnouncements(nextAnnouncements);
    saveInfoAnnouncements(nextAnnouncements);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPriority("normal");
  }

  function removeAnnouncement(id: string) {
    const nextAnnouncements = announcements.filter((announcement) => announcement.id !== id);
    setAnnouncements(nextAnnouncements);
    saveInfoAnnouncements(nextAnnouncements);
  }

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="infos"
        title="Informations equipe"
        description="Centre documentaire reel pour stocker des procedures, pieces jointes et annonces manager."
      />

      <KPIRow>
        <KPI moduleKey="infos" value={categories.length} label="Categories" />
        <KPI moduleKey="infos" value={allDocumentCount} label="Documents" />
        <KPI moduleKey="infos" value={announcements.length} label="Annonces" />
        <KPI moduleKey="infos" value={categoriesWithDocsCount} label="Categories actives" />
      </KPIRow>

      <Card>
        <Kicker moduleKey="infos" label="Recherche" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Acces rapide document</h2>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex: ouverture, HACCP, EPI, commandes..."
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
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
            Menus fixes. Les sections/documents se gerent dans la categorie selectionnee.
          </p>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {categories.map((category) => {
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
                    setSelectedItemId(null);
                  }}
                >
                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{category.label}</strong>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{category.items.length} section(s)</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="infos" label={activeCategory?.label ?? "Categorie"} />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Documents disponibles</h2>

          <div style={{ marginTop: "10px", border: "1px solid #dbe3eb", borderRadius: "12px", padding: "10px" }}>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>Ajouter une section/document</strong>
            <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
              <input
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                placeholder="Titre (ex: Regles port des EPI)"
                style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}
              />
              <textarea
                value={docDescription}
                onChange={(event) => setDocDescription(event.target.value)}
                placeholder="Resume de la section"
                rows={3}
                style={{ borderRadius: "8px", border: "1px solid #dbe3eb", padding: "8px 10px", fontSize: "12px", resize: "vertical" }}
              />
              <input
                type="file"
                accept={FILE_ACCEPT}
                onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
                style={{ fontSize: "12px", color: "#475569" }}
              />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Formats courants: PDF, image, texte, Word, Excel, CSV. Fichier optionnel.
              </span>
              {docError ? <span style={{ fontSize: "11px", color: "#b91c1c" }}>{docError}</span> : null}
              <button
                type="button"
                onClick={handleAddDocument}
                disabled={docBusy}
                style={{
                  minHeight: "34px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.color}`,
                  background: theme.light,
                  color: theme.color,
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {docBusy ? "Ajout..." : "Ajouter la section"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
            <div style={{ display: "grid", gap: "8px" }}>
              {filteredItems.map((item) => {
                const active = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: "10px",
                      border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                      background: active ? theme.light : "#fff",
                      padding: "8px 10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                    >
                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{item.title}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{item.description}</span>
                    </button>
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        {item.attachment ? `${item.attachment.name} (${formatBytes(item.attachment.size)})` : "Sans fichier"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDocument(item.id)}
                        style={{ border: "none", background: "transparent", fontSize: "11px", color: "#b91c1c", cursor: "pointer" }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  Aucune section dans cette categorie pour cette recherche.
                </p>
              ) : null}
            </div>

            <div style={{ border: "1px solid #dbe3eb", borderRadius: "12px", padding: "10px", background: "#fff" }}>
              {selectedItem ? (
                <>
                  <Kicker moduleKey="infos" label="Lecture" />
                  <h3 style={{ marginTop: "6px", fontSize: "16px", color: "#0f172a" }}>{selectedItem.title}</h3>
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>{selectedItem.description}</p>
                  {selectedItem.attachment ? (
                    <div
                      style={{
                        marginTop: "10px",
                        borderRadius: "10px",
                        border: `1px dashed ${theme.medium}`,
                        background: theme.light,
                        color: theme.color,
                        fontSize: "12px",
                        padding: "10px",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <strong>Document joint</strong>
                      <span>{selectedItem.attachment.name}</span>
                      <span style={{ color: "#334155", fontSize: "11px" }}>
                        {selectedItem.attachment.mimeType || "Type inconnu"} - {formatBytes(selectedItem.attachment.size)}
                      </span>
                      <a
                        href={selectedItem.attachment.dataUrl}
                        download={selectedItem.attachment.name}
                        style={{ color: theme.color, fontWeight: 700, fontSize: "12px", textDecoration: "none" }}
                      >
                        Ouvrir / telecharger
                      </a>
                      {selectedItem.attachment.mimeType.startsWith("image/") ? (
                        <img
                          src={selectedItem.attachment.dataUrl}
                          alt={selectedItem.title}
                          style={{ marginTop: "4px", width: "100%", borderRadius: "8px", border: "1px solid #dbe3eb" }}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "10px",
                        borderRadius: "10px",
                        border: "1px dashed #dbe3eb",
                        background: "#f8fafc",
                        color: "#475569",
                        fontSize: "12px",
                        padding: "10px",
                      }}
                    >
                      Pas encore de fichier joint sur cette section.
                    </div>
                  )}
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

          <div style={{ marginTop: "10px", border: "1px solid #dbe3eb", borderRadius: "12px", padding: "10px", display: "grid", gap: "8px" }}>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>Nouvelle annonce</strong>
            <input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              placeholder="Titre annonce"
              style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}
            />
            <textarea
              value={announcementContent}
              onChange={(event) => setAnnouncementContent(event.target.value)}
              placeholder="Contenu"
              rows={3}
              style={{ borderRadius: "8px", border: "1px solid #dbe3eb", padding: "8px 10px", fontSize: "12px", resize: "vertical" }}
            />
            <select
              value={announcementPriority}
              onChange={(event) => setAnnouncementPriority(event.target.value as InfoAnnouncementPriority)}
              style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 8px", fontSize: "12px" }}
            >
              <option value="normal">Info</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="button"
              onClick={addAnnouncement}
              style={{
                minHeight: "34px",
                borderRadius: "8px",
                border: `1px solid ${theme.color}`,
                background: theme.light,
                color: theme.color,
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Publier l'annonce
            </button>
          </div>

          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {announcements.map((announcement) => {
              const meta = PRIORITY_META[announcement.priority];
              return (
              <div
                key={announcement.id}
                style={{
                  borderRadius: "10px",
                  border: `1px solid ${meta.border}`,
                  background: meta.bg,
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{announcement.title}</strong>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: meta.text }}>{meta.label}</span>
                </div>
                <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{announcement.date}</span>
                <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>{announcement.content}</p>
                <button
                  type="button"
                  onClick={() => removeAnnouncement(announcement.id)}
                  style={{ border: "none", background: "transparent", fontSize: "11px", color: "#b91c1c", cursor: "pointer", padding: 0 }}
                >
                  Supprimer
                </button>
              </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}
