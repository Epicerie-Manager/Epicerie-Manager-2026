"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { moduleThemes } from "@/lib/theme";
import {
  infoAnnouncements as defaultInfoAnnouncements,
  infoCategories as defaultInfoCategories,
  type InfoAnnouncement,
  type InfoAnnouncementAudience,
  type InfoAnnouncementPriority,
  type InfoAnnouncementTargeting,
  type InfoCategoryId,
  type InfoItem,
} from "@/lib/infos-data";
import {
  addAnnouncementToSupabase,
  addDocumentToSupabase,
  getInfoAnnouncementAudience,
  getInfosUpdatedEventName,
  getSignedInfosUrl,
  loadInfoAnnouncements,
  loadInfoCategories,
  isInfoAnnouncementActiveNow,
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

function toIsoDateTime(value: string) {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTargetingLabel(announcement: InfoAnnouncement) {
  if (announcement.targeting === "employees") {
    return `${announcement.recipients.length} collaborateur${announcement.recipients.length > 1 ? "s" : ""} ciblé${announcement.recipients.length > 1 ? "s" : ""}`;
  }
  if (announcement.targeting === "rayons") {
    return `${announcement.targetRayons.length} rayon${announcement.targetRayons.length > 1 ? "s" : ""} ciblé${announcement.targetRayons.length > 1 ? "s" : ""}`;
  }
  return "Toute l'équipe";
}

function getAnnouncementWindowLabel(announcement: InfoAnnouncement) {
  const startLabel = formatDateTimeLabel(announcement.publishAt);
  const endLabel = formatDateTimeLabel(announcement.expiresAt);
  if (startLabel && endLabel) return `Diffusion ${startLabel} → ${endLabel}`;
  if (startLabel) return `Diffusion à partir du ${startLabel}`;
  if (endLabel) return `Visible jusqu'au ${endLabel}`;
  return "Diffusion immédiate";
}

function SignedDocumentAttachment({ item }: { item: InfoItem }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fallbackUrl = item.attachment?.filePath ? null : (item.attachment?.dataUrl || null);

  useEffect(() => {
    let cancelled = false;

    const filePath = item.attachment?.filePath ?? "";
    if (!filePath) return () => { cancelled = true; };

    void getSignedInfosUrl(filePath, 7200).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item.attachment) return null;
  const resolvedUrl = signedUrl ?? fallbackUrl;
  if (!resolvedUrl) {
    return <span style={{ color: "#94a3b8", fontSize: "12px" }}>Chargement du document...</span>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noreferrer"
        download={item.attachment.name}
        style={{ color: moduleThemes.infos.color, fontWeight: 700, fontSize: "12px", textDecoration: "none" }}
      >
        Ouvrir / telecharger
      </a>
      {item.attachment.mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt={item.title}
          style={{ marginTop: "4px", width: "100%", borderRadius: "8px", border: "1px solid #dbe3eb" }}
        />
      ) : null}
    </div>
  );
}

export default function InfosPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<InfoCategoryId>("proc");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(defaultInfoCategories);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>(defaultInfoAnnouncements);
  const [audience, setAudience] = useState<InfoAnnouncementAudience>({ employees: [], dashboardUsers: [], rayons: [] });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState("");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<InfoAnnouncementPriority>("normal");
  const [announcementTargeting, setAnnouncementTargeting] = useState<InfoAnnouncementTargeting>("all");
  const [announcementPublishAt, setAnnouncementPublishAt] = useState("");
  const [announcementExpireAt, setAnnouncementExpireAt] = useState("");
  const [announcementEmployeeIds, setAnnouncementEmployeeIds] = useState<string[]>([]);
  const [announcementRayons, setAnnouncementRayons] = useState<string[]>([]);
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [expandedAnnouncementRecipientsId, setExpandedAnnouncementRecipientsId] = useState<string | null>(null);

  const theme = moduleThemes.infos;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  useEffect(() => {
    const refresh = () => {
      setCategories(loadInfoCategories());
      setAnnouncements(loadInfoAnnouncements());
    };

    const refreshAudience = async () => {
      try {
        const nextAudience = await getInfoAnnouncementAudience();
        setAudience(nextAudience);
      } catch {
        setAudience({ employees: [], dashboardUsers: [], rayons: [] });
      }
    };

    refresh();
    void syncInfosFromSupabase().then((synced) => {
      if (synced) refresh();
    });
    void refreshAudience();
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

  useEffect(() => {
    if (!announcements.length) {
      setExpandedAnnouncementId(null);
      setExpandedAnnouncementRecipientsId(null);
      return;
    }
    setExpandedAnnouncementId((current) =>
      current && announcements.some((announcement) => announcement.id === current)
        ? current
        : announcements[0]?.id ?? null,
    );
    setExpandedAnnouncementRecipientsId((current) =>
      current && announcements.some((announcement) => announcement.id === current) ? current : null,
    );
  }, [announcements]);

  const allDocumentCount = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );

  const categoriesWithDocsCount = useMemo(
    () => categories.filter((category) => category.items.length > 0).length,
    [categories],
  );

  const selectedEmployeesPreview = useMemo(
    () => audience.employees.filter((employee) => announcementEmployeeIds.includes(employee.id)),
    [announcementEmployeeIds, audience.employees],
  );

  const selectedRayonEmployeesPreview = useMemo(
    () =>
      audience.employees.filter((employee) =>
        employee.tgRayons.some((rayon) => announcementRayons.includes(rayon)),
      ),
    [announcementRayons, audience.employees],
  );

  function toggleEmployeeSelection(employeeId: string) {
    setAnnouncementEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function toggleRayonSelection(rayon: string) {
    setAnnouncementRayons((current) =>
      current.includes(rayon)
        ? current.filter((entry) => entry !== rayon)
        : [...current, rayon],
    );
  }

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
    if (announcementTargeting === "employees" && announcementEmployeeIds.length === 0) {
      setAnnouncementError("Sélectionnez au moins un collaborateur ciblé.");
      return;
    }
    if (announcementTargeting === "rayons" && announcementRayons.length === 0) {
      setAnnouncementError("Sélectionnez au moins un rayon ciblé.");
      return;
    }

    const publishAt = toIsoDateTime(announcementPublishAt);
    const expiresAt = toIsoDateTime(announcementExpireAt);
    if (publishAt && expiresAt && new Date(expiresAt).getTime() <= new Date(publishAt).getTime()) {
      setAnnouncementError("La fin de diffusion doit être après le début.");
      return;
    }

    setAnnouncementBusy(true);
    try {
      await addAnnouncementToSupabase({
        title,
        content,
        priority: announcementPriority,
        publishAt,
        expiresAt,
        targeting: announcementTargeting,
        targetEmployeeIds: announcementEmployeeIds,
        targetRayons: announcementRayons,
        confirmationRequired: false,
      });
      setAnnouncements(loadInfoAnnouncements());
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementPriority("normal");
      setAnnouncementTargeting("all");
      setAnnouncementPublishAt("");
      setAnnouncementExpireAt("");
      setAnnouncementEmployeeIds([]);
      setAnnouncementRayons([]);
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

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)", gridColumn: "1 / -1" }}>
          <Kicker moduleKey="infos" label="Documents" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Documents & catégories</h2>
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
            Une seule zone de travail pour choisir la catégorie, ajouter une section et consulter son contenu.
          </p>

          <div style={{ position: "relative", marginTop: "12px" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une section, un document ou un mot-clé..."
              style={{
                minHeight: "40px",
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #dbe3eb",
                padding: "0 12px 0 34px",
                fontSize: "12px",
                background: "#f8fafc",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: "12px", marginTop: "12px" }}>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ border: "1px solid #e8ecf1", borderRadius: "12px", background: "#fbfcfe", padding: "10px" }}>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>Catégories</strong>
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
                          padding: "9px 10px",
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
              </div>

              <div style={{ border: "1px solid #f0e2bd", background: "linear-gradient(135deg,#fff9ec,#fffef8)", borderRadius: "12px", padding: "10px" }}>
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
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.95fr) minmax(300px, 1.05fr)", gap: "10px" }}>
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
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          {item.attachment ? `${item.attachment.name} (${formatBytes(item.attachment.size)})` : "Sans fichier"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    </div>
                  );
                })}
                {filteredItems.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
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
                        <SignedDocumentAttachment item={selectedItem} />
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
          </div>
        </Card>

        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)", gridColumn: "1 / -1", order: -1 }}>
          <Kicker moduleKey="infos" label="Annonces" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Fil d&apos;informations</h2>

          <div style={{ marginTop: "10px", border: "1px solid #dbe3eb", borderRadius: "12px", padding: "10px", display: "grid", gap: "8px" }}>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>Publication simple</strong>
            <div
              style={{
                borderRadius: "10px",
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1e40af",
                fontSize: "12px",
                lineHeight: 1.5,
                padding: "10px 12px",
              }}
            >
              Cette zone sert à publier ou consulter des annonces dans le fil d&apos;infos. Les messages automatiques à l&apos;ouverture ne sont plus utilisés.
            </div>
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
            <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Ciblage</span>
                <select
                  value={announcementTargeting}
                  onChange={(event) => setAnnouncementTargeting(event.target.value as InfoAnnouncementTargeting)}
                  style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 8px", fontSize: "12px", color: "#0f172a" }}
                >
                  <option value="all">Tous les collaborateurs</option>
                  <option value="employees">Collaborateurs ciblés</option>
                  <option value="rayons">Rayons ciblés</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Diffusion à partir de</span>
                <input
                  type="datetime-local"
                  value={announcementPublishAt}
                  onChange={(event) => setAnnouncementPublishAt(event.target.value)}
                  style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px", color: "#0f172a" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Expire le</span>
                <input
                  type="datetime-local"
                  value={announcementExpireAt}
                  onChange={(event) => setAnnouncementExpireAt(event.target.value)}
                  style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px", color: "#0f172a" }}
                />
              </label>
            </div>
            {announcementTargeting === "employees" ? (
              <div style={{ border: "1px solid #dbe3eb", borderRadius: "10px", padding: "10px", background: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Destinataires ciblés
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {audience.employees.map((employee) => {
                    const active = announcementEmployeeIds.includes(employee.id);
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => toggleEmployeeSelection(employee.id)}
                        style={{
                          minHeight: "30px",
                          borderRadius: "999px",
                          border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                          background: active ? theme.light : "#fff",
                          color: active ? theme.color : "#334155",
                          padding: "0 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {employee.name}
                      </button>
                    );
                  })}
                </div>
                {selectedEmployeesPreview.length ? (
                  <div style={{ marginTop: 8, fontSize: "11px", color: "#64748b" }}>
                    Sélection : {selectedEmployeesPreview.slice(0, 4).map((employee) => employee.name).join(", ")}
                    {selectedEmployeesPreview.length > 4 ? ` +${selectedEmployeesPreview.length - 4}` : ""}
                  </div>
                ) : null}
              </div>
            ) : null}
            {announcementTargeting === "rayons" ? (
              <div style={{ border: "1px solid #dbe3eb", borderRadius: "10px", padding: "10px", background: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Rayons ciblés
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {audience.rayons.map((rayon) => {
                    const active = announcementRayons.includes(rayon);
                    return (
                      <button
                        key={rayon}
                        type="button"
                        onClick={() => toggleRayonSelection(rayon)}
                        style={{
                          minHeight: "30px",
                          borderRadius: "999px",
                          border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                          background: active ? theme.light : "#fff",
                          color: active ? theme.color : "#334155",
                          padding: "0 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {rayon}
                      </button>
                    );
                  })}
                </div>
                {selectedRayonEmployeesPreview.length ? (
                  <div style={{ marginTop: 8, fontSize: "11px", color: "#64748b" }}>
                    Exemple destinataires: {selectedRayonEmployeesPreview.slice(0, 3).map((employee) => employee.name).join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}
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
              const seenCount = announcement.recipients.filter((recipient) => recipient.seenAt).length;
              const confirmedCount = announcement.recipients.filter((recipient) => recipient.confirmedAt).length;
              const expanded = expandedAnnouncementId === announcement.id;
              const recipientsExpanded = expandedAnnouncementRecipientsId === announcement.id;
              const activeNow = isInfoAnnouncementActiveNow(announcement);
              return (
                <div
                  key={announcement.id}
                  style={{
                    borderRadius: "12px",
                    border: `1px solid ${meta.border}`,
                    borderLeft: `3px solid ${meta.text}`,
                    background: expanded ? meta.bg : "#fff",
                    padding: expanded ? "10px 12px" : "8px 11px",
                    boxShadow: announcement.priority === "urgent" ? "0 1px 2px rgba(0,0,0,0.03), 0 8px 18px rgba(159,18,57,0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {announcement.priority !== "normal" ? <AlertIcon color={meta.text} /> : null}
                        <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>{announcement.title}</strong>
                      </span>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{announcement.date}</span>
                    </div>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: activeNow ? "#166534" : "#64748b", padding: "2px 6px", borderRadius: 6, background: "#fff" }}>
                        {activeNow ? "En ligne" : "Planifiée / terminée"}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: meta.text, padding: "2px 6px", borderRadius: 6, background: "#fff" }}>{meta.label}</span>
                    </span>
                  </div>
                  {expanded ? (
                    <div style={{ marginTop: 10, borderTop: "1px solid rgba(148,163,184,0.25)", paddingTop: 10, display: "grid", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.55 }}>
                        {announcement.content}
                      </p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", padding: "2px 6px", borderRadius: 6, background: "#fff" }}>
                          {getTargetingLabel(announcement)}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", padding: "2px 6px", borderRadius: 6, background: "#fff" }}>
                          {getAnnouncementWindowLabel(announcement)}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", padding: "2px 6px", borderRadius: 6, background: "#fff" }}>
                          {seenCount}/{announcement.recipients.length} vus
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: announcement.confirmationRequired ? "#0f172a" : "#64748b", padding: "2px 6px", borderRadius: 6, background: "#fff" }}>
                          {announcement.confirmationRequired
                            ? `${confirmedCount}/${announcement.recipients.length} ouverts`
                            : "Ouverture libre"}
                        </span>
                      </div>
                      {announcement.targetRayons.length ? (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Rayons : {announcement.targetRayons.join(", ")}
                        </div>
                      ) : null}
                      {recipientsExpanded ? (
                        <div style={{ display: "grid", gap: 6, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                          {announcement.recipients.length ? (
                            announcement.recipients.map((recipient) => (
                              <div
                                key={recipient.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr auto auto",
                                  gap: 8,
                                  alignItems: "center",
                                  borderRadius: 8,
                                  background: "#fff",
                                  border: "1px solid rgba(226,232,240,0.9)",
                                  padding: "6px 8px",
                                }}
                              >
                                <strong style={{ fontSize: "11px", color: "#0f172a" }}>{recipient.employeeName}</strong>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: recipient.seenAt ? "#166534" : "#92400e" }}>
                                  {recipient.seenAt ? "Vu" : "Non lu"}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: recipient.confirmedAt ? "#1d4ed8" : "#64748b" }}>
                                  {recipient.confirmedAt ? "Ouvert" : announcement.confirmationRequired ? "À ouvrir" : "—"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              Aucun destinataire figé pour cette annonce.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedAnnouncementId((current) => (current === announcement.id ? null : announcement.id));
                          if (expanded) {
                            setExpandedAnnouncementRecipientsId((current) => (current === announcement.id ? null : current));
                          }
                        }}
                        style={{ border: "none", background: "transparent", fontSize: "11px", color: theme.color, cursor: "pointer", padding: 0, fontWeight: 700 }}
                      >
                        {expanded ? "Réduire" : "Voir plus"}
                      </button>
                      {expanded ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAnnouncementRecipientsId((current) =>
                              current === announcement.id ? null : announcement.id,
                            )
                          }
                          style={{ border: "none", background: "transparent", fontSize: "11px", color: "#475569", cursor: "pointer", padding: 0, fontWeight: 700 }}
                        >
                          {recipientsExpanded ? "Masquer le suivi" : "Voir le suivi"}
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAnnouncement(announcement.id)}
                      disabled={announcementBusy}
                      style={{ border: "none", background: "transparent", fontSize: "11px", color: "#b91c1c", cursor: announcementBusy ? "not-allowed" : "pointer", padding: 0, opacity: announcementBusy ? 0.7 : 1 }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}
