"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { moduleThemes } from "@/lib/theme";
import {
  infoAnnouncements as defaultInfoAnnouncements,
  infoCategories as defaultInfoCategories,
  type InfoAnnouncementPriority,
  type InfoCategoryId,
  type InfoItem,
} from "@/lib/infos-data";
import {
  addAnnouncementToSupabase,
  addDocumentToSupabase,
  getInfosUpdatedEventName,
  loadInfoAnnouncements,
  loadInfoCategories,
  removeAnnouncementFromSupabase,
  removeDocumentFromSupabase,
  syncInfosFromSupabase,
} from "@/lib/infos-store";

const FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx";
const PRIORITY_META: Record<InfoAnnouncementPriority, { label: string; border: string; bg: string; text: string }> = {
  urgent: { label: "Urgent", border: "#fecaca", bg: "#fff1f2", text: "#9f1239" },
  important: { label: "Important", border: "#fde68a", bg: "#fffbeb", text: "#92400e" },
  normal: { label: "Info", border: "#dbeafe", bg: "#eff6ff", text: "#1e40af" },
};
const TYPE_STYLE: Record<"pdf" | "doc" | "sheet" | "image" | "file", { label: string; bg: string; color: string }> = {
  pdf: { label: "PDF", bg: "#fef2f2", color: "#dc2626" },
  doc: { label: "DOC", bg: "#eff6ff", color: "#1d5fa0" },
  sheet: { label: "XLS", bg: "#ecfdf5", color: "#166534" },
  image: { label: "IMG", bg: "#effcfd", color: "#0b7a92" },
  file: { label: "FICHIER", bg: "#f1f5f9", color: "#475569" },
};

function iconStyle(color: string): React.CSSProperties {
  return { width: 13, height: 13, color, flexShrink: 0 };
}

function CategoryIcon({ id, color }: { id: InfoCategoryId; color: string }) {
  if (id === "proc") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={iconStyle(color)}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }
  if (id === "secu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={iconStyle(color)}>
        <path d="M12 2 4 5v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V5l-8-3z" />
      </svg>
    );
  }
  if (id === "rh") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={iconStyle(color)}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.8" />
      </svg>
    );
  }
  if (id === "outils") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={iconStyle(color)}>
        <path d="m14.7 6.3 3 3L8 19l-4 1 1-4 9.7-9.7z" />
        <path d="m15 6 3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={iconStyle(color)}>
      <path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3 4.18 2 2 0 0 1 5 2h2.09a2 2 0 0 1 2 1.7l.32 2.24a2 2 0 0 1-.58 1.75L7.6 8.9a16 16 0 0 0 7.5 7.5l1.21-1.23a2 2 0 0 1 1.75-.58l2.24.32a2 2 0 0 1 1.7 2.01z" />
    </svg>
  );
}

function FileTypeIcon({ type }: { type: keyof typeof TYPE_STYLE }) {
  const style = TYPE_STYLE[type];
  if (type === "pdf") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="1.9" style={{ width: 12, height: 12 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  }
  if (type === "image") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="1.9" style={{ width: 12, height: 12 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  if (type === "sheet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="1.9" style={{ width: 12, height: 12 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    );
  }
  if (type === "doc") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="1.9" style={{ width: 12, height: 12 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="1.9" style={{ width: 12, height: 12 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ width: 12, height: 12, flexShrink: 0 }}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function SearchIcon({ color = "#94a3b8" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ width: 14, height: 14 }}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function getAttachmentType(item: InfoItem): keyof typeof TYPE_STYLE {
  const name = item.attachment?.name?.toLowerCase() ?? "";
  const mime = item.attachment?.mimeType?.toLowerCase() ?? "";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.includes("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => name.endsWith(ext))) return "image";
  if (mime.includes("sheet") || [".xls", ".xlsx", ".csv"].some((ext) => name.endsWith(ext))) return "sheet";
  if (mime.includes("word") || mime.includes("text/") || [".doc", ".docx", ".txt"].some((ext) => name.endsWith(ext))) return "doc";
  return "file";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(defaultInfoCategories);
  const [announcements, setAnnouncements] = useState(defaultInfoAnnouncements);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState("");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<InfoAnnouncementPriority>("normal");
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");

  const theme = moduleThemes.infos;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  useEffect(() => {
    const refresh = () => {
      setCategories(loadInfoCategories());
      setAnnouncements(loadInfoAnnouncements());
    };

    refresh();
    void syncInfosFromSupabase().then((synced) => {
      if (synced) refresh();
    });
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
      const nextItem = await addDocumentToSupabase(activeCategory.id, title, description, docFile ?? undefined);
      setCategories(loadInfoCategories());

      setDocTitle("");
      setDocDescription("");
      setDocFile(null);
      setSelectedItemId(nextItem.id);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "Impossible d'ajouter le document.");
    } finally {
      setDocBusy(false);
    }
  }

  async function removeDocument(itemId: string) {
    if (!activeCategory) return;
    setDocError("");
    setDocBusy(true);
    try {
      await removeDocumentFromSupabase(itemId);
      setCategories(loadInfoCategories());
      if (selectedItemId === itemId) setSelectedItemId(null);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "Impossible de supprimer le document.");
    } finally {
      setDocBusy(false);
    }
  }

  async function addAnnouncement() {
    const title = announcementTitle.trim();
    const content = announcementContent.trim();
    setAnnouncementError("");
    if (!title || !content) {
      setAnnouncementError("Le titre et le contenu sont obligatoires.");
      return;
    }

    setAnnouncementBusy(true);
    try {
      await addAnnouncementToSupabase(title, content, announcementPriority);
      setAnnouncements(loadInfoAnnouncements());
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementPriority("normal");
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : "Impossible de publier l'annonce.");
    } finally {
      setAnnouncementBusy(false);
    }
  }

  async function removeAnnouncement(id: string) {
    setAnnouncementError("");
    setAnnouncementBusy(true);
    try {
      await removeAnnouncementFromSupabase(id);
      setAnnouncements(loadInfoAnnouncements());
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : "Impossible de supprimer l'annonce.");
    } finally {
      setAnnouncementBusy(false);
    }
  }

  return (
    <section style={{
      display: "grid",
      gap: "14px",
      marginTop: "20px",
      padding: "2px",
      background: "radial-gradient(circle at 5% 0%, rgba(164,114,8,0.10), transparent 28%), radial-gradient(circle at 92% 12%, rgba(11,122,146,0.08), transparent 26%)",
      borderRadius: "16px",
    }}>
      <Card
        style={{
          border: "1px solid #e8ecf1",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 18px rgba(0,0,0,0.05)",
          background: "rgba(255,255,255,0.96)",
          padding: "14px 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              aria-hidden
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                background: moduleThemes.infos.iconGradient,
                border: `1px solid ${theme.medium}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="1.9" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <div>
              <Kicker moduleKey="infos" label="Ressources documentaires" />
              <h1 style={{ margin: "4px 0 0", fontSize: "22px", lineHeight: 1.1, letterSpacing: "-0.03em", color: "#0f172a", fontWeight: 700 }}>
                Informations equipe
              </h1>
            </div>
          </div>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
          Centre documentaire reel pour stocker des procedures, pieces jointes et annonces manager.
        </p>
      </Card>

      <KPIRow>
        <KPI moduleKey="infos" value={categories.length} label="Categories" style={{ background: "linear-gradient(135deg,#fff9ec,#fffef8)", border: "1px solid #f3e4bd" }} valueColor="#8a6208" />
        <KPI moduleKey="infos" value={allDocumentCount} label="Documents" style={{ background: "linear-gradient(135deg,#eff6ff,#fbfdff)", border: "1px solid #dbeafe" }} valueColor="#1d5fa0" />
        <KPI moduleKey="infos" value={announcements.length} label="Annonces" style={{ background: "linear-gradient(135deg,#fff1f2,#fff9fa)", border: "1px solid #fecdd3" }} valueColor="#be123c" />
        <KPI moduleKey="infos" value={categoriesWithDocsCount} label="Categories actives" style={{ background: "linear-gradient(135deg,#ecfdf5,#f7fffb)", border: "1px solid #bbf7d0" }} valueColor="#166534" />
      </KPIRow>

      <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
        <Kicker moduleKey="infos" label="Recherche" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Acces rapide document</h2>
        <div style={{ position: "relative", marginTop: "10px" }}>
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex: ouverture, HACCP, EPI, commandes..."
            style={{
              minHeight: "38px",
              width: "100%",
              borderRadius: "11px",
              border: "1px solid #dbe3eb",
              padding: "0 12px 0 34px",
              fontSize: "12px",
              background: "#f8fafc",
            }}
          />
        </div>
      </Card>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
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
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CategoryIcon id={category.id} color={active ? theme.color : "#64748b"} />
                    <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{category.label}</strong>
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{category.items.length} section(s)</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
          <Kicker moduleKey="infos" label={activeCategory?.label ?? "Categorie"} />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Documents disponibles</h2>

          <div style={{ marginTop: "10px", border: "1px solid #f0e2bd", background: "linear-gradient(135deg,#fff9ec,#fffef8)", borderRadius: "12px", padding: "10px" }}>
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
                  cursor: docBusy ? "not-allowed" : "pointer",
                  opacity: docBusy ? 0.7 : 1,
                }}
              >
                {docBusy ? "Ajout..." : "Ajouter la section"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", marginTop: "10px" }}>
            <div style={{ display: "grid", gap: "8px" }}>
              {filteredItems.map((item) => {
                const active = selectedItem?.id === item.id;
                const attachmentType = getAttachmentType(item);
                const typeStyle = TYPE_STYLE[attachmentType];
                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: "11px",
                      border: `1px solid ${active ? "#f0c979" : "#e2e8f0"}`,
                      background: active ? "linear-gradient(135deg,#fff8e8,#fffef9)" : "#fff",
                      padding: "8px 10px",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.03), 0 8px 18px rgba(164,114,8,0.12)" : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: typeStyle.bg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <FileTypeIcon type={attachmentType} />
                        </span>
                        <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{item.title}</strong>
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{item.description}</span>
                    </button>
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        {item.attachment ? `${item.attachment.name} (${formatBytes(item.attachment.size)})` : "Sans fichier"}
                      </span>
                      {item.attachment ? (
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: typeStyle.bg, color: typeStyle.color }}>
                          {typeStyle.label}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeDocument(item.id)}
                        disabled={docBusy}
                        style={{ border: "none", background: "transparent", fontSize: "11px", color: "#b91c1c", cursor: docBusy ? "not-allowed" : "pointer", fontWeight: 700, opacity: docBusy ? 0.7 : 1 }}
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
                        // eslint-disable-next-line @next/next/no-img-element
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

        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
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
            {announcementError ? <span style={{ fontSize: "11px", color: "#b91c1c" }}>{announcementError}</span> : null}
            <button
              type="button"
              onClick={addAnnouncement}
              disabled={announcementBusy}
              style={{
                minHeight: "34px",
                borderRadius: "8px",
                border: `1px solid ${theme.color}`,
                background: theme.light,
                color: theme.color,
                fontWeight: 700,
                fontSize: "12px",
                cursor: announcementBusy ? "not-allowed" : "pointer",
                opacity: announcementBusy ? 0.7 : 1,
              }}
            >
              {announcementBusy ? "Publication..." : "Publier l'annonce"}
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
                  borderLeft: `3px solid ${meta.text}`,
                  background: meta.bg,
                  padding: "8px 10px",
                  boxShadow: announcement.priority === "urgent" ? "0 1px 2px rgba(0,0,0,0.03), 0 8px 18px rgba(159,18,57,0.15)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {announcement.priority !== "normal" ? <AlertIcon color={meta.text} /> : null}
                    <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{announcement.title}</strong>
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: meta.text, padding: "2px 6px", borderRadius: 6, background: "#fff" }}>{meta.label}</span>
                </div>
                <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{announcement.date}</span>
                <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>{announcement.content}</p>
                <button
                  type="button"
                  onClick={() => removeAnnouncement(announcement.id)}
                  disabled={announcementBusy}
                  style={{ border: "none", background: "transparent", fontSize: "11px", color: "#b91c1c", cursor: announcementBusy ? "not-allowed" : "pointer", padding: 0, opacity: announcementBusy ? 0.7 : 1 }}
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
